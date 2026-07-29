import axios, { type AxiosError, type AxiosInstance } from 'axios'
import { useAppStore } from '../store'
import { settingsService } from '../services/settingsService'

const BASE_URL = settingsService.apiBaseUrl
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
  if (!token.startsWith('eyJ')) return false

  const payload = decodeJwtPayload(token)
  const exp = payload?.exp
  if (typeof exp !== 'number') return false

  return exp * 1000 > Date.now() + 30_000
}

function getStoredAccessToken(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null

    const session = JSON.parse(raw) as { access_token?: unknown }
    return typeof session.access_token === 'string' ? session.access_token : null
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

function getCurrentAccessToken(): string | null {
  const storeToken = useAppStore.getState().usuario?.token
  if (storeToken && isActiveJwt(storeToken)) return storeToken

  const storedToken = getStoredAccessToken()
  if (storedToken && isActiveJwt(storedToken)) return storedToken

  return null
}

function updateStoredAccessToken(token: string) {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return
    const session = JSON.parse(raw)
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, access_token: token }))
  } catch {
    localStorage.removeItem(SESSION_KEY)
  }
}

function clearStoredSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore storage errors; zustand logout below is the source of truth.
  }
}

export const secureApi: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// ── Request: adjuntar access token ───────────────────────────────────────────
secureApi.interceptors.request.use((config) => {
  const token = getCurrentAccessToken()
  config.headers = config.headers ?? {}
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else {
    delete config.headers.Authorization
  }
  return config
})

// ── Response: manejar 401 → refresh, 429 → banner ────────────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: AxiosError) => void }> = []

function processQueue(error: AxiosError | null, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token!)
  )
  failedQueue = []
}

secureApi.interceptors.response.use(
  (response) => {
    const store = useAppStore.getState()
    if (store.backendUnreachable) {
      store.setBackendUnreachable(false)
    }

    // HU-4.1: frescura real de datos, actualizada en cada respuesta exitosa.
    store.setSistema({ ultimaActualizacion: new Date().toISOString() })

    // "stale": true (HU-2.3) = el backend respondio 200 pero WENCO esta caido
    // y esta sirviendo el ultimo dataset valido cacheado, no el dato en vivo.
    // Solo se actualiza el flag si la respuesta realmente trae esa clave -
    // endpoints ajenos al dataset (health, login, MFA, admin) no la traen y
    // no deben apagar el aviso de datos obsoletos que dejo una respuesta
    // anterior que si era sobre el dataset real.
    const body = response.data as { stale?: unknown } | undefined
    if (body && typeof body === 'object' && 'stale' in body) {
      const stale = body.stale === true
      if (stale !== store.datosObsoletos) {
        store.setDatosObsoletos(stale)
      }
    }

    return response
  },
  async (error: AxiosError) => {
    const original = error.config as any
    const status   = error.response?.status

    // Sin `error.response` = la request nunca llego a destino (backend caido,
    // timeout, red cortada) — distinto de un error HTTP donde el backend si respondio.
    if (!error.response) {
      useAppStore.getState().setBackendUnreachable(true)
    }

    if (status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers = original.headers ?? {}
          original.headers.Authorization = `Bearer ${token}`
          return secureApi(original)
        })
      }

      original._retry = true
      isRefreshing    = true

      try {
        const { data } = await axios.post(
          `${BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true },
        )
        const newToken = data.access_token
        const { usuario, setUsuario } = useAppStore.getState()
        if (usuario) setUsuario({ ...usuario, token: newToken })
        updateStoredAccessToken(newToken)

        processQueue(null, newToken)
        original.headers = original.headers ?? {}
        original.headers.Authorization = `Bearer ${newToken}`
        return secureApi(original)
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null)
        clearStoredSession()
        useAppStore.getState().logout()
        window.location.href = '/'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (status === 429) {
      const retryAfter = Number(error.response?.headers?.['retry-after'] ?? 60)
      const { setRateLimitError } = useAppStore.getState()
      setRateLimitError?.(retryAfter)
    }

    return Promise.reject(error)
  },
)
