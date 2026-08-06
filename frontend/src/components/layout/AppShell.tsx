import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import type { AuthSession } from '../../lib/api'
import { getHealth } from '../../services/dashboardService'
import { logout as clearSession } from '../../services/authService'
import { useAppStore } from '../../store'
import { CommandCenterBackground } from '../effects/CommandCenterBackground'
import { Sidebar, type SectionId } from './Sidebar'
import { Topbar } from './Topbar'
import { useModuleT } from '../../i18n/useModuleT'
import { layoutT } from '../../i18n/modules/layout'

interface Props {
  session: AuthSession
  onLogout: () => void
  children: (section: SectionId) => ReactNode
}

// Exportado para que el AI Agent (AgentActionExecutor) pueda navegar
// reusando el mismo mapa seccion->ruta, sin duplicarlo ni acoplarse al
// estado interno de AppShell (navega via pushState + popstate, igual que
// handleSelectSection de mas abajo).
export const sectionPaths: Record<SectionId, string> = {
  cockpit: '/cockpit',
  operationalMap3d: '/operational-map-3d',
  dashboard: '/resumen',
  turno: '/turno',
  produccion: '/produccion',
  rendimiento: '/rendimiento',
  flota: '/flota',
  carguio: '/carguio',
  averias: '/averias',
  analisis: '/analisis',
  aerea: '/aerea',
  alertas: '/alertas',
  reportes: '/reportes',
  admin: '/admin',
}

function sectionFromPath(pathname: string): SectionId {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  const entries = Object.entries(sectionPaths) as Array<[SectionId, string]>
  return entries.find(([, path]) => path === normalized)?.[0] ?? (normalized === '/dashboard' ? 'dashboard' : 'cockpit')
}

export function AppShell({ session, onLogout, children }: Props) {
  const t = useModuleT(layoutT)
  const [section, setSection] = useState<SectionId>(() => sectionFromPath(window.location.pathname))
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const queryClient = useQueryClient()
  // El fondo decorativo (matrix rain + grid) dibuja en canvas via rAF de forma
  // continua; si esta desactivado en Efectos visuales debe desmontarse del
  // todo (no solo ocultarse con CSS) para liberar CPU/GPU realmente.
  const backgroundFxEnabled = useAppStore((s) => s.effects.hexgrid)
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 30000,
  })

  const handleLogout = async () => {
    await clearSession()
    onLogout()
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries()
  }

  const handleSelectSection = (nextSection: SectionId) => {
    setSection(nextSection)
    setMobileSidebarOpen(false)
    const nextPath = sectionPaths[nextSection]
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath)
    }
  }

  useEffect(() => {
    const handlePopState = () => {
      setSection(sectionFromPath(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileSidebarOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="app-shell">
      {backgroundFxEnabled && <CommandCenterBackground />}
      <Sidebar
        active={section}
        onSelect={handleSelectSection}
        mobileOpen={mobileSidebarOpen}
        onNavigate={() => setMobileSidebarOpen(false)}
      />
      <button
        className={`sidebar-overlay ${mobileSidebarOpen ? 'is-visible' : ''}`}
        type="button"
        aria-label={t.cerrar_navegacion}
        onClick={() => setMobileSidebarOpen(false)}
      />
      <div className="shell-main">
        <Topbar
          session={session}
          health={healthQuery.data}
          healthLoading={healthQuery.isLoading}
          refreshing={queryClient.isFetching() > 0}
          onMenuClick={() => setMobileSidebarOpen((value) => !value)}
          onRefresh={handleRefresh}
          onLogout={handleLogout}
        />
        <main className="content-area">{children(section)}</main>
      </div>
    </div>
  )
}

