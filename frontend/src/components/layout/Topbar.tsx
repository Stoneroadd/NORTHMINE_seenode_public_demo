import { useEffect, useState, type Ref } from 'react'
import { LogOut, Menu, RefreshCw, Settings, ShieldCheck, TerminalSquare } from 'lucide-react'
import type { AuthSession, HealthResponse } from '../../lib/api'
import { useAppStore, useT } from '../../store'
import { SystemStatusBadge } from '../status/SystemStatusBadge'
import { CommandButton } from '../ui/CommandButton'
import { StatusPill } from '../ui/StatusPill'
import { NorthmineLogo } from '../brand/NorthmineLogo'
import { SETTINGS_PANEL_ID } from '../settings/settingsA11y'

interface Props {
  session: AuthSession
  health?: HealthResponse
  healthLoading?: boolean
  onLogout: () => void
  onRefresh: () => void
  onMenuClick?: () => void
  menuButtonRef?: Ref<HTMLButtonElement>
  menuOpen?: boolean
  refreshing?: boolean
}

export function Topbar({
  session,
  health,
  healthLoading,
  onLogout,
  onRefresh,
  onMenuClick,
  menuButtonRef,
  menuOpen = false,
  refreshing,
}: Props) {
  const t = useT()
  const [clock, setClock] = useState(() => new Date())
  const [scrolled, setScrolled] = useState(false)
  const setSettingsOpen  = useAppStore(s => s.setSettingsOpen)
  const settingsOpen     = useAppStore(s => s.settingsOpen)
  const ultimaActualizacion = useAppStore(s => s.sistema.ultimaActualizacion)
  const datosObsoletos      = useAppStore(s => s.datosObsoletos)

  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 12)
    updateScrolled()
    window.addEventListener('scroll', updateScrolled, { passive: true })
    return () => window.removeEventListener('scroll', updateScrolled)
  }, [])

  return (
    <header className={`topbar ${scrolled ? 'is-scrolled' : ''}`}>
      <CommandButton
        className="topbar-menu-button"
        variant="ghost"
        icon={Menu}
        buttonRef={menuButtonRef}
        onClick={onMenuClick ?? (() => undefined)}
        aria-label={menuOpen ? 'Cerrar navegacion' : 'Abrir navegacion'}
        aria-controls="sidebar-nav"
        aria-expanded={menuOpen}
      >
        Menu
      </CommandButton>
      <div className="topbar-brand-identity">
        <NorthmineLogo className="topbar-brand-symbol" variant="symbol" alt="" aria-hidden="true" />
        <div className="topbar-brand-copy">
          <div className="eyebrow">Command Center Minero</div>
          <h1>NORTHMINE Intelligence Hub</h1>
          <div className="topbar-terminal-line">
            <TerminalSquare size={13} />
            <span>Command Center Online</span>
            <strong>{clock.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>
          </div>
        </div>
      </div>

      <SystemStatusBadge health={health} loading={healthLoading} />

      <div className="topbar-actions">
        <CommandButton
          className="topbar-command-button"
          variant="ghost"
          icon={Settings}
          onClick={() => setSettingsOpen(!settingsOpen)}
          title="Configuración (Ctrl+Shift+S)"
          aria-controls={SETTINGS_PANEL_ID}
          aria-expanded={settingsOpen}
        >
          <span>⚙</span>
        </CommandButton>
        <CommandButton className="topbar-command-button" variant="ghost" icon={RefreshCw} onClick={onRefresh} title="Actualizar datos">
          <span className={refreshing ? 'spin-text' : ''}>{t.action.actualizar}</span>
        </CommandButton>
        <div className="user-chip">
          <ShieldCheck size={16} />
          <div>
            <strong>{session.nombre}</strong>
            <span>{session.rol} - {session.faena}</span>
          </div>
        </div>
        <StatusPill tone={datosObsoletos ? 'warning' : ultimaActualizacion ? 'success' : 'neutral'}>
          {datosObsoletos
            ? 'DATOS DESACTUALIZADOS'
            : ultimaActualizacion
              ? `Datos al ${new Date(ultimaActualizacion).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : 'Sin datos aun'}
        </StatusPill>
        <CommandButton variant="secondary" icon={LogOut} onClick={onLogout}>{t.auth.salir}</CommandButton>
      </div>
    </header>
  )
}
