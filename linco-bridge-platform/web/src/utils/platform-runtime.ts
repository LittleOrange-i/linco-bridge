export function isH5Runtime(): boolean {
  return true
}

export function isMiniProgramRuntime(): boolean {
  return false
}

export function supportsFetchStream(): boolean {
  return (
    typeof fetch === 'function' &&
    typeof ReadableStream !== 'undefined' &&
    typeof AbortController !== 'undefined'
  )
}

function resolveRequestAnimationFrame(): ((callback: () => void) => number) | null {
  const candidate = globalThis.requestAnimationFrame
  return typeof candidate === 'function' ? candidate.bind(globalThis) : null
}

export function scheduleNextFrame(callback: () => void): void {
  const raf = resolveRequestAnimationFrame()
  if (raf) raf(callback)
  else setTimeout(callback, 16)
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export interface CancelToken {
  readonly aborted: boolean
  abort(): void
  onAbort(listener: () => void): void
}

export class AbortError extends Error {
  constructor(message = 'Aborted') {
    super(message)
    this.name = 'AbortError'
  }
}

export function createCancelToken(): CancelToken {
  let aborted = false
  const listeners = new Set<() => void>()

  return {
    get aborted() {
      return aborted
    },
    abort() {
      if (aborted) return
      aborted = true
      listeners.forEach((listener) => listener())
    },
    onAbort(listener) {
      if (aborted) {
        listener()
        return
      }
      listeners.add(listener)
    },
  }
}

export function throwIfCancelled(cancel?: CancelToken): void {
  if (cancel?.aborted) throw new AbortError()
}

export function isAbortError(err: unknown): boolean {
  if (err instanceof AbortError) return true
  if (err instanceof Error && err.name === 'AbortError') return true
  return false
}
