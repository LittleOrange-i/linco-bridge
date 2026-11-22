import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { Clipboard } from '@capacitor/clipboard'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { router } from '@/router'
import { toRouteQuery } from '@/utils/route-query'

type UnknownRecord = Record<string, unknown>

// 是否运行在 Capacitor 原生壳（安卓/iOS App）内；供组件按平台裁剪功能入口
export const isNativePlatform = Capacitor.isNativePlatform()

const isNative = isNativePlatform

interface ToastOptions {
  title: string
  icon?: 'success' | 'error' | 'none'
  duration?: number
}

interface ModalOptions {
  title?: string
  content?: string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  success?: (result: { confirm: boolean; cancel: boolean; content?: string }) => void
  fail?: () => void
}

interface RequestOptions {
  url: string
  method?: string
  data?: unknown
  header?: Record<string, string>
  withCredentials?: boolean
  timeout?: number
  responseType?: 'text' | 'arraybuffer' | 'json'
  enableChunked?: boolean
  success?: (result: { data: unknown; statusCode: number; header: UnknownRecord }) => void
  fail?: (error: { errMsg: string }) => void
}

interface RequestTask {
  abort?: () => void
  onChunkReceived?: (listener: (result: { data: string | ArrayBuffer }) => void) => void
}

interface FileSystemManager {
  readFile?: (options: {
    filePath: string
    encoding?: string
    success?: (result: { data: string | ArrayBuffer }) => void
    fail?: (error: { errMsg: string }) => void
  }) => void
  writeFile?: (options: {
    filePath: string
    data: string
    encoding?: string
    success?: () => void
    fail?: (error: { errMsg: string }) => void
  }) => void
}

function webToast(options: ToastOptions): void {
  if (typeof document === 'undefined') return
  document.querySelector('.linco-toast')?.remove()
  const el = document.createElement('div')
  el.className = 'linco-toast'
  el.textContent = options.title
  document.body.appendChild(el)
  window.setTimeout(() => el.remove(), options.duration ?? 2000)
}

function splitUrl(url: string): { path: string; query: UnknownRecord } {
  const [rawPath = '/', rawQuery = ''] = url.split('?')
  const query: UnknownRecord = {}
  for (const [key, value] of new URLSearchParams(rawQuery).entries()) query[key] = value
  return { path: rawPath.startsWith('/') ? rawPath : `/${rawPath}`, query }
}

async function copyText(text: string): Promise<void> {
  if (isNative) {
    await Clipboard.write({ string: text })
    return
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

function request(options: RequestOptions): RequestTask {
  const controller = new AbortController()
  const listeners: Array<(result: { data: string | ArrayBuffer }) => void> = []
  let timer: number | undefined = undefined

  const method = (options.method ?? 'GET').toUpperCase()
  const headers = new Headers(options.header ?? {})
  let body: BodyInit | undefined
  if (options.data !== undefined && method !== 'GET' && method !== 'HEAD') {
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.data)
  }

  timer = window.setTimeout(() => controller.abort(), options.timeout ?? 60_000)

  void fetch(options.url, {
    method,
    headers,
    body,
    signal: controller.signal,
    credentials: options.withCredentials ? 'include' : 'same-origin',
  })
    .then(async (response) => {
      let payload: unknown
      if (options.responseType === 'arraybuffer') {
        if (listeners.length > 0 && response.body) {
          const reader = response.body.getReader()
          const chunks: Uint8Array[] = []
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            if (!value) continue
            chunks.push(value)
            listeners.forEach((listener) =>
              listener({
                data: value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength),
              }),
            )
          }
          const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
          const merged = new Uint8Array(total)
          let offset = 0
          for (const chunk of chunks) {
            merged.set(chunk, offset)
            offset += chunk.byteLength
          }
          payload = merged.buffer
        } else {
          payload = await response.arrayBuffer()
        }
      } else {
        const text = await response.text()
        try {
          payload = JSON.parse(text)
        } catch {
          payload = text
        }
      }
      if (timer !== undefined) window.clearTimeout(timer)
      options.success?.({
        data: payload,
        statusCode: response.status,
        header: Object.fromEntries(Array.from(headers as unknown as Iterable<[string, string]>)),
      })
    })
    .catch((error: unknown) => {
      if (timer !== undefined) window.clearTimeout(timer)
      const isNetworkError = error instanceof TypeError
      const message = isNetworkError
        ? '网络连接失败，请检查服务地址与网络'
        : error instanceof Error
          ? error.message
          : '网络请求失败'
      options.fail?.({ errMsg: message })
    })

  return {
    abort: () => controller.abort(),
    onChunkReceived: (listener) => {
      listeners.push(listener)
    },
  }
}

function normalizeFsPath(filePath: string): string {
  if (filePath.startsWith('/')) return filePath.slice(1)
  return filePath
}

const fileSystemManager: FileSystemManager = {
  readFile: (options) => {
    if (!isNative) {
      options.fail?.({ errMsg: 'Web 端不支持文件系统读取' })
      return
    }
    void Filesystem.readFile({
      path: normalizeFsPath(options.filePath),
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
      .then((result) => options.success?.({ data: String(result.data) }))
      .catch((error: unknown) =>
        options.fail?.({ errMsg: error instanceof Error ? error.message : '读取失败' }),
      )
  },
  writeFile: (options) => {
    if (!isNative) {
      options.fail?.({ errMsg: 'Web 端不支持文件系统写入' })
      return
    }
    void Filesystem.writeFile({
      path: normalizeFsPath(options.filePath),
      data: options.data,
      directory: Directory.Data,
      encoding: options.encoding === 'base64' ? ('base64' as Encoding) : Encoding.UTF8,
    })
      .then(() => options.success?.())
      .catch((error: unknown) =>
        options.fail?.({ errMsg: error instanceof Error ? error.message : '写入失败' }),
      )
  },
}

export const uniCompat = {
  env: {
    USER_DATA_PATH: isNative ? 'data' : '',
  },
  showToast: (options: ToastOptions) => {
    if (isNative) void Haptics.impact({ style: ImpactStyle.Light })
    webToast(options)
  },
  showModal: (options: ModalOptions) => {
    const text = [options.title, options.content].filter(Boolean).join('\n\n')
    const confirmed = typeof window === 'undefined' ? false : window.confirm(text)
    options.success?.({ confirm: confirmed, cancel: !confirmed, content: options.content })
    if (!confirmed) options.fail?.()
  },
  showActionSheet: (options: {
    itemList?: string[]
    success?: (result: { tapIndex: number }) => void
    fail?: () => void
  }) => {
    const items = options.itemList ?? []
    const answer = typeof window === 'undefined' ? null : window.prompt(items.join('\n'), '0')
    const index = Number(answer)
    if (answer !== null && Number.isInteger(index) && index >= 0 && index < items.length) {
      options.success?.({ tapIndex: index })
    } else {
      options.fail?.()
    }
  },
  setClipboardData: (options: {
    data: string
    success?: () => void
    fail?: (error: { errMsg: string }) => void
  }) => {
    void copyText(options.data).then(options.success, (error: unknown) => {
      options.fail?.({ errMsg: error instanceof Error ? error.message : '复制失败' })
    })
  },
  getStorageSync: (key: string) => {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return ''
      try {
        return JSON.parse(raw)
      } catch {
        return raw
      }
    } catch {
      return ''
    }
  },
  setStorageSync: (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    } catch {
      // ignore storage errors
    }
  },
  removeStorageSync: (key: string) => {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore storage errors
    }
  },
  navigateTo: (options: { url: string; fail?: (error: { errMsg: string }) => void }) => {
    void router
      .push({ path: splitUrl(options.url).path, query: toRouteQuery(splitUrl(options.url).query) })
      .catch((error: unknown) => {
        options.fail?.({ errMsg: error instanceof Error ? error.message : '跳转失败' })
      })
  },
  redirectTo: (options: { url: string; fail?: (error: { errMsg: string }) => void }) => {
    void router
      .replace({
        path: splitUrl(options.url).path,
        query: toRouteQuery(splitUrl(options.url).query),
      })
      .catch((error: unknown) => {
        options.fail?.({ errMsg: error instanceof Error ? error.message : '跳转失败' })
      })
  },
  switchTab: (options: { url: string; fail?: (error: { errMsg: string }) => void }) => {
    void router
      .replace({
        path: splitUrl(options.url).path,
        query: toRouteQuery(splitUrl(options.url).query),
      })
      .catch((error: unknown) => {
        options.fail?.({ errMsg: error instanceof Error ? error.message : '跳转失败' })
      })
  },
  navigateBack: () => {
    if (window.history.length > 1) router.back()
    else void router.replace('/pages/messages/index')
  },
  request,
  getFileSystemManager: () => fileSystemManager,
  getSystemInfoSync: () => ({
    statusBarHeight: 0,
    windowWidth: typeof window === 'undefined' ? 375 : window.innerWidth,
    windowHeight: typeof window === 'undefined' ? 667 : window.innerHeight,
  }),
  getMenuButtonBoundingClientRect: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
  }),
  upx2px: (value: number) =>
    typeof window === 'undefined' ? value / 2 : (value * window.innerWidth) / 750,
  previewImage: (options: { current?: string; urls?: string[] }) => {
    const url = options.current ?? options.urls?.[0]
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  },
  openDocument: (options: { filePath: string; showMenu?: boolean }) => {
    void Share.share({ title: '文件', url: options.filePath, dialogTitle: '打开文件' }).catch(
      () => undefined,
    )
  },
  downloadFile: (options: {
    url: string
    success?: (result: { tempFilePath: string; statusCode: number }) => void
    fail?: (error: { errMsg: string }) => void
  }) => {
    void fetch(options.url)
      .then((response) => response.blob())
      .then((blob) => {
        options.success?.({ tempFilePath: URL.createObjectURL(blob), statusCode: 200 })
      })
      .catch((error: unknown) => {
        options.fail?.({ errMsg: error instanceof Error ? error.message : '下载失败' })
      })
  },
  chooseImage: (options: { fail?: () => void }) => options.fail?.(),
  chooseFile: (options: { fail?: () => void }) => options.fail?.(),
  compressImage: (options: { fail?: () => void }) => options.fail?.(),
}

export function installUniCompat(): void {
  const globalAny = globalThis as UnknownRecord
  globalAny.uni = uniCompat

  if (isNative) {
    void CapacitorApp.addListener('backButton', () => {
      if (window.history.length > 1) router.back()
      else void router.replace('/pages/messages/index')
    })
  }
}

export function getCurrentPages(): Array<{ options: UnknownRecord }> {
  return [{ options: { ...router.currentRoute.value.query } }]
}
