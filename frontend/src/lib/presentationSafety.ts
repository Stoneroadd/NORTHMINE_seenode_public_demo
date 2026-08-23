const TECHNICAL_FOOTPRINT = [
  /\/api(?:\/|\b)/i,
  /https?:\/\//i,
  /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\b/i,
  /\b(?:vite_|process\.env|import\.meta|schema_version|api_version|status_code|trace_id|request_id|correlation_id)\b/i,
  /\b(?:typeerror|referenceerror|syntaxerror|exception|stack trace|websocket|json payload)\b/i,
  /(?:^|\s)at\s+[\w$.<>]+\s*\([^)]*:\d+(?::\d+)?\)/i,
]

const SOURCE_NAMES: Array<[RegExp, string]> = [
  [/mission-control\/operational-flow/i, 'Estado operacional conectado'],
  [/shift-comparison/i, 'Comparación de turnos'],
  [/profit-optimization/i, 'Evaluación económica'],
  [/hidden-losses/i, 'Pérdidas operacionales'],
  [/operational-nlp/i, 'Señales operacionales'],
  [/dispatcher-advisor/i, 'Asistencia de despacho'],
  [/decision-audit/i, 'Historial de decisiones'],
  [/monthly-target/i, 'Plan mensual'],
  [/operator-ranking/i, 'Desempeño de operadores'],
  [/loading-units/i, 'Unidades de carguío'],
  [/performance/i, 'Rendimiento operacional'],
  [/production/i, 'Producción'],
  [/reports?/i, 'Informes operacionales'],
  [/alerts?/i, 'Condiciones operacionales'],
  [/fleet/i, 'Estado de flota'],
  [/cockpit/i, 'Situación operacional consolidada'],
  [/auth|login|session/i, 'Gestión de acceso'],
  [/admin\/users/i, 'Administración de usuarios'],
  [/wenco|sql server|wenco-sql-live/i, 'Wenco · fuente operacional'],
  [/synthetic|fast-demo|demo local/i, 'Escenario de demostración'],
  [/audit/i, 'Registro de actividad'],
]

export function operationalStatusLabel(value: unknown, fallback = 'Estado disponible'): string {
  if (typeof value !== 'string' || !value.trim()) return fallback
  const normalized = value.trim().toUpperCase()
  if (normalized === 'CONNECTED' || normalized === 'OK' || normalized === 'ONLINE') return 'Disponible'
  if (normalized === 'DISCONNECTED' || normalized === 'OFFLINE') return 'No disponible'
  if (normalized.includes('STALE') || normalized.includes('CACHE')) return 'Datos demorados'
  if (normalized === 'REAL') return 'Datos reales'
  if (normalized === 'SYNTHETIC') return 'Datos sintéticos'
  if (normalized.includes('DEMO')) return 'Demostración'
  return humanizeIdentifier(value, fallback)
}

export function containsTechnicalFootprint(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return TECHNICAL_FOOTPRINT.some((pattern) => pattern.test(value))
}

export function toUserSafeMessage(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim()
  if (!normalized || containsTechnicalFootprint(normalized)) return fallback
  return normalized
}

export function sourceDisplayName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return 'Fuente operacional'
  const match = SOURCE_NAMES.find(([pattern]) => pattern.test(value))
  if (match) return match[1]
  if (containsTechnicalFootprint(value) || /[_{}[\]<>]/.test(value)) return 'Fuente operacional autorizada'
  return value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function auditActionLabel(method: string): string {
  const normalized = method.toUpperCase()
  if (normalized === 'GET') return 'Consulta'
  if (normalized === 'POST') return 'Registro'
  if (normalized === 'PUT' || normalized === 'PATCH') return 'Actualización'
  if (normalized === 'DELETE') return 'Retiro autorizado'
  return 'Operación'
}

export function auditOutcome(code: number): { label: string; tone: 'normal' | 'attention' | 'critical' } {
  if (code >= 500) return { label: 'No completada', tone: 'critical' }
  if (code === 401 || code === 403) return { label: 'Acceso rechazado', tone: 'attention' }
  if (code >= 400) return { label: 'Requiere revisión', tone: 'attention' }
  if (code >= 300) return { label: 'Redirigida', tone: 'attention' }
  return { label: 'Completada', tone: 'normal' }
}

export function humanizeIdentifier(value: unknown, fallback = 'Dato operacional'): string {
  if (typeof value !== 'string' || !value.trim()) return fallback
  if (containsTechnicalFootprint(value)) return fallback
  return value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}
