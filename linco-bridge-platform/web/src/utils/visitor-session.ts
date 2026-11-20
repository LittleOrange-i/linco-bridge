export const VISITOR_SESSION_STORAGE_KEY = 'linco-bridge-visitor-session'
export const VISITOR_SESSION_HEADER = 'X-Linco-Visitor-Session'
export const VISITOR_SESSION_COOKIE = 'linco-bridge-session'

let memoryToken: string | null = null

function readStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(VISITOR_SESSION_STORAGE_KEY)
    if (raw?.trim()) return raw.trim()
  } catch {
    // ignore storage errors
  }
  return null
}

export function getVisitorSessionToken(): string | null {
  if (memoryToken) return memoryToken
  memoryToken = readStoredToken()
  return memoryToken
}

export function setVisitorSessionToken(token: string): void {
  const normalized = token.trim()
  if (!normalized) return
  memoryToken = normalized
  try {
    localStorage.setItem(VISITOR_SESSION_STORAGE_KEY, normalized)
  } catch {
    // ignore storage errors
  }
}

export function clearVisitorSessionToken(): void {
  memoryToken = null
  try {
    localStorage.removeItem(VISITOR_SESSION_STORAGE_KEY)
  } catch {
    // ignore storage errors
  }
}

export function buildVisitorSessionHeaders(): Record<string, string> {
  const token = getVisitorSessionToken()
  if (!token) return {}
  return { [VISITOR_SESSION_HEADER]: token }
}
