// ── Contrato compartido con el Agent Runtime (Etapa 3/4) ────────────────────
// El chat sincronico "Fase B" que originalmente definia estos tipos (backend
// app/ai/schemas.py, app/ai/orchestrator.py, app/ai/router.py) se retiro en
// C9 por 0 consumidores reales - el runtime WS (Etapa 6) lo reemplazo por
// completo. Estos dos tipos sobreviven porque siguen siendo contrato vivo:
// CopilotContext lo usan AgentWorkspace.tsx/AgentPresence.tsx, CopilotUIAction
// lo usan agentRegistry/capabilityActions.ts y agentActionExecutor.ts para
// ejecutar los pasos ui_action que el Agent Runtime si sigue emitiendo hoy.

export interface CopilotContext {
  section?: string | null
  mine?: string | null
  shift?: string | null
  selected_date?: string | null
  filters?: Record<string, string>
  route?: string | null
  active_section?: string | null
  selected_equipment_ids?: string[]
  focused_widget?: string | null
  visible_kpis?: string[]
  visible_alerts?: string[]
  permissions?: string[]
}

export interface NavigateUIAction {
  action: 'navigate'
  route: string
}

export interface SetFilterUIAction {
  action: 'set_filter'
  filter_id: 'shift' | 'start_date' | 'end_date' | 'equipo'
  value: string
}

export interface ClearFilterUIAction {
  action: 'clear_filter'
  filter_id?: 'shift' | 'start_date' | 'end_date' | 'equipo' | null
}

export type CopilotEntityType = 'equipment' | 'loading_unit' | 'alert' | 'report' | 'task' | 'operator' | 'breakdown'

export interface SelectEntityUIAction {
  action: 'select_entity'
  entity_type: CopilotEntityType
  entity_id: string
}

export interface OpenEntityUIAction {
  action: 'open_entity'
  entity_type: CopilotEntityType
  entity_id: string
}

export interface FocusWidgetUIAction {
  action: 'focus_widget'
  widget_id: string
}

export type CopilotUIAction =
  | NavigateUIAction
  | SetFilterUIAction
  | ClearFilterUIAction
  | SelectEntityUIAction
  | OpenEntityUIAction
  | FocusWidgetUIAction
