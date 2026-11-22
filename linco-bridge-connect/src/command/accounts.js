const { splitCommandArgs } = require('./args');
const { sendSlashCommandResult } = require('./common');

const USAGE = 'Usage: /accounts --channel <channel>';

// 自托管预设的改名兼容：linco-bridge（新名）与 linco-demo（旧名）是同一预设，
// 服务器端已切换为新名，存量 config.json 里仍是旧名，两者需互相匹配
const CHANNEL_COMPAT_GROUPS = [
  ['linco-bridge', 'linco-demo'],
];

function resolveChannelAlias(channel, config = {}) {
  const requested = String(channel || '').trim();
  if (config?.channels?.[requested]) return requested;
  for (const group of CHANNEL_COMPAT_GROUPS) {
    if (group.includes(requested)) {
      for (const alias of group) {
        if (config?.channels?.[alias]) return alias;
      }
    }
  }
  return requested;
}

function handleAccounts(rawArg, ws, session, config = {}) {
  const parsed = parseAccountsArgs(rawArg);
  if (!parsed.ok) {
    sendSlashCommandResult(ws, 'accounts', { error: parsed.message, accountIds: [] }, session);
    return;
  }

  const channel = resolveChannelAlias(parsed.channel, config);
  const channelConfig = config?.channels?.[channel];
  if (!channelConfig) {
    sendSlashCommandResult(ws, 'accounts', {
      channel: parsed.channel,
      accountIds: [],
      error: `Unknown channel: ${parsed.channel}`,
    }, session);
    return;
  }

  sendSlashCommandResult(ws, 'accounts', {
    channel,
    accountIds: listChannelAccountIds(channelConfig),
  }, session);
}

function parseAccountsArgs(rawArg) {
  const parsed = splitCommandArgs(rawArg);
  if (!parsed.ok) return parsed;

  let channel = null;

  for (let i = 0; i < parsed.args.length; i++) {
    const arg = parsed.args[i];
    if (arg === '--channel') {
      const next = parsed.args[++i];
      if (!next) return { ok: false, message: USAGE };
      channel = next;
      continue;
    }
    if (arg.startsWith('--channel=')) {
      channel = arg.slice('--channel='.length);
      if (!channel) return { ok: false, message: USAGE };
      continue;
    }
    return { ok: false, message: USAGE };
  }

  channel = String(channel || '').trim();
  if (!channel) return { ok: false, message: USAGE };
  return { ok: true, channel };
}

function listChannelAccountIds(channelConfig = {}) {
  const ids = new Set();
  const agents = channelConfig.agents || {};

  for (const agentConfig of Object.values(agents)) {
    const accounts = agentConfig?.accounts || {};
    for (const accountId of Object.keys(accounts)) {
      ids.add(accountId);
    }
  }

  return [...ids].sort();
}

module.exports = {
  handleAccounts,
  parseAccountsArgs,
  listChannelAccountIds,
};
