export type RuntimeEnvironment = 'development' | 'production'

function normalizeEnvironment(value: string | undefined): RuntimeEnvironment {
  const normalized = (value ?? '').toLowerCase()
  if (normalized === 'production') return 'production'
  return 'development'
}

const environment = normalizeEnvironment(
  import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE,
)

function envFlag(value: unknown): boolean {
  return String(value ?? '').toLowerCase() === 'true'
}

const defaultApiBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8001'
const showDemoMode = envFlag(import.meta.env.VITE_SHOW_DEMO_MODE)
const demoLite = envFlag(import.meta.env.VITE_DEMO_LITE)

export const settingsService = {
  appName: import.meta.env.VITE_APP_NAME || 'NORTHMINE Intelligence',
  version: import.meta.env.VITE_APP_VERSION || '2.0.0',
  environment,
  apiBaseUrl: (import.meta.env.VITE_API_URL || defaultApiBaseUrl).replace(/\/$/, ''),
  isProduction: environment === 'production',
  isDemoLike: showDemoMode || demoLite,
  showDemoMode,
  demoLite,
}
