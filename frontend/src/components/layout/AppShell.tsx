import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { AuthSession } from '../../lib/api'
import { getHealth } from '../../services/dashboardService'
import { logout as clearSession } from '../../services/authService'
import { useAppStore } from '../../store'
import { CommandCenterBackground } from '../effects/CommandCenterBackground'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useModuleT } from '../../i18n/useModuleT'
import { layoutT } from '../../i18n/modules/layout'
import { AgentGuidanceLayer } from '../ai-copilot/AgentGuidanceLayer'
import { AgentCommandPalette } from '../ai-copilot/AgentCommandPalette'
import { AgentContextMenu } from '../ai-copilot/AgentContextMenu'
import { sectionFromPath, sectionPaths, type SectionId } from '../../lib/appRoutes'

interface Props {
  session: AuthSession
  onLogout: () => void
  children: (section: SectionId) => ReactNode
}

export function AppShell({ session, onLogout, children }: Props) {
  const t = useModuleT(layoutT)
  const [section, setSection] = useState<SectionId>(() => sectionFromPath(window.location.pathname))
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
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
    setCurrentPath(nextPath)
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath)
    }
  }

  const handleSelectPath = (nextPath: string) => {
    setSection(sectionFromPath(nextPath))
    setCurrentPath(nextPath)
    setMobileSidebarOpen(false)
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath)
    }
  }

  useEffect(() => {
    const handlePopState = () => {
      const nextPath = window.location.pathname
      setSection(sectionFromPath(nextPath))
      setCurrentPath(nextPath)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !mobileSidebarOpen) return
      setMobileSidebarOpen(false)
      window.requestAnimationFrame(() => menuButtonRef.current?.focus())
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileSidebarOpen])

  return (
    <div className="app-shell">
      <AgentGuidanceLayer />
      <AgentCommandPalette />
      <AgentContextMenu />
      {backgroundFxEnabled && <CommandCenterBackground />}
      <Sidebar
        active={section}
        activePath={currentPath}
        onSelect={handleSelectSection}
        onPathSelect={handleSelectPath}
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
          menuButtonRef={menuButtonRef}
          menuOpen={mobileSidebarOpen}
          onRefresh={handleRefresh}
          onLogout={handleLogout}
        />
        <main className="content-area">{children(section)}</main>
      </div>
    </div>
  )
}
