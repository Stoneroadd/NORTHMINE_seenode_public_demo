import type { CopilotUIAction } from '../aiCopilot'

/**
 * Mapa capability_id -> accion semantica de UI (Etapa 2 AgentActionExecutor).
 * Compartido entre el panel de investigacion de Etapa 3 y el Agent Runtime
 * de Etapa 4 - una sola fuente de verdad para no duplicar el mapeo.
 * 'select_equipment_entity' es el paso sintetico que runtime.py inyecta
 * cuando el usuario nombra un equipo explicito (seccion 10: ejemplo
 * "Resolver y seleccionar la Pala 03").
 */
export function actionForCapability(capabilityId: string, equipmentQuery: string | null): CopilotUIAction | null {
  switch (capabilityId) {
    case 'select_equipment_entity':
      return equipmentQuery ? { action: 'select_entity', entity_type: 'equipment', entity_id: equipmentQuery } : null
    case 'navigate_production':
      return { action: 'navigate', route: 'produccion' }
    case 'focus_production_chart':
      return { action: 'focus_widget', widget_id: 'production-hourly-chart' }
    case 'navigate_loading':
      return { action: 'navigate', route: 'carguio' }
    case 'focus_loading_chart':
      return { action: 'focus_widget', widget_id: 'loading-rate-chart' }
    case 'navigate_fleet':
      return { action: 'navigate', route: 'flota' }
    case 'open_affected_equipment':
      return equipmentQuery ? { action: 'open_entity', entity_type: 'equipment', entity_id: equipmentQuery } : null
    case 'navigate_breakdowns':
      return { action: 'navigate', route: 'averias' }
    case 'focus_breakdowns_list':
      return { action: 'focus_widget', widget_id: 'breakdown-active-list' }
    case 'navigate_comparison':
      return { action: 'navigate', route: 'comparativa' }
    case 'navigate_direct':
      return null // resuelto directamente por moduleId en el llamador (comando "Abre X")
    default:
      return null
  }
}
