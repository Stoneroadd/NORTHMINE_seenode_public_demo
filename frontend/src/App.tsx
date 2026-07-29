import { lazy, Suspense, useState, useEffect, useLayoutEffect, useCallback, type ReactNode } from 'react'
import { useTheme } from './hooks/useTheme'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { useAppStore } from './store'
import type { AuthSession } from './lib/api'
import { getStoredSession } from './services/authService'
import { AppShell } from './components/layout/AppShell'
import type { SectionId } from './components/layout/Sidebar'
import { Login } from './pages/Login'
import { IdleTimeoutBanner } from './components/ui/IdleTimeoutBanner'
import { useIdleTimeout } from './hooks/useIdleTimeout'
import { useModuleT } from './i18n/useModuleT'
import { appT, type AppT } from './i18n/modules/app'

const Prediction  = lazy(() => import('./pages/Prediction').then(m => ({ default: m.Prediction })))
const Simulator   = lazy(() => import('./pages/Simulator').then(m => ({ default: m.Simulator })))
const AerialView  = lazy(() => import('./pages/AerialPage').then(m => ({ default: m.AerialPage })))
const AuditLog    = lazy(() => import('./pages/AuditLog').then(m => ({ default: m.AuditLog })))
const SystemPage  = lazy(() => import('./pages/SystemPage').then(m => ({ default: m.SystemPage })))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const Compare     = lazy(() => import('./pages/Compare').then(m => ({ default: m.Compare })))
const OperatorRanking = lazy(() => import('./pages/OperatorRanking').then(m => ({ default: m.OperatorRanking })))
const Reports     = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })))
const Dashboard   = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const DecisionCockpit = lazy(() => import('./pages/DecisionCockpit').then(m => ({ default: m.DecisionCockpit })))
const OperationalMindMap3D = lazy(() => import('./pages/OperationalMindMap3D').then(m => ({ default: m.OperationalMindMap3D })))
const CurrentShift = lazy(() => import('./pages/CurrentShiftPage').then(m => ({ default: m.CurrentShiftPage })))
const Production  = lazy(() => import('./pages/Production').then(m => ({ default: m.Production })))
const Performance = lazy(() => import('./pages/Performance').then(m => ({ default: m.Performance })))
const Fleet       = lazy(() => import('./pages/FleetPage').then(m => ({ default: m.FleetPage })))
const LoadingUnits = lazy(() => import('./pages/LoadingUnitsPage').then(m => ({ default: m.LoadingUnitsPage })))
const AveriasPage = lazy(() => import('./pages/AveriasPage').then(m => ({ default: m.AveriasPage })))
const ExpertAnalysisPage = lazy(() => import('./pages/ExpertAnalysisPage').then(m => ({ default: m.ExpertAnalysisPage })))
const Alerts      = lazy(() => import('./pages/Alerts').then(m => ({ default: m.Alerts })))
import { Settings } from 'lucide-react'

function wrap(node: React.ReactNode, key: string) {
  return <div key={key} className="page-content">{node}</div>
}

function renderSection(section: SectionId, session: AuthSession, t: AppT) {
  const _S = (children: ReactNode) => <Suspense fallback={<div className="loading-state">{t.cargando}</div>}>{children}</Suspense>
  const path = window.location.pathname
  if (path === '/admin/sistema') {
    if (session.rol !== 'admin') {
      return wrap(
        <div className="section-placeholder">
          <Settings size={34} />
          <span>{t.acceso_restringido}</span>
          <h2>{t.acceso_restringido_sistema_titulo}</h2>
          <p>{t.acceso_restringido_sistema_desc}</p>
        </div>,
        '/admin/sistema-denied',
      )
    }
    return wrap(_S(<SystemPage />), '/admin/sistema')
  }
  if (path === '/admin/users') {
    if (session.rol !== 'admin') {
      return wrap(
        <div className="section-placeholder">
          <Settings size={34} />
          <span>{t.acceso_restringido}</span>
          <h2>{t.acceso_restringido_usuarios_titulo}</h2>
          <p>{t.acceso_restringido_usuarios_desc}</p>
        </div>,
        '/admin/users-denied',
      )
    }
    return wrap(_S(<AdminUsersPage />), '/admin/users')
  }
  if (path === '/admin/auditoria') return wrap(_S(<AuditLog />), '/admin/auditoria')
  if (path === '/comparativa') return wrap(_S(<Compare />), '/comparativa')
  if (path === '/operator-ranking') {
    if (!['admin', 'supervisor'].includes(session.rol)) {
      return wrap(
        <div className="section-placeholder">
          <Settings size={34} />
          <span>{t.acceso_restringido}</span>
          <h2>{t.acceso_restringido_ranking_titulo}</h2>
          <p>{t.acceso_restringido_ranking_desc}</p>
        </div>,
        '/operator-ranking-denied',
      )
    }
    return wrap(_S(<OperatorRanking />), '/operator-ranking')
  }
  if (path === '/prediccion') return wrap(_S(<Prediction />), '/prediccion')
  if (path === '/simulador')  return wrap(_S(<Simulator />), '/simulador')
  if (path === '/aerea')      return wrap(_S(<AerialView />), '/aerea')
  if (path === '/cockpit')    return wrap(_S(<DecisionCockpit />), '/cockpit')
  if (path === '/operational-map-3d') return wrap(_S(<OperationalMindMap3D />), '/operational-map-3d')

  switch (section) {
    case 'cockpit':
      return wrap(_S(<DecisionCockpit />), 'cockpit')
    case 'operationalMap3d':
      return wrap(_S(<OperationalMindMap3D />), 'operationalMap3d')
    case 'dashboard':
      return wrap(_S(<Dashboard session={session} section={section} />), 'dashboard')
    case 'turno':
      return _S(<CurrentShift />)
    case 'produccion':
      return _S(<Production />)
    case 'rendimiento':
      return _S(<Performance />)
    case 'flota':
      return _S(<Fleet />)
    case 'carguio':
      return _S(<LoadingUnits />)
    case 'averias':
      return _S(<AveriasPage />)
    case 'analisis':
      return _S(<ExpertAnalysisPage />)
    case 'aerea':
      return wrap(_S(<AerialView />), 'aerea')
    case 'alertas':
      return _S(<Alerts />)
    case 'reportes':
      return _S(<Reports />)
    case 'admin':
      return (
        <div className="section-placeholder">
          <Settings size={34} />
          <span>{t.admin_titulo}</span>
          <h2>{t.admin_subtitulo}</h2>
          <p>{t.admin_desc}</p>
        </div>
      )
  }
}

function RateLimitBanner() {
  const rateLimitError    = useAppStore(s => s.rateLimitError)
  const setRateLimitError = useAppStore(s => s.setRateLimitError)
  const t = useModuleT(appT)

  useEffect(() => {
    if (!rateLimitError) return
    const timer = setTimeout(() => setRateLimitError(null), rateLimitError * 1000)
    return () => clearTimeout(timer)
  }, [rateLimitError, setRateLimitError])

  if (!rateLimitError) return null
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 1000,
      background: 'rgba(255,45,85,0.12)', border: '1px solid var(--danger-red, #FF2D55)',
      borderRadius: 8, padding: '12px 20px',
      fontFamily: 'var(--font-mono, monospace)', fontSize: 13, color: 'var(--danger-red, #FF2D55)',
    }}>
      {t.rate_limit(rateLimitError)}
    </div>
  )
}

function BackendUnreachableBanner() {
  const backendUnreachable = useAppStore(s => s.backendUnreachable)
  const t = useModuleT(appT)

  if (!backendUnreachable) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9998,
      background: 'rgba(239,176,77,0.95)', color: '#1a1200',
      textAlign: 'center', padding: '10px 20px',
      fontFamily: 'var(--font-mono, monospace)', fontSize: 13, fontWeight: 700,
    }}>
      {t.backend_unreachable}
    </div>
  )
}

// HU-2.3/HU-4.1: el backend SI responde (200), pero WENCO esta caido y esta
// sirviendo el ultimo dataset valido cacheado ("stale": true) en vez de
// datos en vivo. Distinto de BackendUnreachableBanner (que cubre el caso de
// red/servidor caido) - aca el backend esta arriba, la fuente de datos no.
function StaleDataBanner() {
  const backendUnreachable = useAppStore(s => s.backendUnreachable)
  const datosObsoletos = useAppStore(s => s.datosObsoletos)
  const t = useModuleT(appT)

  if (backendUnreachable || !datosObsoletos) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9997,
      background: 'rgba(239,176,77,0.95)', color: '#1a1200',
      textAlign: 'center', padding: '10px 20px',
      fontFamily: 'var(--font-mono, monospace)', fontSize: 13, fontWeight: 700,
    }}>
      {t.stale_data}
    </div>
  )
}

function sessionToUsuario(s: AuthSession) {
  return {
    id:      s.user_id,
    nombre:  s.nombre,
    rol:     s.rol as import('./store').Rol,
    faena:   s.faena,
    empresa: s.empresa,
    token:   s.access_token,
  }
}

export default function App() {
  useTheme()
  useIdleTimeout()
  const t = useModuleT(appT)
  const setUsuario      = useAppStore(s => s.setUsuario)
  const settingsOpen    = useAppStore(s => s.settingsOpen)
  const setSettingsOpen = useAppStore(s => s.setSettingsOpen)

  // Inicializar desde localStorage â€” sincrÃ³nico para que apiFetch tenga token
  // antes de que los componentes hijos disparen sus queries
  const [session, setSession] = useState<AuthSession | null>(() => {
    const s = getStoredSession()
    if (s) useAppStore.getState().setUsuario(sessionToUsuario(s))
    return s
  })

  // useLayoutEffect garantiza sync antes de que React Query ejecute sus useEffect
  useLayoutEffect(() => {
    if (session) {
      setUsuario(sessionToUsuario(session))
    } else {
      setUsuario(null)
    }
  }, [session, setUsuario])

  // Callbacks explÃ­citos: setUsuario ANTES de setSession para que el token
  // estÃ© en el store cuando Dashboard renderice por primera vez
  const handleAuthenticated = useCallback((newSession: AuthSession) => {
    setUsuario(sessionToUsuario(newSession))
    setSession(newSession)
  }, [setUsuario])

  const handleLogout = useCallback(() => {
    setUsuario(null)
    setSession(null)
  }, [setUsuario])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        setSettingsOpen(!settingsOpen)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen, setSettingsOpen])

  if (!session) {
    return (
      <>
        <RateLimitBanner />
        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <Login onAuthenticated={handleAuthenticated} />
      </>
    )
  }

  return (
    <>
      <RateLimitBanner />
      <BackendUnreachableBanner />
      <StaleDataBanner />
      <IdleTimeoutBanner />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AppShell session={session} onLogout={handleLogout}>
        {(section: SectionId) => renderSection(section, session, t)}
      </AppShell>
    </>
  )
}

