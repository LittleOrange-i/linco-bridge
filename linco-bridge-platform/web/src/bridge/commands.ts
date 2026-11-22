import type { AgentBridgeType } from './types'

/**
 * Self-hosted platform channel（与 linco-connect 的 linco-bridge 预设对应）。
 * Must match linco-bridge-connect `CHANNEL_PRESETS['linco-bridge']`.
 */
export const BRIDGE_CONNECT_CHANNEL = 'linco-bridge' as const

export const DEFAULT_BRIDGE_WS_URL = 'ws://127.0.0.1:3300/bridge/ws'

/** 是否为私有网段/回环地址（局域网与本机调试场景，ws:// 默认放行） */
function isPrivateNetworkWsUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (hostname === 'localhost' || hostname === '::1' || hostname.endsWith('.local')) return true
    if (hostname === '127.0.0.1' || hostname.startsWith('127.')) return true
    if (hostname.startsWith('192.168.')) return true
    if (/^10\./.test(hostname)) return true
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true
    return false
  } catch {
    return false
  }
}

export interface BridgeCommandParams {
  appId: string
  appSecret: string
  /** 可选账号槽位；仅“新增连接”场景传入，避免覆盖连接器默认账号 */
  accountId?: string
  /** Optional WS override; omit to use linco-connect channel preset wsUrl. */
  wsUrl?: string
}

const LOCAL_AGENT_TYPES = new Set<AgentBridgeType>(['codex', 'claude', 'deepseek', 'hermes'])

/** Human-readable agent name (aligned with Flutter LocalAgentBridgeSpec). */
export function getAgentDisplayName(type: AgentBridgeType): string {
  switch (type) {
    case 'codex':
      return 'Codex'
    case 'deepseek':
      return 'DeepSeek Harness'
    case 'hermes':
      return 'Hermes'
    case 'openclaw':
      return 'OpenClaw'
    case 'claude':
    default:
      return 'Claude Code'
  }
}

export function getAgentBridgeSubtitle(type: AgentBridgeType): string {
  return `${getAgentDisplayName(type)} 桥接`
}

/** CLI agent flag passed to linco-connect init --agent. */
export function getConnectAgentFlag(type: AgentBridgeType): string {
  return type === 'openclaw' ? 'openclaw' : type === 'claude' ? 'claude' : type
}

export function defaultAccountId(type: AgentBridgeType): string {
  return type === 'openclaw' ? 'openclaw_1' : `${type}_1`
}

/** Unique account slot for linco-connect multi-account on one device. */
export function generateConnectionAccountId(type: AgentBridgeType): string {
  const suffix = Math.random().toString(16).slice(2, 10)
  return `${type}_${suffix}`
}

/**
 * Single init command — must stay aligned with Flutter:
 * - import_local_agent_page.dart LocalAgentBridgeSpec.initCommand
 * - import_openclaw_page.dart OpenClawBridgeCommands.init
 */
export function buildInitCommand(type: AgentBridgeType, params: BridgeCommandParams): string {
  const agentFlag = getConnectAgentFlag(type)
  const parts = [
    `linco-connect init --token "${params.appId}:${params.appSecret}"`,
    `--agent ${agentFlag}`,
  ]
  // channel 走连接器默认预设（linco-bridge，默认指向本地 ws://127.0.0.1:3300），命令保持精简
  const wsOverride = params.wsUrl?.trim()
  if (wsOverride) {
    parts.push(`--ws-url ${wsOverride}`)
  }
  // 非私有网段的 ws:// 明文连接才需要显式放行；回环/局域网与 wss 默认安全
  if (wsOverride && wsOverride.startsWith('ws://') && !isPrivateNetworkWsUrl(wsOverride)) {
    parts.push('--allow-insecure-ws')
  }
  // 只有“新增连接”会传 accountId（避免覆盖连接器已有账号槽位），首次接入保持命令最短
  if (params.accountId?.trim()) {
    parts.push(`--account ${params.accountId.trim()}`)
  }
  return parts.join(' ')
}

/**
 * Full setup block shown on the connection page.
 * Order and wording must match Flutter allCommands / OpenClawBridgeCommands.all.
 */
export function buildSetupCommands(type: AgentBridgeType, params: BridgeCommandParams): string {
  return [
    'npm install -g linco-connect',
    '',
    buildInitCommand(type, params),
    '',
    'linco-connect start --daemon',
  ].join('\n')
}

export function isLocalAgentType(type: AgentBridgeType): boolean {
  return LOCAL_AGENT_TYPES.has(type)
}

export function parseAgentBridgeType(raw: string): AgentBridgeType | null {
  const normalized = raw.trim().toLowerCase()
  if (
    normalized === 'codex' ||
    normalized === 'claude' ||
    normalized === 'deepseek' ||
    normalized === 'hermes' ||
    normalized === 'openclaw'
  ) {
    return normalized
  }
  return null
}
