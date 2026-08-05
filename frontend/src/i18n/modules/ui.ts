import type { ModuleDict } from '../useModuleT'

export interface UiT {
  // IdleTimeoutBanner
  sessionExpiringIn: (minutes: string, seconds: string) => string
  continueSession: string
  // InteractiveMetricCard
  live: string
  // ui/index.tsx LoadingPanel
  loading: string
}

export const uiT: ModuleDict<UiT> = {
  es: {
    sessionExpiringIn: (minutes, seconds) => `⚠ POR SEGURIDAD, LA SESIÓN EXPIRARÁ EN ${minutes}:${seconds}`,
    continueSession: 'CONTINUAR SESIÓN',
    live: 'en vivo',
    loading: 'Cargando...',
  },
  en: {
    sessionExpiringIn: (minutes, seconds) => `⚠ FOR SECURITY, YOUR SESSION WILL EXPIRE IN ${minutes}:${seconds}`,
    continueSession: 'CONTINUE SESSION',
    live: 'live',
    loading: 'Loading...',
  },
  de: {
    sessionExpiringIn: (minutes, seconds) => `⚠ AUS SICHERHEITSGRÜNDEN LÄUFT IHRE SITZUNG IN ${minutes}:${seconds} AB`,
    continueSession: 'SITZUNG FORTSETZEN',
    live: 'live',
    loading: 'Wird geladen...',
  },
}
