import { useAppStore } from '../../store'
import { moduleForRoute } from './modules'
import { agentWidgetRegistry } from './registry'
import type { AgentApplicationContext, AgentFilterId, AgentVisibleKpi } from './types'

/**
 * Construye el AgentApplicationContext real a partir del store + registry +
 * ubicacion actual. No se envia "todo el estado de React" (seccion 7 del
 * brief) - solo lo que el agente necesita: filtros activos, entidad
 * seleccionada, widgets visibles con su resumen (no datasets completos).
 */
export function buildAgentApplicationContext(): AgentApplicationContext {
  const state = useAppStore.getState()
  const route = window.location.pathname
  const module = moduleForRoute(route)
  const moduleId = module?.id ?? null

  const activeFilters: Partial<Record<AgentFilterId, unknown>> = {}
  if (state.filtro.turno) activeFilters.shift = state.filtro.turno
  if (state.filtro.fechaDesde) activeFilters.start_date = state.filtro.fechaDesde
  if (state.filtro.fechaHasta) activeFilters.end_date = state.filtro.fechaHasta
  if (state.filtro.equipo) activeFilters.equipo = state.filtro.equipo

  const visibleWidgetIds = moduleId ? agentWidgetRegistry.visibleWidgetIds(moduleId) : []
  const visibleKpis: AgentVisibleKpi[] = visibleWidgetIds
    .map((id) => agentWidgetRegistry.snapshot(id))
    .filter((snapshot): snapshot is NonNullable<typeof snapshot> => snapshot != null && snapshot.type === 'kpi')
    .map((snapshot) => ({
      widgetId: snapshot.widgetId,
      label: snapshot.label,
      value: (snapshot.value as number | string) ?? '',
      unit: snapshot.unit as string | undefined,
      status: snapshot.status as AgentVisibleKpi['status'],
    }))

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
    visibleWidgetIds,
    visibleKpis,
    userRole: state.usuario?.rol ?? '',
    updatedAt: new Date().toISOString(),
  }
}
