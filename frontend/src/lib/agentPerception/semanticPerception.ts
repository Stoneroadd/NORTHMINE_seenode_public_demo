import { useAppStore } from '../../store'
import { moduleForRoute } from '../agentRegistry/modules'
import { agentWidgetRegistry } from '../agentRegistry/registry'
import type { AgentFilterId } from '../agentRegistry/types'
import type { PerceivedAlert, PerceivedWidget, SemanticPerceptionSnapshot } from './types'

/**
 * Nivel 1 de percepcion (Etapa 5, seccion 4 del brief): estado semantico
 * completo de la aplicacion, siempre disponible, sin capturar nada. Es una
 * extension de `buildAgentApplicationContext` (Etapa 2) - reusa el mismo
 * store/registry, agrega `visibleWidgets` con `semanticSummary`/frescura/
 * calidad por widget (antes solo se exponian KPIs sueltos) y `visibleAlerts`.
 */
export function buildSemanticPerceptionSnapshot(): SemanticPerceptionSnapshot {
  const state = useAppStore.getState()
  const route = window.location.pathname
  const module = moduleForRoute(route)
  const moduleId = module?.id ?? null

  const activeFilters: Partial<Record<AgentFilterId, unknown>> = {}
  if (state.filtro.turno) activeFilters.shift = state.filtro.turno
  if (state.filtro.fechaDesde) activeFilters.start_date = state.filtro.fechaDesde
  if (state.filtro.fechaHasta) activeFilters.end_date = state.filtro.fechaHasta
  if (state.filtro.equipo) activeFilters.equipo = state.filtro.equipo

  const widgetIds = moduleId ? agentWidgetRegistry.listForModule(moduleId).map((w) => w.id) : []
  const visibleWidgets: PerceivedWidget[] = widgetIds
    .map((id) => agentWidgetRegistry.perceivedWidget(id))
    .filter((widget): widget is PerceivedWidget => widget != null)

  const visibleAlerts: PerceivedAlert[] = agentWidgetRegistry.currentAlerts()

  return {
    route,
    moduleId,
    shift: state.filtro.turno ?? null,
    dateRange:
      state.filtro.fechaDesde && state.filtro.fechaHasta
        ? { from: state.filtro.fechaDesde, to: state.filtro.fechaHasta }
        : null,
    activeFilters,
    selectedEntities: state.filtro.equipo ? [{ type: 'equipment', id: state.filtro.equipo }] : [],
    focusedWidgetId: agentWidgetRegistry.getFocusedWidget(),
    visibleWidgets,
    visibleAlerts,
    activeDrawer: agentWidgetRegistry.getActiveDrawer(),
    activeModal: agentWidgetRegistry.getActiveModal(),
    userRole: state.usuario?.rol ?? '',
  }
}
