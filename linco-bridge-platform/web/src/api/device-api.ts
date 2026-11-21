// 设备任务控制台 API：全量任务列表（不限工作目录）+ 继续任务入口。
// 数据源：GET /api/agent-bridges/:type/threads（连接器 /sessions --all），
// 继续任务 = 创建绑定会话 + resume（向连接器发 /bind 恢复本地线程）。
import { apiGet, apiPost } from './http-client'
import { resumeSession } from './session-api'

export interface DeviceThreadItem {
  id: string
  title: string
  running: boolean
  workspace: string
  updatedAt: number
  source: string
}

interface ApiEnvelope<T> {
  success?: boolean
  data?: T | null
  message?: string
}

function requireData<T>(res: ApiEnvelope<T>, fallbackMessage: string): T {
  if (!res.success || !res.data) {
    throw new Error(res.message || fallbackMessage)
  }
  return res.data
}

/** 拉取设备全量任务列表；runningOnly=1 时只返回运行中的任务。 */
export async function listDeviceThreads(
  agentType: string,
  options?: { limit?: number; runningOnly?: boolean; connectionId?: string },
): Promise<DeviceThreadItem[]> {
  const params = new URLSearchParams()
  params.set('limit', String(options?.limit ?? 50))
  if (options?.runningOnly) params.set('runningOnly', '1')
  if (options?.connectionId?.trim()) params.set('connectionId', options.connectionId.trim())
  const res = await apiGet<DeviceThreadItem[]>(
    `/api/agent-bridges/${encodeURIComponent(agentType)}/threads?${params.toString()}`,
  )
  return requireData(res, '加载任务列表失败')
}

/** 「继续任务」：创建绑定到已有本地线程的平台会话，resume 触发连接器 /bind，返回 sessionId 供聊天页使用。 */
export async function startThreadConversation(
  agentType: string,
  input: { threadId: string; title?: string; workspace?: string; connectionId?: string },
): Promise<{ sessionId: string }> {
  const res = await apiPost<{ sessionId: string }>(
    `/api/agent-chat/${encodeURIComponent(agentType)}/conversations`,
    {
      title: input.title?.trim() || undefined,
      connectionId: input.connectionId?.trim() || undefined,
      agentSessionId: input.threadId,
      projectPath: input.workspace?.trim() || undefined,
      tempSession: false,
    },
  )
  const { sessionId } = requireData(res, '创建会话失败')
  // resume 让服务端向连接器发 /bind，把后续消息路由到绑定的本地线程
  await resumeSession(sessionId).catch(() => undefined)
  return { sessionId }
}
