import type { ApiResponse } from '@/bridge/types'
import { Capacitor } from '@capacitor/core'
import { buildVisitorSessionHeaders } from '@/utils/visitor-session'

export function getApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/$/, '')
  }
  if (Capacitor.isNativePlatform()) return 'http://127.0.0.1:3300'
  return ''
}

export function buildApiUrl(path: string): string {
  const base = getApiBaseUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (!base) return normalizedPath
  return `${base}${normalizedPath}`
}

export function buildApiRequestHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...buildVisitorSessionHeaders(),
    ...extra,
  }
}

export const DEFAULT_REQUEST_TIMEOUT_MS = 60_000
export const CHAT_REQUEST_TIMEOUT_MS = 300_000

export function requestJson<T>(options: {
  url: string
  method?: 'GET' | 'POST'
  data?: unknown
  timeout?: number
}): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: options.url,
      method: options.method ?? 'GET',
      data: options.data,
      header: buildApiRequestHeaders(),
      withCredentials: true,
      timeout: options.timeout ?? DEFAULT_REQUEST_TIMEOUT_MS,
      success: (res) => {
        const body = res.data as ApiResponse<T>
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = new Error(body?.message || `请求失败 (${res.statusCode})`) as Error & {
            statusCode?: number
          }
          error.statusCode = res.statusCode
          reject(error)
          return
        }
        resolve(body)
      },
      fail: (err) => reject(new Error(err.errMsg || '网络请求失败')),
    })
  })
}
