import type { SectionId } from '../appRoutes'

/**
 * Tipos del Agent UI Registry (Etapa 2). Espejo deliberado y acotado del
 * contrato pedido en el brief, adaptado a como NORTHMINE realmente esta
 * construido:
 *
 * - No hay filtros por-widget con closures propias: existe UN store global
 *   (useAppStore.filtro: turno/fechaDesde/fechaHasta/equipo) que todas las
 *   paginas comparten. Por eso AgentFilterManifest es declarativo (id/label/
 *   tipo/valores permitidos) y la aplicacion real vive en un solo lugar
 *   (agentActionExecutor.ts), no en una funcion `apply` por filtro - pedirle
 *   codigo al modelo o a cada widget para esto seria una abstraccion sin
 *   uso real en esta base de codigo.
 * - Las rutas viven en appRoutes.ts. El registro conserva IDs semanticos del
 *   agente, pero consume el mismo contrato que App, AppShell y Sidebar.
 */

export type AgentModuleId =
  | SectionId
  | 'prediccion'
  | 'simulador'
  | 'comparativa'
  | 'operatorRanking'
  | 'adminSistema'
  | 'adminUsers'
  | 'adminDemoAccess'
  | 'adminAuditoria'

export type AgentModuleCategory =
  | 'operacional'
  | 'analitico'
  | 'predictivo'
  | 'geoespacial'
  | 'administrativo'

export type AgentModuleAgentAccess =
  | 'read_only'
  | 'requires_approval'
  | 'unavailable'

export type AgentFilterId = 'shift' | 'start_date' | 'end_date' | 'equipo'

export type AgentFilterType =
  | 'date' | 'date-range' | 'shift' | 'equipment' | 'equipment-type'
  | 'loading-unit' | 'origin' | 'destination' | 'severity' | 'status' | 'custom'

export interface AgentFilterManifest {
  id: AgentFilterId
  label: string
  type: AgentFilterType
  allowedValues?: readonly string[]
}

export type AgentWidgetType =
  | 'kpi' | 'chart' | 'table' | 'map' | 'canvas' | 'filter' | 'alert-list' | 'form' | 'panel'

export type AgentActionType =
  | 'navigate' | 'open_section' | 'set_filter' | 'clear_filter'
  | 'select_entity' | 'open_entity' | 'focus_widget' | 'explain_widget' | 'reset_view'
  | 'highlight_series' | 'highlight_range' | 'highlight_point' | 'compare_series' | 'focus_anomaly'
  | 'clear_highlight' | 'focus_row' | 'highlight_row' | 'sort_by' | 'apply_filter'
  | 'focus_entity' | 'highlight_entity' | 'focus_route' | 'highlight_area' | 'fit_bounds'

export type AgentGuidanceEffect = 'glow' | 'pulse' | 'spotlight' | 'sweep' | 'highlight'
export type AgentGuidanceState = 'targeting' | 'executing' | 'confirmed' | 'failed'

export interface AgentGuidanceManifest {
  preferredEffect: AgentGuidanceEffect
  canHighlightSeries?: boolean
  canHighlightPoint?: boolean
  canHighlightRange?: boolean
  canHighlightRow?: boolean
  canHighlightEntity?: boolean
}

export interface AgentWidgetSnapshot {
  widgetId: string
  type: AgentWidgetType
  label: string
  updatedAt: string
  [key: string]: unknown
}

export interface AgentWidgetManifest {
  id: string
  moduleId: AgentModuleId
  sectionId?: string
  type: AgentWidgetType
  label: string
  description: string
  supportedActions: AgentActionType[]
  agentGuidance?: AgentGuidanceManifest
  getSnapshot?: () => AgentWidgetSnapshot
  focus?: () => void
  performSemanticAction?: (action: AgentActionType, args?: Record<string, unknown>) => Promise<boolean> | boolean
}

// ── Entidades navegables (Etapa 2.5) ─────────────────────────────────────

export type AgentEntityType = 'equipment' | 'loading_unit' | 'route' | 'alert' | 'report' | 'task' | 'operator' | 'breakdown'
export type AgentEntityAction = 'select' | 'open' | 'focus' | 'compare' | 'explain'

export interface AgentEntityManifest {
  type: AgentEntityType
  label: string
}

export interface AgentEntityDescriptor {
  entityType: AgentEntityType
  entityId: string
  label: string
  moduleId: AgentModuleId
  supportedActions: AgentEntityAction[]
}

export type AgentEntityActionStatus = 'completed' | 'not_found' | 'not_authorized' | 'unsupported' | 'failed' | 'cancelled'

export interface AgentEntityActionResult {
  status: AgentEntityActionStatus
  entityType: AgentEntityType
  entityId: string
  moduleId?: AgentModuleId
  message?: string
  contextUpdated: boolean
}

export interface AgentEntityHandler {
  select?: (entityId: string) => Promise<void> | void
  open?: (entityId: string) => Promise<void> | void
  /** Verifica sincronamente si la entidad quedo realmente abierta/seleccionada (para no marcar 'completed' sin confirmar). */
  isOpen?: (entityId: string) => boolean
}

export type AgentDataFreshnessStatus = 'current' | 'stale' | 'unknown'
export type AgentDataQualityStatus = 'high' | 'medium' | 'low' | 'unknown'

export interface AgentDataMetadata {
  source?: string
  updatedAt?: string
  freshnessStatus: AgentDataFreshnessStatus
  qualityStatus: AgentDataQualityStatus
}

export interface EntityResolutionResult {
  status: 'resolved' | 'ambiguous' | 'not_found'
  candidates: AgentEntityDescriptor[]
}

export interface AgentModuleManifest {
  id: AgentModuleId
  route: string
  label: string
  description: string
  category: AgentModuleCategory
  agentAccess: AgentModuleAgentAccess
  minRoles: string[] | 'any'
  filters: AgentFilterManifest[]
  entities: AgentEntityManifest[]
  supportedActions: AgentActionType[]
  instrumented: boolean
}

// ── Contexto y ejecucion ──────────────────────────────────────────────────

export interface AgentSelectedEntity {
  type: 'equipment' | 'loader' | 'alert'
  id: string
}

export interface AgentVisibleKpi {
  widgetId: string
  label: string
  value: number | string
  unit?: string
  status?: 'ok' | 'warning' | 'critical'
}

export interface AgentApplicationContext {
  route: string
  moduleId: AgentModuleId | null
  companyId?: string
  siteId?: string
  shift: string | null
  dateRange: { from: string; to: string } | null
  activeFilters: Partial<Record<AgentFilterId, unknown>>
  selectedEntities: AgentSelectedEntity[]
  focusedWidgetId: string | null
  visibleWidgetIds: string[]
  visibleKpis: AgentVisibleKpi[]
  userRole: string
  updatedAt: string
}

export type AgentActionExecutionStatus =
  | 'received' | 'validated' | 'executing' | 'completed' | 'rejected' | 'failed' | 'cancelled'

export interface AgentActionResult {
  actionId: string
  status: AgentActionExecutionStatus
  label: string
  error?: string
  /** ID real resuelto (p.ej. tras resolver un alias como "Pala 03" -> "EX-01")
   * para select_entity/open_entity - permite que el llamador (Etapa 4:
   * runtimeController) reporte el ID concreto de vuelta al backend. */
  resolvedEntityId?: string
}
