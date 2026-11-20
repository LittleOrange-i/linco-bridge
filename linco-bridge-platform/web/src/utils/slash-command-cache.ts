import type { SlashCommandItem } from '@/bridge/slash-command'
import type { AgentBridgeType } from '@/bridge/types'

export const SLASH_COMMANDS_SHARED_SCOPE = '__shared__'
const STORAGE_PREFIX = 'linco_bridge_slash_commands_v1'
const memoryCache = new Map<string, SlashCommandItem[]>()

interface SlashCommandCacheRecord<T> {
  items: T[]
  updatedAt: number
}

export function slashCommandsMemoryKey(
  agentType: AgentBridgeType,
  connectionId?: string,
  sessionId?: string,
): string {
  const normalizedConnectionId = connectionId?.trim() || 'default'
  const normalizedScope = sessionId?.trim() || SLASH_COMMANDS_SHARED_SCOPE
  return `${agentType}|${normalizedConnectionId}|${normalizedScope}`
}

function storageKey(agentType: AgentBridgeType, connectionId: string, scopeKey: string): string {
  return `${STORAGE_PREFIX}:${agentType}:${connectionId}:${scopeKey}`
}

function readCache<T>(key: string): T[] | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SlashCommandCacheRecord<T>
    return Array.isArray(parsed.items) ? parsed.items : null
  } catch {
    return null
  }
}

function writeCache<T>(key: string, items: T[]): void {
  try {
    const record: SlashCommandCacheRecord<T> = { items, updatedAt: Date.now() }
    localStorage.setItem(key, JSON.stringify(record))
  } catch {
    // ignore storage errors
  }
}

export function readSlashCommandsFromCache(
  agentType: AgentBridgeType,
  connectionId?: string,
  sessionId?: string,
): SlashCommandItem[] {
  const memoryKey = slashCommandsMemoryKey(agentType, connectionId, sessionId)
  const cached = memoryCache.get(memoryKey)
  if (cached) return cached
  const normalizedConnectionId = connectionId?.trim() || 'default'
  const normalizedScope = sessionId?.trim() || SLASH_COMMANDS_SHARED_SCOPE
  const items =
    readCache<SlashCommandItem>(storageKey(agentType, normalizedConnectionId, normalizedScope)) ??
    []
  if (items.length > 0) memoryCache.set(memoryKey, items)
  return items
}

export function writeSlashCommandsToCache(
  agentType: AgentBridgeType,
  connectionId: string | undefined,
  sessionId: string | undefined,
  items: SlashCommandItem[],
): void {
  const normalizedConnectionId = connectionId?.trim() || 'default'
  const normalizedScope = sessionId?.trim() || SLASH_COMMANDS_SHARED_SCOPE
  memoryCache.set(slashCommandsMemoryKey(agentType, connectionId, sessionId), items)
  writeCache(storageKey(agentType, normalizedConnectionId, normalizedScope), items)
}

export function clearSlashCommandsCacheForTests(): void {
  memoryCache.clear()
}
