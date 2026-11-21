const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function pathCandidatesFromEnv() {
  return (process.env.PATH || '')
    .split(path.delimiter)
    .filter(Boolean)
    .flatMap(dir => [
      path.join(dir, 'bash.exe'),
      path.join(dir, '..', 'bin', 'bash.exe'),
      path.join(dir, '..', 'usr', 'bin', 'bash.exe'),
    ]);
}

function pathCandidatesFromWhere(command) {
  try {
    return execFileSync('where.exe', [command], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    })
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function resolveCommand(command) {
  if (!command) return command;
  if (path.isAbsolute(command) && fs.existsSync(command)) return command;
  if (process.platform !== 'win32') return command;

  const ext = path.extname(command);
  // On Windows, prefer executable shim variants first; npm installs
  // produce .cmd files that handle spawning Node CLI packages.
  const names = ext
    ? [command]
    : [`${command}.cmd`, `${command}.exe`, `${command}.bat`, command];
  for (const name of names) {
    for (const candidate of pathCandidatesFromWhere(name)) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return command;
}

function gitBashCandidates() {
  const programFiles = [process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(Boolean);
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [
    ...programFiles.flatMap(dir => [
      path.join(dir, 'Git', 'bin', 'bash.exe'),
      path.join(dir, 'Git', 'usr', 'bin', 'bash.exe'),
    ]),
    localAppData && path.join(localAppData, 'Programs', 'Git', 'bin', 'bash.exe'),
    localAppData && path.join(localAppData, 'Programs', 'Git', 'usr', 'bin', 'bash.exe'),
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
    'D:\\Program Files\\Git\\bin\\bash.exe',
    'D:\\Program Files\\Git\\usr\\bin\\bash.exe',
    ...pathCandidatesFromEnv(),
    ...pathCandidatesFromWhere('bash.exe'),
    ...pathCandidatesFromWhere('git-bash.exe')
      .flatMap(file => [
        path.join(path.dirname(file), '..', 'bin', 'bash.exe'),
        path.join(path.dirname(file), '..', 'usr', 'bin', 'bash.exe'),
      ]),
    ...pathCandidatesFromWhere('git.exe')
      .flatMap(file => [
        path.join(path.dirname(file), 'bash.exe'),
        path.join(path.dirname(file), '..', 'bin', 'bash.exe'),
        path.join(path.dirname(file), '..', 'usr', 'bin', 'bash.exe'),
      ]),
  ];

  return [...new Set(candidates.filter(Boolean).map(candidate => path.normalize(candidate)))];
}

function findGitBash(userConfig = {}) {
  if (process.platform !== 'win32') return null;

  if (process.env.CLAUDE_CODE_GIT_BASH_PATH) {
    return process.env.CLAUDE_CODE_GIT_BASH_PATH;
  }

  if (userConfig.gitBashPath) {
    return userConfig.gitBashPath;
  }

  for (const candidate of gitBashCandidates()) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

// 从 ~/.codex/config.toml 的 notify 数组反推 Codex Desktop（MSIX）包根目录。
// WindowsApps 父目录无法列举（EPERM），但 notify 路径里带有完整包路径可直接反解。
function codexPackageRootFromNotifyConfig() {
  try {
    const configToml = fs.readFileSync(path.join(os.homedir(), '.codex', 'config.toml'), 'utf8');
    const notifyMatch = configToml.match(/notify\s*=\s*\[\s*"([^"]*OpenAI\.Codex_[^"]*)"/i)
      || configToml.match(/notify\s*=\s*\[\s*'([^']*OpenAI\.Codex_[^']*)'/i);
    if (!notifyMatch) return null;
    const notifyPath = notifyMatch[1].replace(/\\+/g, '\\');
    const packageMatch = notifyPath.match(/^(.*?OpenAI\.Codex_[^\\]+)/i);
    return packageMatch ? packageMatch[1] : null;
  } catch {
    return null;
  }
}

// Get-AppxPackage 查询 Codex Desktop 安装目录（需要子进程，较慢，仅作兜底）。
function codexPackageRootFromAppx() {
  if (process.platform !== 'win32') return null;
  try {
    const installLocation = execFileSync('powershell.exe', [
      '-NoProfile', '-Command',
      "(Get-AppxPackage -Name 'OpenAI.Codex*' | Select-Object -First 1).InstallLocation",
    ], {
      timeout: 20000,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    }).trim();
    return installLocation || null;
  } catch {
    return null;
  }
}

// Codex Desktop 自带 codex 二进制的候选路径（按发现成本从低到高排列）。
function codexBundledBinaryCandidates() {
  if (process.platform === 'win32') {
    const candidates = [];
    const localAppData = process.env.LOCALAPPDATA;
    // 1) 独立安装版（非商店版）：%LOCALAPPDATA%\Programs\Codex
    if (localAppData) {
      candidates.push(path.join(localAppData, 'Programs', 'Codex', 'codex.exe'));
    }
    // 2) 商店版（MSIX）：notify 配置反推 + Get-AppxPackage 兜底
    const packageRoots = [
      codexPackageRootFromNotifyConfig(),
      codexPackageRootFromAppx(),
    ].filter(Boolean);
    for (const packageRoot of packageRoots) {
      candidates.push(path.join(packageRoot, 'app', 'resources', 'codex.exe'));
    }
    return candidates;
  }
  if (process.platform === 'darwin') {
    const applications = [
      '/Applications/Codex.app',
      path.join(os.homedir(), 'Applications', 'Codex.app'),
    ];
    return applications.flatMap(appRoot => [
      path.join(appRoot, 'Contents', 'Resources', 'app.asar.unpacked', 'resources', 'codex'),
      path.join(appRoot, 'Contents', 'Resources', 'codex'),
      path.join(appRoot, 'Contents', 'MacOS', 'codex'),
    ]);
  }
  return [];
}

// 发现 Codex Desktop 自带 codex 二进制；用户无需单独安装 codex CLI。找不到返回 null。
function findCodexBundledBinary() {
  for (const candidate of codexBundledBinaryCandidates()) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // 无权限探测的候选直接跳过
    }
  }
  return null;
}

module.exports = {
  findCodexBundledBinary,
  findGitBash,
  resolveCommand,
};
