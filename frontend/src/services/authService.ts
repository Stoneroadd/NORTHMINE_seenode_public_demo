import { northmineApi, type AuthSession, type LoginRequest } from '../lib/api'
import { secureApi } from '../lib/secureApi'

const SESSION_KEY = 'northmine2.auth.session'

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

function isActiveJwt(token: string): boolean {
  const payload = decodeJwtPayload(token)
  const exp = payload?.exp
  if (typeof exp !== 'number') return false

  // Reject tokens that are expired or about to expire while the app hydrates.
  return exp * 1000 > Date.now() + 30_000
}

function isValidSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false

  const session = value as Partial<AuthSession>
  if (!session.access_token || !session.username || !session.nombre || !session.rol || !session.token_type) {
    return false
  }

  // Rechazar tokens pre-Sprint 8 (formato base64 "demo.eyJ…") — solo aceptar JWT reales
  const token = session.access_token
  if (!token.startsWith('eyJ')) {
    return false
  }

  if (!isActiveJwt(token)) {
    return false
  }

  return true
}

export async function login(payload: LoginRequest): Promise<AuthSession> {
  const session = await northmineApi.login(payload)
  saveSession(session)
  return session
}

export function saveSession(session: AuthSession): void {
  const persistedSession: AuthSession = { ...session }
  delete persistedSession.refresh_token
  localStorage.setItem(SESSION_KEY, JSON.stringify(persistedSession))
}

export function getStoredSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isValidSession(parsed)) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }

    return parsed
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export async function logout(): Promise<void> {
  try {
    await secureApi.post('/api/auth/logout')
  } catch {
    // Even if the API call fails, clear local session
  }
  localStorage.removeItem(SESSION_KEY)
}
