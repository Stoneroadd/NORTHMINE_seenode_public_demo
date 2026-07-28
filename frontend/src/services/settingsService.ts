export type RuntimeEnvironment = 'development' | 'production'

function normalizeEnvironment(value: string | undefined): RuntimeEnvironment {
  const normalized = (value ?? '').toLowerCase()
  if (normalized === 'production') return 'production'
  return 'development'
}

const environment = normalizeEnvironment(
  import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE,
)

export const settingsService = {
  appName: import.meta.env.VITE_APP_NAME || 'NORTHMINE Intelligence',
  version: import.meta.env.VITE_APP_VERSION || '2.0.0',
  environment,
  apiBaseUrl: (import.meta.env.VITE_API_URL || 'http://localhost:8001').replace(/\/$/, ''),
  isProduction: environment === 'production',
  isDemoLike: false,
  showDemoMode: false,
}

export function isNorthmineApiHealth(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const health = value as { service?: unknown; status?: unknown }
  return health.service === 'northmine-api' && health.status === 'ok'
}
