import { lazy, Suspense, useState, useEffect, useLayoutEffect, useCallback, type ReactNode } from 'react'
import { useTheme } from './hooks/useTheme'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { useAppStore } from './store'
import type { AuthSession } from './lib/api'
import { restoreSession } from './services/authService'
import { LoadingState } from './components/common/LoadingState'
import { AppShell } from './components/layout/AppShell'
import type { SectionId } from './components/layout/Sidebar'
import { Login } from './pages/Login'
import { IdleTimeoutBanner } from './components/ui/IdleTimeoutBanner'
import { useIdleTimeout } from './hooks/useIdleTimeout'
import { useModuleT } from './i18n/useModuleT'
import { appT, type AppT } from './i18n/modules/app'

const loadPrediction  = () => import('./pages/Prediction')
const loadSimulator   = () => import('./pages/Simulator')
const loadAerialView  = () => import('./pages/AerialPage')
const loadAuditLog    = () => import('./pages/AuditLog')
const loadSystemPage  = () => import('./pages/SystemPage')
const loadAdminUsersPage = () => import('./pages/AdminUsersPage')
const loadCompare     = () => import('./pages/Compare')
const loadOperatorRanking = () => import('./pages/OperatorRanking')
const loadReports     = () => import('./pages/Reports')
const loadDashboard   = () => import('./pages/Dashboard')
const loadDecisionCockpit = () => import('./pages/DecisionCockpit')
const loadOperationalMindMap3D = () => import('./pages/OperationalMindMap3D')
const loadCurrentShift = () => import('./pages/CurrentShiftPage')
const loadProduction  = () => import('./pages/Production')
const loadPerformance = () => import('./pages/Performance')
const loadFleet       = () => import('./pages/FleetPage')
const loadLoadingUnits = () => import('./pages/LoadingUnitsPage')
const loadAveriasPage = () => import('./pages/AveriasPage')
const loadExpertAnalysisPage = () => import('./pages/ExpertAnalysisPage')
const loadAlerts      = () => import('./pages/Alerts')

const Prediction  = lazy(() => loadPrediction().then(m => ({ default: m.Prediction })))
const Simulator   = lazy(() => loadSimulator().then(m => ({ default: m.Simulator })))
const AerialView  = lazy(() => loadAerialView().then(m => ({ default: m.AerialPage })))
const AuditLog    = lazy(() => loadAuditLog().then(m => ({ default: m.AuditLog })))
const SystemPage  = lazy(() => loadSystemPage().then(m => ({ default: m.SystemPage })))
const AdminUsersPage = lazy(() => loadAdminUsersPage().then(m => ({ default: m.AdminUsersPage })))
const Compare     = lazy(() => loadCompare().then(m => ({ default: m.Compare })))
const OperatorRanking = lazy(() => loadOperatorRanking().then(m => ({ default: m.OperatorRanking })))
const Reports     = lazy(() => loadReports().then(m => ({ default: m.Reports })))
const Dashboard   = lazy(() => loadDashboard().then(m => ({ default: m.Dashboard })))
const DecisionCockpit = lazy(() => loadDecisionCockpit().then(m => ({ default: m.DecisionCockpit })))
const OperationalMindMap3D = lazy(() => loadOperationalMindMap3D().then(m => ({ default: m.OperationalMindMap3D })))
const CurrentShift = lazy(() => loadCurrentShift().then(m => ({ default: m.CurrentShiftPage })))
const Production  = lazy(() => loadProduction().then(m => ({ default: m.Production })))
const Performance = lazy(() => loadPerformance().then(m => ({ default: m.Performance })))
const Fleet       = lazy(() => loadFleet().then(m => ({ default: m.FleetPage })))
const LoadingUnits = lazy(() => loadLoadingUnits().then(m => ({ default: m.LoadingUnitsPage })))
const AveriasPage = lazy(() => loadAveriasPage().then(m => ({ default: m.AveriasPage })))
const ExpertAnalysisPage = lazy(() => loadExpertAnalysisPage().then(m => ({ default: m.ExpertAnalysisPage })))
const Alerts      = lazy(() => loadAlerts().then(m => ({ default: m.Alerts })))
import { Settings } from 'lucide-react'

const ALL_MODULE_LOADERS = [
  loadPrediction, loadSimulator, loadAerialView, loadAuditLog, loadSystemPage,
  loadAdminUsersPage, loadCompare, loadOperatorRanking, loadReports, loadDashboard,
  loadDecisionCockpit, loadOperationalMindMap3D, loadCurrentShift, loadProduction,
  loadPerformance, loadFleet, loadLoadingUnits, loadAveriasPage, loadExpertAnalysisPage,
  loadAlerts,
]

// Precarga en segundo plano el codigo JS de todos los modulos apenas hay
// sesion, para que cambiar de modulo no tenga que esperar la descarga del
// chunk — solo queda el fetch de datos (ya cacheado en el backend).
function preloadAllModules() {
  for (const load of ALL_MODULE_LOADERS) {
    load().catch(() => {})
  }
}

function schedulePreload(callback: () => void) {
  if (typeof window === 'undefined') return
  const idle = (window as typeof window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
  if (idle) {
    idle(callback)
  } else {
    window.setTimeout(callback, 1200)
  }
}

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
      return wrap(_S(<CurrentShift />), 'turno')
    case 'produccion':
      return wrap(_S(<Production />), 'produccion')
    case 'rendimiento':
      return wrap(_S(<Performance />), 'rendimiento')
    case 'flota':
      return wrap(_S(<Fleet />), 'flota')
    case 'carguio':
      return wrap(_S(<LoadingUnits />), 'carguio')
    case 'averias':
      return wrap(_S(<AveriasPage />), 'averias')
    case 'analisis':
      return wrap(_S(<ExpertAnalysisPage />), 'analisis')
    case 'aerea':
      return wrap(_S(<AerialView />), 'aerea')
    case 'alertas':
      return wrap(_S(<Alerts />), 'alertas')
    case 'reportes':
      return wrap(_S(<Reports />), 'reportes')
    case 'admin':
      return wrap(
        <div className="section-placeholder">
          <Settings size={34} />
          <span>{t.admin_titulo}</span>
          <h2>{t.admin_subtitulo}</h2>
          <p>{t.admin_desc}</p>
        </div>,
        'admin',
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

  // El access token ya no se persiste (ver secureApi.ts / authService.ts):
  // al cargar la app, se reconstruye la sesion canjeando la cookie httpOnly
  // del refresh token por un access token fresco. Mientras eso resuelve,
  // `bootstrapping` evita que se muestre el login antes de tiempo.
  const [session, setSession] = useState<AuthSession | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    let cancelled = false
    restoreSession().then((restored) => {
      if (cancelled) return
      if (restored) {
        useAppStore.getState().setUsuario(sessionToUsuario(restored))
        setSession(restored)
      }
      setBootstrapping(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // useLayoutEffect garantiza sync antes de que React Query ejecute sus useEffect
  useLayoutEffect(() => {
    if (bootstrapping) return
    if (session) {
      setUsuario(sessionToUsuario(session))
    } else {
      setUsuario(null)
    }
  }, [session, setUsuario, bootstrapping])

  useEffect(() => {
    if (!session) return
    schedulePreload(preloadAllModules)
  }, [session])

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

  if (bootstrapping) {
    return <LoadingState label={t.cargando} />
  }

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

