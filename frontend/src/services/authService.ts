import axios from 'axios'
import { northmineApi, type AuthSession, type LoginRequest } from '../lib/api'
import { secureApi } from '../lib/secureApi'
import { settingsService } from './settingsService'

const BASE_URL = settingsService.apiBaseUrl

// Ninguna de las dos mitades de la sesion toca localStorage: el refresh
// token vive solo en la cookie httpOnly que pone el backend, y el access
// token vive solo en memoria (zustand). Un disco legible por cualquier
// script es el primer lugar que un XSS revisa; en memoria, un reload de
// pagina simplemente lo borra y hay que reconstruirlo (ver restoreSession).
const LEGACY_SESSION_KEY = 'northmine2.auth.session'

export async function login(payload: LoginRequest): Promise<AuthSession> {
  return northmineApi.login(payload)
}

// Reconstruye la sesion al cargar la app (F5, pestaña nueva) canjeando la
// cookie httpOnly por un access token fresco, sin haber persistido nada.
// Si la cookie no existe o expiro, retorna null y App.tsx muestra Login.
export async function restoreSession(): Promise<AuthSession | null> {
  try {
    const { data: refreshed } = await axios.post(
      `${BASE_URL}/api/auth/refresh`,
      {},
      { withCredentials: true },
    )
    const accessToken = refreshed?.access_token as string | undefined
    if (!accessToken) return null

    const { data: profile } = await axios.get(`${BASE_URL}/api/auth/me`, {
      withCredentials: true,
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    return {
      user_id: String(profile.user_id ?? ''),
      username: String(profile.username ?? profile.sub ?? ''),
      nombre: String(profile.nombre ?? profile.username ?? ''),
      rol: profile.rol,
      faena: String(profile.faena ?? ''),
      empresa: String(profile.empresa ?? ''),
      access_token: accessToken,
      token_type: 'bearer',
      modo: profile.modo,
      sql_disponible: Boolean(profile.sql_disponible),
      is_demo: Boolean(profile.is_demo),
    } as AuthSession
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  try {
    await secureApi.post('/api/auth/logout')
  } catch {
    // Even if the API call fails, clear local session
  }
  // Limpieza de una sola vez para sesiones guardadas antes de este cambio.
  localStorage.removeItem(LEGACY_SESSION_KEY)
}
