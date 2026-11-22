const fs = require('fs');
const path = require('path');
const {
  ensureDir,
  findGitBash,
  getChannelPreset,
  loadConfig,
  readUserConfig,
} = require('../config');
const { ensureLocalToken, localUrlWithToken } = require('../local/auth');
const { checkGatewayHealth, resolveHermesGatewayOptions } = require('../gateway/hermesGateway');
const {
  checkGatewayHealth: checkOpenClawGatewayHealth,
  resolveOpenClawGatewayOptions,
} = require('../gateway/openclawGateway');
const { commandExists, safeUrlForDisplay } = require('./utils');

// 回环/私有网段主机名判定（与 BridgeConnectorClient 的 ws:// 放行逻辑保持一致）
function isPrivateNetworkWsUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host === '::1' || host.endsWith('.local')) return true;
    if (host === '127.0.0.1' || host.startsWith('127.')) return true;
    if (host.startsWith('192.168.')) return true;
    if (/^10\./.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}

// 标注 codex 二进制来源：PATH 上的 CLI 或 Codex Desktop 自带（无 CLI 也可用）。
function describeCodexBinSource(bin) {
  const text = String(bin || '');
  if (/WindowsApps[\\/].*OpenAI\.Codex_/i.test(text)) return 'Codex Desktop 自带（商店版）';
  if (/[\\/]Programs[\\/]Codex[\\/]/i.test(text)) return 'Codex Desktop 自带（独立安装版）';
  if (/[\\/]Codex\.app[\\/]/i.test(text)) return 'Codex Desktop 自带（macOS）';
  return 'PATH 上的 codex CLI';
}

async function doctorCommand(context = {}) {
  const rootDir = context.rootDir;
  const checks = [];
  const config = loadConfig(rootDir);
  ensureLocalToken(config);
  const userConfig = readUserConfig(config.configFile);

  checks.push(['Node.js', Number(process.versions.node.split('.')[0]) >= 18, process.version]);
  checks.push(['配置文件', fs.existsSync(config.configFile), config.configFile]);
  checks.push(['IM token', Boolean(config.im.appId && config.im.appSecret), config.im.appId ? `appId=${config.im.appId}` : '未配置']);
  checks.push(['远端 IM 连接', true, config.im.enabled ? '已启用' : '未启用']);
  checks.push(['远端 IM 地址', Boolean(config.im.wsUrl), safeUrlForDisplay(config.im.wsUrl)]);
  checks.push(['IM 账号', true, `${config.im.channel}/${config.im.account}`]);
  checks.push(['IM Agent', true, config.im.agentId]);
  checks.push(['Active channels', config.activeChannels?.length > 0, (config.activeChannels || []).join(', ') || 'none']);
  checks.push(...channelDoctorChecks(config, userConfig));
  checks.push(['本地测试 token', Boolean(config.localWeb?.token), '已生成']);
  for (const [agentType, agent] of Object.entries(config.agents || {})) {
    checks.push([`${agentType} Agent`, true, agent.enabled ? `已启用 ${safeUrlForDisplay(agent.wsUrl)}` : `未启用 ${safeUrlForDisplay(agent.wsUrl)}`]);
    if (agentType === 'hermes') {
      const options = resolveHermesGatewayOptions(agent);
      const health = await checkGatewayHealth(options.gatewayUrl, agent, { timeoutMs: 3000 });
      if (health.ok) {
        checks.push([`${agentType} Gateway`, true, `${options.gatewayUrl}/health`]);
      } else if (agent.autoStartGateway !== false) {
        const hasCli = !agent.enabled || (path.isAbsolute(options.hermesBin) ? fs.existsSync(options.hermesBin) : commandExists(options.hermesBin));
        checks.push([`${agentType} Gateway`, true, `未运行，发送 Hermes 消息时将自动启动 ${options.gatewayUrl}`]);
        checks.push([`${agentType} CLI`, hasCli, options.hermesBin]);
        checks.push([`${agentType} Profile`, true, options.profileDir]);
      } else {
        checks.push([`${agentType} Gateway`, false, `未运行，且 autoStartGateway=false ${options.gatewayUrl}`]);
      }
    } else if (agentType === 'openclaw') {
      const options = resolveOpenClawGatewayOptions(agent);
      const health = await checkOpenClawGatewayHealth(options.gatewayUrl, agent, { timeoutMs: 3000 });
      if (health.ok) {
        checks.push([`${agentType} Gateway`, true, options.gatewayUrl]);
      } else if (agent.autoStartGateway !== false) {
        const hasCli = !agent.enabled || (path.isAbsolute(options.openclawBin) ? fs.existsSync(options.openclawBin) : commandExists(options.openclawBin));
        checks.push([`${agentType} Gateway`, true, `not running; OpenClaw messages will auto-start ${options.gatewayUrl}`]);
        checks.push([`${agentType} CLI`, hasCli, options.openclawBin]);
      } else {
        checks.push([`${agentType} Gateway`, false, `not running and autoStartGateway=false ${options.gatewayUrl}`]);
      }
      checks.push([`${agentType} Agent ID`, true, agent.openclawAgentId || 'main']);
    } else {
      checks.push([`${agentType} CLI`, !agent.enabled || (path.isAbsolute(agent.bin) ? fs.existsSync(agent.bin) : commandExists(agent.bin)), agent.bin]);
      if (agentType === 'codex') {
        checks.push([`${agentType} Network`, true, agent.networkAccess === false ? 'disabled' : 'enabled']);
        checks.push([`${agentType} 二进制来源`, true, describeCodexBinSource(agent.bin)]);
      }
    }
  }
  checks.push(['Git Bash', process.platform !== 'win32' || Boolean(findGitBash(userConfig)), process.platform === 'win32' ? (config.gitBashEnv || '未找到') : '非 Windows 不需要']);
  checks.push(['Linco Home', canEnsureWritable(config.lincoHome), config.lincoHome]);
  checks.push(['会话目录', canEnsureWritable(config.sessionsDir), config.sessionsDir]);

  console.log('Linco Connect Doctor\n');
  let ok = true;
  for (const [name, passed, detail] of checks) {
    ok = ok && passed;
    console.log(`${passed ? '✅' : '❌'} ${name}: ${detail}`);
  }
  console.log(`\n本地测试页: ${localUrlWithToken(config)}`);

  if (!ok) process.exitCode = 1;
}

function channelDoctorChecks(config, userConfig) {
  const checks = [];
  const activeChannels = Array.isArray(config.activeChannels) && config.activeChannels.length > 0
    ? config.activeChannels
    : [config.im?.channel || userConfig.defaultChannel || 'linco'];
  const channels = userConfig.channels || {};
  const connectorKeys = new Set((config.im?.connectors || []).map(item => {
    return `${item.channel}:${item.agentType}:${item.account || 'default'}`;
  }));

  for (const channelName of activeChannels) {
    const channelConfig = channels[channelName];
    const preset = getChannelPreset(channelName);
    checks.push([
      `Channel ${channelName}`,
      Boolean(channelConfig),
      channelConfig ? `preset=${preset ? preset.name : 'none'}` : 'missing from config.channels',
    ]);
    if (!channelConfig) continue;

    const enabledAccounts = channelAccountEntries(channelName, channelConfig);
    if (enabledAccounts.length === 0) {
      checks.push([`Channel ${channelName} accounts`, false, 'no enabled accounts']);
      continue;
    }

    for (const entry of enabledAccounts) {
      const key = `${entry.channel}:${entry.agentType}:${entry.account}`;
      const wsUrl = resolvedChannelAccountWsUrl(config, userConfig, entry);
      const hasConnector = connectorKeys.has(key);
      checks.push([
        `Channel ${entry.channel}/${entry.agentType}/${entry.account}`,
        hasConnector,
        wsUrl ? safeUrlForDisplay(wsUrl) : 'missing wsUrl',
      ]);
      checks.push([
        `Credentials ${entry.channel}/${entry.agentType}/${entry.account}`,
        Boolean(entry.accountConfig.appId && entry.accountConfig.appSecret),
        entry.accountConfig.appId ? `appId=${entry.accountConfig.appId}` : 'missing appId/appSecret',
      ]);
      if (wsUrl && /^ws:\/\//i.test(wsUrl)) {
        // 回环/私有网段的 ws:// 已默认放行（与本机/局域网调试场景一致），仅公网 ws:// 提示
        const isPrivateHost = isPrivateNetworkWsUrl(wsUrl);
        checks.push([
          `WebSocket security ${entry.channel}/${entry.agentType}/${entry.account}`,
          isPrivateHost
            || entry.accountConfig.allowInsecureWs === true
            || config.im?.allowInsecureWs === true,
          isPrivateHost
            ? 'ws:// on private network, allowed by default'
            : 'ws:// on public host requires allowInsecureWs=true',
        ]);
      }
    }
  }

  return checks;
}

function channelAccountEntries(channelName, channelConfig = {}) {
  const entries = [];
  for (const [agentType, agentConfig] of Object.entries(channelConfig.agents || {})) {
    for (const [account, accountConfig] of Object.entries(agentConfig.accounts || {})) {
      if (accountConfig?.enabled !== true) continue;
      entries.push({
        account,
        accountConfig,
        agentConfig,
        agentType,
        channel: channelName,
      });
    }
  }
  return entries;
}

function resolvedChannelAccountWsUrl(config, userConfig, entry) {
  const upperAgentType = entry.agentType.toUpperCase();
  const preset = getChannelPreset(entry.channel);
  return entry.accountConfig.wsUrl
    || process.env[`LINCO_${upperAgentType}_WS_URL`]
    || (entry.agentType === 'claude' ? process.env.LINCO_WS_URL : '')
    || userConfig.agents?.[entry.agentType]?.wsUrl
    || preset?.agentWsUrls?.[entry.agentType]
    || preset?.defaultWsUrl
    || '';
}

function canEnsureWritable(dir) {
  try {
    ensureDir(dir);
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  doctorCommand,
  channelDoctorChecks,
  channelAccountEntries,
  resolvedChannelAccountWsUrl,
  canEnsureWritable,
};
