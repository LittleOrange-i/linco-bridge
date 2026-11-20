interface UniRequestSuccessResult {
  data: unknown
  statusCode: number
  header?: Record<string, string>
}

interface UniRequestFailResult {
  errMsg: string
}

interface UniRequestOptions {
  url: string
  method?: string
  data?: unknown
  header?: Record<string, string>
  timeout?: number
  responseType?: 'text' | 'arraybuffer' | 'json'
  enableChunked?: boolean
  withCredentials?: boolean
  success?: (result: UniRequestSuccessResult) => void
  fail?: (error: UniRequestFailResult) => void
}

interface UniRequestTask {
  abort?: () => void
  onChunkReceived?: (listener: (result: { data: string | ArrayBuffer }) => void) => void
}

interface UniModalResult {
  confirm: boolean
  cancel: boolean
  content?: string
}

interface UniClipboardOptions {
  data: string
  success?: () => void
  fail?: (error: { errMsg: string }) => void
}

interface UniFsFileResult {
  data: string | ArrayBuffer
}

interface UniFsWriteOptions {
  filePath: string
  data: string
  encoding?: string
  success?: () => void
  fail?: (error: { errMsg: string }) => void
}

interface UniFsReadOptions {
  filePath: string
  encoding?: string
  success?: (result: UniFsFileResult) => void
  fail?: (error: { errMsg: string }) => void
}

interface UniFileSystemManager {
  readFile?: (options: UniFsReadOptions) => void
  writeFile: (options: UniFsWriteOptions) => void
}

interface UniApi {
  env?: { USER_DATA_PATH?: string }
  request: (options: UniRequestOptions) => UniRequestTask
  showToast: (options: {
    title: string
    icon?: 'success' | 'error' | 'none'
    duration?: number
  }) => void
  showModal: (options: {
    title?: string
    content?: string
    confirmText?: string
    cancelText?: string
    confirmColor?: string
    editable?: boolean
    placeholderText?: string
    showCancel?: boolean
    success?: (result: UniModalResult) => void
    fail?: () => void
  }) => void
  showActionSheet: (options: {
    itemList?: string[]
    success?: (result: { tapIndex: number }) => void
    fail?: () => void
  }) => void
  setClipboardData: (options: UniClipboardOptions) => void
  getStorageSync: (key: string) => unknown
  setStorageSync: (key: string, value: unknown) => void
  removeStorageSync: (key: string) => void
  navigateTo: (options: { url: string; fail?: (error: { errMsg: string }) => void }) => void
  redirectTo: (options: { url: string; fail?: (error: { errMsg: string }) => void }) => void
  switchTab: (options: { url: string; fail?: (error: { errMsg: string }) => void }) => void
  navigateBack: () => void
  getFileSystemManager: () => UniFileSystemManager
  getSystemInfoSync: () => { statusBarHeight?: number; windowWidth: number; windowHeight: number }
  getMenuButtonBoundingClientRect: () => {
    top: number
    bottom: number
    left: number
    right: number
    width: number
    height: number
  }
  upx2px: (value: number) => number
  previewImage: (options: { current?: string; urls?: string[] }) => void
  openDocument: (options: { filePath: string; showMenu?: boolean }) => void
  downloadFile: (options: {
    url: string
    success?: (result: { tempFilePath: string; statusCode: number }) => void
    fail?: (error: { errMsg: string }) => void
  }) => void
  chooseImage: (options: { fail?: () => void }) => void
  chooseFile: (options: { fail?: () => void }) => void
  compressImage: (options: { fail?: () => void }) => void
}

declare global {
  const uni: UniApi
  interface UniApp {
    RequestOptions: { data: unknown }
  }
  namespace UniApp {
    type RequestOptions = { data: unknown }
  }
  function getCurrentPages(): Array<{ options: Record<string, unknown> }>
}

export {}
