import type { AgentBridgeType } from '../shared/constants'

/** Self-hosted platform channel（与 linco-connect 的 linco-bridge 预设对应）。 */
export const BRIDGE_CONNECT_CHANNEL = 'linco-bridge'

export const DEFAULT_BRIDGE_WS_URL = 'ws://127.0.0.1:3300/bridge/ws'

export interface BridgeCommandParams {
  appId: string
  appSecret: string
  /** 可选账号槽位；仅“新增连接”场景传入，避免覆盖连接器默认账号 */
  accountId?: string
  /** Optional WS override; omit to use linco-connect channel preset wsUrl. */
  wsUrl?: string
}

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

/** Aligned with web/src/bridge/commands.ts and linco-connect init flags. */
export function buildInitCommand(type: AgentBridgeType, params: BridgeCommandParams): string {
  const parts = [
    `linco-connect init --token "${params.appId}:${params.appSecret}"`,
    `--agent ${type}`,
  ]
  // channel 使用连接器默认预设（linco-bridge，默认指向本地 ws://127.0.0.1:3300），命令保持精简
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

export function buildSetupCommands(type: AgentBridgeType, params: BridgeCommandParams): string {
  return [
    'npm install -g linco-connect',
    '',
    buildInitCommand(type, params),
    '',
    'linco-connect start --daemon',
  ].join('\n')
}
