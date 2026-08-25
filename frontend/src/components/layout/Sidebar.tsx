import {
  Activity,
  BarChart3,
  Brain,
  ClipboardList,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  LockKeyhole,
  Map,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Pickaxe,
  Server,
  Settings,
  ShieldAlert,
  Truck,
  TrendingUp,
  Users,
  Waypoints,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { MouseEvent } from 'react'
import { useAppStore, useT } from '../../store'
import { appPaths, type SectionId } from '../../lib/appRoutes'
import { NorthmineLogo } from '../brand/NorthmineLogo'

export type { SectionId } from '../../lib/appRoutes'

interface SidebarItem {
  id: SectionId
  labelKey?: keyof ReturnType<typeof useT>['nav']
  label: string
  caption: string
  icon: LucideIcon
}

// Orden por criticidad/departamento, no alfabético ni de implementación:
// 1) mando en vivo (lo primero que debe mirar cualquier turno), 2) produccion
// (el departamento que genera valor dia a dia), 3) analisis y planificacion
// (menos urgente, mas estrategico). Cada grupo tiene su propia etiqueta de
// navegacion mas abajo.
const COMMAND_ITEMS: SidebarItem[] = [
  { id: 'cockpit', label: 'Decision Cockpit', caption: 'Costos, riesgo y accion', icon: Gauge },
  { id: 'turno', label: 'Turno Actual', caption: 'Ops en tiempo real', icon: Activity },
  { id: 'alertas', label: 'Alertas', caption: 'Riesgo y seguridad', icon: ShieldAlert },
  { id: 'averias', label: 'Averías', caption: 'Inactividad y fallas', icon: Wrench },
]

const PRODUCTION_ITEMS: SidebarItem[] = [
  { id: 'produccion', label: 'Producción', caption: 'Tonelaje y plan diario', icon: TrendingUp },
  { id: 'flota', label: 'Flota', caption: 'CAEX — estado y ciclos', icon: Truck },
  { id: 'carguio', label: 'Carguío', caption: 'Palas y frentes activos', icon: Pickaxe },
  { id: 'rendimiento', label: 'Rendimiento', caption: 'Horas y demoras', icon: BarChart3 },
]

const PLANNING_ITEMS: SidebarItem[] = [
  { id: 'analisis', label: 'Análisis Experto', caption: 'Producción x mantención', icon: Brain },
  { id: 'operationalFlow', label: 'Operational Flow', caption: 'Impacto y propagación', icon: Waypoints },
  { id: 'operationalMap3d', label: 'Mapa Operacional 3D', caption: 'Constelacion de datos', icon: Network },
  { id: 'dashboard', label: 'Resumen', caption: 'Executive overview', icon: LayoutDashboard },
  { id: 'aerea', label: 'Vista Aérea', caption: 'Ortomosaicos y estado', icon: Map },
  { id: 'reportes', label: 'Reportes', caption: 'Turno y período', icon: ClipboardList },
]

const ADMIN_ITEM: SidebarItem = { id: 'admin', label: 'Admin', caption: 'Acceso y config', icon: Settings }

interface Props {
  active: SectionId
  onSelect: (section: SectionId) => void
  mobileOpen?: boolean
  onNavigate?: () => void
  activePath: string
  onPathSelect: (path: string) => void
}

export function Sidebar({ active, onSelect, mobileOpen = false, onNavigate, activePath, onPathSelect }: Props) {
  const t = useT()
  const usuario = useAppStore(s => s.usuario)
  const sidebarCollapsed = useAppStore(s => s.sidebarCollapsed)
  const toggleSidebar = useAppStore(s => s.toggleSidebar)
  const canViewOperatorRanking = usuario?.rol === 'admin' || usuario?.rol === 'supervisor'
  const handleInternalLink = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
    onNavigate?.()
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onPathSelect(path)
  }

  const renderNavButton = (item: SidebarItem) => {
    const Icon = item.icon
    const isActive = active === item.id
    const label = item.labelKey ? t.nav[item.labelKey] : item.label
    return (
      <button
        key={item.id}
        className={`nav-item ${isActive ? 'is-active' : ''}`}
        data-agent-guidance-target={`module:${item.id}`}
        type="button"
        title={`${label}: ${item.caption}`}
        onClick={() => {
          onNavigate?.()
          onSelect(item.id)
        }}
      >
        <span className="nav-active-line" />
        <span className="nav-icon"><Icon size={18} /></span>
        <span>
          <span className="nav-label">{label}</span>
          <span className="nav-caption">{item.caption}</span>
        </span>
      </button>
    )
  }

  return (
    <aside className={`sidebar ${mobileOpen ? 'is-mobile-open' : ''} ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
      <div className="brand-block">
        <div className="brand-mark">
          <NorthmineLogo variant="symbol" alt="" aria-hidden="true" />
        </div>
        <div className="brand-copy">
          <div className="brand-name">NORTHMINE</div>
          <div className="brand-subtitle">Mining Intelligence</div>
        </div>
      </div>

      <button
        type="button"
        className="sidebar-collapse-toggle"
        title={sidebarCollapsed ? 'Expandir navegación' : 'Colapsar navegación'}
        aria-label={sidebarCollapsed ? 'Expandir navegación' : 'Colapsar navegación'}
        aria-expanded={!sidebarCollapsed}
        aria-controls="sidebar-nav"
        onClick={toggleSidebar}
      >
        {sidebarCollapsed ? <PanelLeftOpen aria-hidden="true" size={18} /> : <PanelLeftClose aria-hidden="true" size={18} />}
        <span>{sidebarCollapsed ? 'Expandir' : 'Colapsar'}</span>
      </button>

      <nav className="sidebar-nav" id="sidebar-nav">
        <span className="nav-group-label">MANDO EN VIVO</span>
        {COMMAND_ITEMS.map(renderNavButton)}

        <span className="nav-group-label" style={{ marginTop: 12 }}>PRODUCCIÓN</span>
        {PRODUCTION_ITEMS.map(renderNavButton)}

        <span className="nav-group-label" style={{ marginTop: 12 }}>ANÁLISIS Y PLANIFICACIÓN</span>
        {PLANNING_ITEMS.map(renderNavButton)}

        <span className="nav-group-label" style={{ marginTop: 12 }}>ANÁLISIS</span>
        {canViewOperatorRanking && (
          <a className={`nav-item ${activePath === appPaths.operatorRanking ? 'is-active' : ''}`} href={appPaths.operatorRanking} title="Ranking Operadores: Productividad y demoras" onClick={(event) => handleInternalLink(event, appPaths.operatorRanking)}>
            <span className="nav-active-line" />
            <span className="nav-icon"><Users size={18} /></span>
            <span>
              <span className="nav-label">Ranking Operadores</span>
              <span className="nav-caption">Productividad y demoras</span>
            </span>
          </a>
        )}
        <a className={`nav-item ${activePath === appPaths.comparativa ? 'is-active' : ''}`} href={appPaths.comparativa} title="Comparativa: Periodos y brechas" onClick={(event) => handleInternalLink(event, appPaths.comparativa)}>
          <span className="nav-active-line" />
          <span className="nav-icon"><BarChart3 size={18} /></span>
          <span>
            <span className="nav-label">{t.nav.comparativa}</span>
            <span className="nav-caption">Periodos y brechas</span>
          </span>
        </a>
        <a className={`nav-item ${activePath === appPaths.prediccion ? 'is-active' : ''}`} href={appPaths.prediccion} title="Predicción ML: Proyección de turno" onClick={(event) => handleInternalLink(event, appPaths.prediccion)}>
          <span className="nav-active-line" />
          <span className="nav-icon"><Brain size={18} /></span>
          <span>
            <span className="nav-label">Predicción ML</span>
            <span className="nav-caption">Proyección de turno</span>
          </span>
        </a>
        <a className={`nav-item ${activePath === appPaths.simulador ? 'is-active' : ''}`} href={appPaths.simulador} title="Simulador: Escenarios de meta" onClick={(event) => handleInternalLink(event, appPaths.simulador)}>
          <span className="nav-active-line" />
          <span className="nav-icon"><FlaskConical size={18} /></span>
          <span>
            <span className="nav-label">Simulador</span>
            <span className="nav-caption">Escenarios de meta</span>
          </span>
        </a>

        {usuario?.rol === 'admin' && (
          <>
            <span className="nav-group-label" style={{ marginTop: 12 }}>HERRAMIENTAS</span>
            {renderNavButton(ADMIN_ITEM)}
            <a className={`nav-item ${activePath === appPaths.adminUsers ? 'is-active' : ''}`} href={appPaths.adminUsers} title="Usuarios: Roles y acceso" onClick={(event) => handleInternalLink(event, appPaths.adminUsers)}>
              <span className="nav-active-line" />
              <span className="nav-icon"><Users size={18} /></span>
              <span>
                <span className="nav-label">Usuarios</span>
                <span className="nav-caption">Roles y acceso</span>
              </span>
            </a>
            <a className={`nav-item ${activePath === appPaths.adminSistema ? 'is-active' : ''}`} href={appPaths.adminSistema} title="Sistema: Salud y monitoreo" onClick={(event) => handleInternalLink(event, appPaths.adminSistema)}>
              <span className="nav-active-line" />
              <span className="nav-icon"><Server size={18} /></span>
              <span>
                <span className="nav-label">Sistema</span>
                <span className="nav-caption">Salud y monitoreo</span>
              </span>
            </a>
            <a className={`nav-item ${activePath === appPaths.adminAuditoria ? 'is-active' : ''}`} href={appPaths.adminAuditoria} title="Auditoría: Log de seguridad" onClick={(event) => handleInternalLink(event, appPaths.adminAuditoria)}>
              <span className="nav-active-line" />
              <span className="nav-icon"><ShieldAlert size={18} /></span>
              <span>
                <span className="nav-label">Auditoría</span>
                <span className="nav-caption">Log de seguridad</span>
              </span>
            </a>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <LockKeyhole size={15} />
        <span>Command Center protegido</span>
      </div>
    </aside>
  )
}
