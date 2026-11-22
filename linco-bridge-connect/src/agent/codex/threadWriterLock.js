'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

/**
 * Codex 对每个 thread 使用 ~/.codex/thread-writer-locks/<threadId>.lock。
 *
 * 重要：绝不能为了抢某一会话的写锁去杀掉 Codex Desktop 的 app-server。
 * Desktop 是多会话宿主，杀进程会让整个 ChatGPT/Codex 崩溃。
 *
 * 正确策略：
 * 1. 只清理 Linco/CLI 残留的孤儿 app-server（非 Desktop 安装目录）
 * 2. Desktop 仍占着该会话时，返回会话级占用提示，让用户在桌面端离开该会话
 * 3. App 自己持有写锁时，跳过二次 resume，避免自撞
 */

function resolveCodexHome(homeDir = os.homedir()) {
  const fromEnv = String(process.env.CODEX_HOME || '').trim();
  if (fromEnv) return fromEnv;
  return path.join(homeDir, '.codex');
}

function resolveThreadWriterLockPath(threadId, homeDir = os.homedir()) {
  const id = String(threadId || '').trim();
  if (!id) return '';
  return path.join(resolveCodexHome(homeDir), 'thread-writer-locks', `${id}.lock`);
}

function isCodexAppServerCommandLine(commandLine) {
  const text = String(commandLine || '');
  if (!/app-server/i.test(text)) return false;
  return /codex/i.test(text);
}

function isDesktopCodexAppServerCommandLine(commandLine) {
  const text = String(commandLine || '').replace(/\\/g, '/').toLowerCase();
  if (!isCodexAppServerCommandLine(text)) return false;
  return (
    text.includes('/openai/codex/')
    || text.includes('/openai\\codex/'.replace(/\\/g, '/'))
    || text.includes('appdata/local/openai/codex')
    || text.includes('chatgpt')
    || text.includes('codex desktop')
  );
}

function classifyCodexAppServerProcess(row) {
  const commandLine = String(row?.commandLine || '');
  if (!isCodexAppServerCommandLine(commandLine)) return 'other';
  if (isDesktopCodexAppServerCommandLine(commandLine)) return 'desktop';
  return 'orphan';
}

function listCodexAppServerProcesses() {
  if (process.platform === 'win32') {
    return listCodexAppServerProcessesWindows();
  }
  return listCodexAppServerProcessesUnix();
}

function listCodexAppServerProcessesWindows() {
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      'Get-CimInstance Win32_Process | Select-Object ProcessId,Name,CommandLine | ConvertTo-Csv -NoTypeInformation',
    ],
    { encoding: 'utf8', windowsHide: true, timeout: 15000, maxBuffer: 20 * 1024 * 1024 },
  );
  if (result.status !== 0) return [];
  const lines = String(result.stdout || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return [];

  const rows = [];
  for (const line of lines.slice(1)) {
    const parsed = parseCsvLine(line);
    if (parsed.length < 3) continue;
    const pid = Number(parsed[0]);
    const name = String(parsed[1] || '');
    const commandLine = String(parsed[2] || '');
    if (!Number.isInteger(pid) || pid <= 0) continue;
    if (!isCodexAppServerCommandLine(commandLine)) continue;
    rows.push({
      pid,
      name,
      commandLine,
      kind: classifyCodexAppServerProcess({ commandLine }),
    });
  }
  return rows;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const ch = line[index];
    if (ch === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  values.push(current);
  return values;
}

function listCodexAppServerProcessesUnix() {
  const result = spawnSync('ps', ['-Ao', 'pid=,command='], {
    encoding: 'utf8',
    timeout: 5000,
  });
  if (result.status !== 0) return [];
  return String(result.stdout || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const match = /^(\d+)\s+(.*)$/.exec(line);
      if (!match) return null;
      const commandLine = match[2];
      return {
        pid: Number(match[1]),
        name: '',
        commandLine,
        kind: classifyCodexAppServerProcess({ commandLine }),
      };
    })
    .filter(row => row && Number.isInteger(row.pid) && row.pid > 0 && isCodexAppServerCommandLine(row.commandLine));
}

function forceKillPid(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  if (pid === process.pid) return false;
  try {
    if (process.platform === 'win32') {
      const result = spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
        timeout: 5000,
      });
      return result.status === 0;
    }
    process.kill(pid, 'SIGKILL');
    return true;
  } catch {
    return false;
  }
}

function tryRemoveThreadWriterLock(threadId, homeDir = os.homedir()) {
  const lockPath = resolveThreadWriterLockPath(threadId, homeDir);
  if (!lockPath) return false;
  try {
    if (!fs.existsSync(lockPath)) return false;
    fs.unlinkSync(lockPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 探测 thread 写锁是否真被进程持有（Windows）。
 *
 * 背景：锁文件是 0 字节残留标记，Desktop 进程存在 ≠ 该 thread 锁被持有；
 * 旧逻辑「有 Desktop 进程就不敢动锁」导致桌面端空闲时手机端也无法继续会话。
 * Codex(Rust) 在 Windows 用 LockFileEx 对整个锁文件加排他区间锁，
 * 因此用 .NET FileStream 尝试对同一文件加锁即可区分：
 *   - 能加锁  → 无进程持有（stale 残留），可安全删除后接管
 *   - 加锁失败 → 有进程持有（Desktop 正在该会话写入），绝不可动
 *
 * 返回 'absent'（文件不存在）| 'stale'（残留）| 'held'（真占用）| 'unknown'（无法判定）。
 */
function probeThreadWriterLockHeld(threadId, homeDir = os.homedir()) {
  const lockPath = resolveThreadWriterLockPath(threadId, homeDir);
  if (!lockPath) return 'unknown';
  if (process.platform !== 'win32') return 'unknown';
  try {
    if (!fs.existsSync(lockPath)) return 'absent';
  } catch {
    return 'unknown';
  }
  // 单引号包裹路径，内部单引号按 PowerShell 规则成对转义
  const quotedPath = `'${String(lockPath).replace(/'/g, "''")}'`;
  const script = [
    `$p = ${quotedPath}`,
    'try {',
    "  $fs = [System.IO.File]::Open($p, 'Open', 'ReadWrite', 'ReadWrite')",
    '  try {',
    '    $fs.Lock(0, 1)',
    '    $fs.Unlock(0, 1)',
    "    'PROBE_LOCKABLE'",
    '  } finally { $fs.Dispose() }',
    "} catch { 'PROBE_HELD' }",
  ].join('\n');
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { encoding: 'utf8', windowsHide: true, timeout: 10000 },
  );
  const lines = String(result.stdout || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const lastLine = lines.length > 0 ? lines[lines.length - 1] : '';
  if (lastLine === 'PROBE_LOCKABLE') return 'stale';
  if (lastLine === 'PROBE_HELD') return 'held';
  return 'unknown';
}

function isRunningUnderNodeTest() {
  if (typeof process.env.NODE_TEST !== 'undefined') return true;
  return process.execArgv.some(arg => arg === '--test' || arg.startsWith('--test'));
}

function inspectCodexThreadWriterCompetitors({
  keepPids = [],
} = {}) {
  const keep = new Set(
    (Array.isArray(keepPids) ? keepPids : [])
      .map(value => Number(value))
      .filter(pid => Number.isInteger(pid) && pid > 0),
  );
  keep.add(process.pid);

  const processes = listCodexAppServerProcesses().filter(row => !keep.has(row.pid));
  const desktop = processes.filter(row => row.kind === 'desktop');
  const orphans = processes.filter(row => row.kind === 'orphan');
  return { desktop, orphans, processes };
}

/**
 * 仅清理非 Desktop 的孤儿 app-server，绝不杀 Codex Desktop。
 * Desktop 仍占用该会话时，由上层返回会话级占用提示。
 */
function reclaimOrphanCodexWriters({
  threadId,
  keepPids = [],
  homeDir = os.homedir(),
  logger = null,
} = {}) {
  if (isRunningUnderNodeTest()) {
    return {
      killed: [],
      removedLock: false,
      desktopHolders: [],
      skipped: 'node_test',
    };
  }
  if (process.env.LINCO_CODEX_DISABLE_WRITER_TAKEOVER === '1') {
    return {
      killed: [],
      removedLock: false,
      desktopHolders: [],
      skipped: 'disabled',
    };
  }

  const { desktop, orphans } = inspectCodexThreadWriterCompetitors({ keepPids });
  const killed = [];
  for (const row of orphans) {
    const ok = forceKillPid(row.pid);
    if (ok) killed.push(row.pid);
    logger?.warn?.('codex cleared orphan app-server (non-desktop)', {
      threadId,
      pid: row.pid,
      ok,
      commandLine: String(row.commandLine || '').slice(0, 180),
    });
  }

  // 锁清理改用真实探测：Desktop 进程存在 ≠ 该 thread 锁被持有。
  //   stale/absent → 残留锁，可安全删除后由上层重试 resume（桌面端空闲场景即可打通）
  //   held        → Desktop 正在该会话写入，绝不碰锁，由上层返回占用提示
  //   unknown     → 回退旧行为（仅无 Desktop 进程时清理）
  const lockProbe = probeThreadWriterLockHeld(threadId, homeDir);
  let removedLock = false;
  if (lockProbe === 'stale' || (lockProbe === 'unknown' && desktop.length === 0)) {
    removedLock = tryRemoveThreadWriterLock(threadId, homeDir);
    if (removedLock) {
      logger?.info?.('codex removed stale thread lock file', {
        threadId,
        lockProbe,
      });
    }
  } else if (lockProbe === 'held') {
    logger?.info?.('codex thread lock held by live writer; keep lock and return occupancy hint', {
      threadId,
      desktopPids: desktop.map(row => row.pid),
    });
  } else if (desktop.length > 0) {
    logger?.info?.('codex desktop app-server present; skip killing desktop', {
      threadId,
      desktopPids: desktop.map(row => row.pid),
    });
  }

  return {
    killed,
    removedLock,
    lockProbe,
    desktopHolders: desktop.map(row => row.pid),
    skipped: null,
  };
}

// 兼容旧名：禁止再“抢 Desktop”，语义改为只清孤儿。
function reclaimCodexThreadWriter(options) {
  return reclaimOrphanCodexWriters(options);
}

module.exports = {
  classifyCodexAppServerProcess,
  forceKillPid,
  inspectCodexThreadWriterCompetitors,
  isCodexAppServerCommandLine,
  isDesktopCodexAppServerCommandLine,
  listCodexAppServerProcesses,
  probeThreadWriterLockHeld,
  reclaimCodexThreadWriter,
  reclaimOrphanCodexWriters,
  resolveCodexHome,
  resolveThreadWriterLockPath,
  tryRemoveThreadWriterLock,
};
