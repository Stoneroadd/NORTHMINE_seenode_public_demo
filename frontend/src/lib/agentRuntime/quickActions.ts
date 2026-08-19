export type StructuredIntentId =
  | 'ANALYZE_SHIFT' | 'INVESTIGATE_PRODUCTION_DROP' | 'WHAT_CHANGED' | 'FIND_DEVIATIONS'
  | 'EXECUTIVE_SUMMARY' | 'PREPARE_REPORT' | 'SHIFT_HANDOVER' | 'CRITICAL_EQUIPMENT'
  | 'PRODUCTION_IMPACT' | 'COMPARE_SHIFT' | 'FIND_WORST_HOUR' | 'ANALYZE_LOADING'
  | 'ANALYZE_CYCLE' | 'NAVIGATE_MODULE' | 'CREATE_WATCH'

export interface AgentQuickAction {
  id: string
  label: string
  intent: StructuredIntentId
  modules?: string[]
}

export const GLOBAL_QUICK_ACTIONS: AgentQuickAction[] = [
  { id: 'analyze-shift', label: 'Analizar turno', intent: 'ANALYZE_SHIFT' },
  { id: 'what-changed', label: '¿Qué cambió?', intent: 'WHAT_CHANGED' },
  { id: 'deviations', label: 'Buscar desviaciones', intent: 'FIND_DEVIATIONS' },
  { id: 'executive', label: 'Resumen ejecutivo', intent: 'EXECUTIVE_SUMMARY' },
  { id: 'report', label: 'Preparar reporte', intent: 'PREPARE_REPORT' },
  { id: 'handover', label: 'Cambio de turno', intent: 'SHIFT_HANDOVER' },
  { id: 'critical', label: 'Equipos críticos', intent: 'CRITICAL_EQUIPMENT' },
  { id: 'impact', label: 'Impacto en producción', intent: 'PRODUCTION_IMPACT' },
]

export const CONTEXT_QUICK_ACTIONS: AgentQuickAction[] = [
  { id: 'production-why', label: '¿Por qué bajó?', intent: 'INVESTIGATE_PRODUCTION_DROP', modules: ['produccion', 'dashboard', 'cockpit'] },
  { id: 'production-compare', label: 'Comparar turno', intent: 'COMPARE_SHIFT', modules: ['produccion', 'dashboard', 'cockpit'] },
  { id: 'production-worst-hour', label: 'Encontrar peor hora', intent: 'FIND_WORST_HOUR', modules: ['produccion'] },
  { id: 'loading', label: 'Analizar carguío', intent: 'ANALYZE_LOADING', modules: ['carguio'] },
  { id: 'cycle', label: 'Mayor demora', intent: 'ANALYZE_CYCLE', modules: ['flota', 'rendimiento'] },
  { id: 'fleet-critical', label: 'Equipos críticos', intent: 'CRITICAL_EQUIPMENT', modules: ['flota', 'averias', 'aerea'] },
]

export function moduleFromPath(pathname: string): string {
  return pathname.replace(/^\//, '').replace('resumen', 'dashboard') || 'cockpit'
}

export function actionsForModule(moduleId: string, limit = 5): AgentQuickAction[] {
  const contextual = CONTEXT_QUICK_ACTIONS.filter((item) => item.modules?.includes(moduleId))
  return [...contextual, ...GLOBAL_QUICK_ACTIONS].filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index).slice(0, limit)
}
