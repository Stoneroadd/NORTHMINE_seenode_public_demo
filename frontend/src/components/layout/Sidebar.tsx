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
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useAppStore, useT } from '../../store'
import { NorthmineLogo } from '../brand/NorthmineLogo'

export type SectionId =
  | 'cockpit'
  | 'operationalMap3d'
  | 'dashboard'
  | 'turno'
  | 'produccion'
  | 'rendimiento'
  | 'flota'
  | 'carguio'
  | 'averias'
  | 'analisis'
  | 'aerea'
  | 'alertas'
  | 'reportes'
  | 'admin'

interface SidebarItem {
  id: SectionId
  labelKey?: keyof ReturnType<typeof useT>['nav']
  label: string
  caption: string
  icon: LucideIcon
}

const items: SidebarItem[] = [
  { id: 'cockpit', label: 'Decision Cockpit', caption: 'Costos, riesgo y accion', icon: Gauge },
  { id: 'operationalMap3d', label: 'Mapa Operacional 3D', caption: 'Constelacion de datos', icon: Network },
  { id: 'dashboard', label: 'Resumen', caption: 'Executive overview', icon: LayoutDashboard },
  { id: 'turno', label: 'Turno Actual', caption: 'Ops en tiempo real', icon: Activity },
  { id: 'produccion', label: 'Producción', caption: 'Tonelaje y plan diario', icon: TrendingUp },
  { id: 'rendimiento', label: 'Rendimiento', caption: 'Horas y demoras', icon: BarChart3 },
  { id: 'flota', label: 'Flota', caption: 'CAEX — estado y ciclos', icon: Truck },
  { id: 'carguio', label: 'Carguío', caption: 'Palas y frentes activos', icon: Pickaxe },
  { id: 'averias', label: 'Averías', caption: 'Inactividad y fallas', icon: Wrench },
  { id: 'analisis', label: 'Análisis Experto', caption: 'Producción x mantención', icon: Brain },
  { id: 'aerea', label: 'Vista Aérea', caption: 'Ortomosaicos y estado', icon: Map },
  { id: 'alertas', label: 'Alertas', caption: 'Riesgo y seguridad', icon: ShieldAlert },
  { id: 'reportes', label: 'Reportes', caption: 'Turno y período', icon: ClipboardList },
  { id: 'admin', label: 'Admin', caption: 'Acceso y config', icon: Settings },
]

interface Props {
  active: SectionId
  onSelect: (section: SectionId) => void
  mobileOpen?: boolean
  onNavigate?: () => void
}

export function Sidebar({ active, onSelect, mobileOpen = false, onNavigate }: Props) {
  const t = useT()
  const usuario = useAppStore(s => s.usuario)
  const sidebarCollapsed = useAppStore(s => s.sidebarCollapsed)
  const toggleSidebar = useAppStore(s => s.toggleSidebar)
  const canViewOperatorRanking = usuario?.rol === 'admin' || usuario?.rol === 'supervisor'
  const visibleItems = items.filter((item) => item.id !== 'admin' || usuario?.rol === 'admin')

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
        <span className="nav-group-label">OPERACIÓN EN TIEMPO REAL</span>
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          const label = item.labelKey ? t.nav[item.labelKey] : item.label
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'is-active' : ''}`}
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
        })}

        <span className="nav-group-label" style={{ marginTop: 12 }}>ANÁLISIS</span>
        {canViewOperatorRanking && (
          <a className={`nav-item ${window.location.pathname === '/operator-ranking' ? 'is-active' : ''}`} href="/operator-ranking" title="Ranking Operadores: Productividad y demoras" onClick={onNavigate}>
            <span className="nav-active-line" />
            <span className="nav-icon"><Users size={18} /></span>
            <span>
              <span className="nav-label">Ranking Operadores</span>
              <span className="nav-caption">Productividad y demoras</span>
            </span>
          </a>
        )}
        <a className={`nav-item ${window.location.pathname === '/comparativa' ? 'is-active' : ''}`} href="/comparativa" title="Comparativa: Periodos y brechas" onClick={onNavigate}>
          <span className="nav-active-line" />
          <span className="nav-icon"><BarChart3 size={18} /></span>
          <span>
            <span className="nav-label">{t.nav.comparativa}</span>
            <span className="nav-caption">Periodos y brechas</span>
          </span>
        </a>
        <a className={`nav-item ${window.location.pathname === '/prediccion' ? 'is-active' : ''}`} href="/prediccion" title="Predicción ML: Proyección de turno" onClick={onNavigate}>
          <span className="nav-active-line" />
          <span className="nav-icon"><Brain size={18} /></span>
          <span>
            <span className="nav-label">Predicción ML</span>
            <span className="nav-caption">Proyección de turno</span>
          </span>
        </a>
        <a className={`nav-item ${window.location.pathname === '/simulador' ? 'is-active' : ''}`} href="/simulador" title="Simulador: Escenarios de meta" onClick={onNavigate}>
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
            <a className={`nav-item ${window.location.pathname === '/admin/users' ? 'is-active' : ''}`} href="/admin/users" title="Usuarios: Roles y acceso" onClick={onNavigate}>
              <span className="nav-active-line" />
              <span className="nav-icon"><Users size={18} /></span>
              <span>
                <span className="nav-label">Usuarios</span>
                <span className="nav-caption">Roles y acceso</span>
              </span>
            </a>
            <a className={`nav-item ${window.location.pathname === '/admin/sistema' ? 'is-active' : ''}`} href="/admin/sistema" title="Sistema: Salud y monitoreo" onClick={onNavigate}>
              <span className="nav-active-line" />
              <span className="nav-icon"><Server size={18} /></span>
              <span>
                <span className="nav-label">Sistema</span>
                <span className="nav-caption">Salud y monitoreo</span>
              </span>
            </a>
            <a className={`nav-item ${window.location.pathname === '/admin/auditoria' ? 'is-active' : ''}`} href="/admin/auditoria" title="Auditoría: Log de seguridad" onClick={onNavigate}>
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
