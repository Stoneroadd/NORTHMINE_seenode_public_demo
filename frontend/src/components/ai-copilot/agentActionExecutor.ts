import { sectionPaths } from '../layout/AppShell'
import type { SectionId } from '../layout/Sidebar'
import { useAppStore, type TurnoId } from '../../store'
import type { CopilotUIAction } from '../../lib/aiCopilot'

export interface ExecutedAction {
  action: CopilotUIAction
  label: string
  applied: boolean
}

const SECTION_LABELS: Partial<Record<SectionId, string>> = {
  cockpit: 'Decision Cockpit',
  dashboard: 'Resumen',
  turno: 'Turno Actual',
  produccion: 'Producción',
  rendimiento: 'Rendimiento',
  flota: 'Flota',
  carguio: 'Carguío',
  averias: 'Averías',
  analisis: 'Análisis Experto',
  aerea: 'Vista Aérea',
  alertas: 'Alertas',
  reportes: 'Reportes',
  admin: 'Admin',
  operationalMap3d: 'Mapa Operacional 3D',
}

function isSectionId(value: string): value is SectionId {
  return value in sectionPaths
}

function navigateToSection(section: SectionId): boolean {
  const path = sectionPaths[section]
  if (!path) return false
  if (window.location.pathname !== path) {
    window.history.pushState(null, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
  return true
}

function normalizeShift(value: string): TurnoId | null {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'DIA') return 'DIA'
  if (normalized === 'NOCHE') return 'NOCHE'
  if (['TODOS', 'AMBOS', 'ACTUAL', ''].includes(normalized)) return 'AMBOS'
  return null
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

/**
 * Aplica una CopilotUIAction ya validada por el backend (navigation.py /
 * policies.py) contra el store y el router reales - nunca coordenadas de
 * mouse. Cada llamada devuelve si realmente se aplico, para que el overlay
 * de "Estado actuando" nunca afirme algo que no paso.
 */
export function applyAgentAction(action: CopilotUIAction): ExecutedAction {
  const store = useAppStore.getState()

  switch (action.action) {
    case 'navigate': {
      if (!isSectionId(action.route)) return { action, label: `Sección desconocida: ${action.route}`, applied: false }
      const applied = navigateToSection(action.route)
      return { action, label: `Abriendo ${SECTION_LABELS[action.route] ?? action.route}`, applied }
    }

    case 'set_filter': {
      if (action.filter_id === 'shift') {
        const shift = normalizeShift(action.value)
        if (!shift) return { action, label: `Turno no reconocido: ${action.value}`, applied: false }
        store.setFiltro({ turno: shift })
        return { action, label: `Aplicando turno ${shift}`, applied: true }
      }
      if (action.filter_id === 'start_date' || action.filter_id === 'end_date') {
        if (!isIsoDate(action.value)) return { action, label: 'Fecha invalida', applied: false }
        store.setFiltro(action.filter_id === 'start_date' ? { fechaDesde: action.value } : { fechaHasta: action.value })
        return { action, label: `Ajustando ${action.filter_id === 'start_date' ? 'fecha desde' : 'fecha hasta'} a ${action.value}`, applied: true }
      }
      // equipo
      store.setFiltro({ equipo: action.value })
      return { action, label: `Filtrando por equipo ${action.value}`, applied: true }
    }

    case 'clear_filter': {
      if (!action.filter_id) {
        store.resetFiltro()
        return { action, label: 'Limpiando filtros', applied: true }
      }
      if (action.filter_id === 'shift') store.setFiltro({ turno: 'AMBOS' })
      else if (action.filter_id === 'equipo') store.setFiltro({ equipo: undefined })
      else return { action, label: 'No se puede limpiar ese filtro individualmente', applied: false }
      return { action, label: `Limpiando filtro ${action.filter_id}`, applied: true }
    }

    case 'select_entity': {
      store.setFiltro({ equipo: action.entity_id })
      const targetSection: SectionId = action.entity_type === 'alert' ? 'alertas' : 'flota'
      navigateToSection(targetSection)
      return { action, label: `Abriendo ${action.entity_type} ${action.entity_id}`, applied: true }
    }

    case 'focus_widget': {
      const element =
        document.getElementById(action.widget_id) ?? document.querySelector(`[data-widget-id="${action.widget_id}"]`)
      if (!element) return { action, label: `No se encontro el panel ${action.widget_id}`, applied: false }
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.classList.add('ai-agent-highlight')
      window.setTimeout(() => element.classList.remove('ai-agent-highlight'), 1600)
      return { action, label: `Enfocando ${action.widget_id}`, applied: true }
    }

    default:
      return { action, label: 'Acción no reconocida', applied: false }
  }
}
