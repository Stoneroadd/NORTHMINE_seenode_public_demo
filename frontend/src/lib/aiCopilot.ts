import { apiFetch, ApiError } from './api'
import { useAppStore } from '../store'
import { settingsService } from '../services/settingsService'

const BASE_URL = settingsService.apiBaseUrl

// ── Tipos: espejo exacto de backend/app/ai/schemas.py ───────────────────────

export type ResponseType =
  | 'observation'
  | 'finding'
  | 'risk'
  | 'recommendation'
  | 'simulation'
  | 'draft'
  | 'pending_action'
  | 'information_insufficient'
  | 'error'

export type ConfidenceLevel = 'alta' | 'media' | 'baja' | 'insuficiente'
export type FreshnessStatus = 'current' | 'stale' | 'unknown'
export type TaskStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'completed'
export type ChartType =
  | 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'scatter' | 'heatmap' | 'gauge' | 'pareto' | 'table' | 'kpi_cards' | 'timeline'

export interface CopilotContext {
  section?: string | null
  mine?: string | null
  shift?: string | null
  selected_date?: string | null
  filters?: Record<string, string>
  // Percepcion Nivel 1 (estado semantico) - ver backend/app/ai/schemas.py::ChatContext.
  route?: string | null
  active_section?: string | null
  selected_equipment_ids?: string[]
  focused_widget?: string | null
  visible_kpis?: string[]
  visible_alerts?: string[]
  permissions?: string[]
}

// ── Acciones semanticas de UI - espejo de backend/app/ai/schemas.py::UIAction ─

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

export interface CopilotEvidence {
  source: string
  metric?: string | null
  period?: string | null
  value?: string | null
  detail: string
  tool?: string | null
  generated_at?: string | null
}

export interface CopilotConfidence {
  level: ConfidenceLevel
  reasons: string[]
}

export interface CopilotFreshness {
  last_updated_at?: string | null
  status: FreshnessStatus
  age_minutes?: number | null
}

export interface CopilotChartSpec {
  chart_type: ChartType
  title: string
  x_field?: string | null
  y_field?: string | null
  unit?: string | null
  data: Record<string, unknown>[]
  source_tool?: string | null
}

export interface CopilotTaskDraft {
  id: string
  title: string
  reason: string
  evidence: string[]
  priority: 'baja' | 'media' | 'alta'
  suggested_owner?: string | null
  status: TaskStatus
  linked_finding?: string | null
  created_by?: string | null
  created_at?: string | null
}

export interface CopilotToolExecution {
  name: string
  args: Record<string, unknown>
  status: 'ok' | 'error' | 'denied'
  duration_ms: number
  summary?: string | null
}

export interface CopilotResponse {
  message: string
  response_type: ResponseType
  facts: string[]
  calculations: string[]
  inferences: string[]
  recommendations: string[]
  evidence: CopilotEvidence[]
  chart_specs: CopilotChartSpec[]
  task_drafts: CopilotTaskDraft[]
  report_drafts: unknown[]
  ui_actions: CopilotUIAction[]
  confidence: CopilotConfidence
  data_freshness: CopilotFreshness
  requires_human_approval: boolean
  limitations: string[]
  tool_executions: CopilotToolExecution[]
  disclaimer: string
  degraded: boolean
  conversation_id: string
}

export type CopilotStreamEvent =
  | { type: 'status'; phase: string }
  | { type: 'tool_execution'; name: string; status: string; duration_ms: number; summary?: string | null }
  | { type: 'agent.action.proposed'; action: CopilotUIAction }
  | { type: 'token'; text: string }
  | { type: 'final'; response: CopilotResponse }

export interface CopilotStatus {
  ai_enabled: boolean
  available: boolean
  provider: string
  model: string | null
  message: string | null
  disclaimer: string | null
}

function authToken(): string | null {
  return useAppStore.getState().usuario?.token ?? null
}

/**
 * Streaming NDJSON del chat: cada linea es un CopilotStreamEvent. Usa fetch
 * nativo (no axios) porque necesita leer el body como ReadableStream mientras
 * llega - el backend ya resolvio la respuesta completa antes de emitir el
 * primer byte (ver backend/app/ai/router.py), asi que esto es una revelacion
 * progresiva de una respuesta ya validada, no streaming de tokens del modelo.
 */
export async function streamCopilotChat(
  payload: { conversation_id?: string | null; message: string; context: CopilotContext },
  handlers: { onEvent: (event: CopilotStreamEvent) => void; signal?: AbortSignal },
): Promise<CopilotResponse> {
  const token = authToken()
  const response = await fetch(`${BASE_URL}/api/ai-copilot/chat`, {
    method: 'POST',
    credentials: 'include',
    signal: handlers.signal,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok || !response.body) {
    let message = `HTTP ${response.status}`
    try {
      const data = await response.json()
      message = data?.detail?.message ?? data?.detail ?? message
    } catch {
      // sin body legible, se mantiene el mensaje generico
    }
    throw new ApiError(response.status, typeof message === 'string' ? message : `HTTP ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let final: CopilotResponse | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      const event = JSON.parse(line) as CopilotStreamEvent
      if (event.type === 'final') final = event.response
      handlers.onEvent(event)
    }
  }
  if (buffer.trim()) {
    const event = JSON.parse(buffer) as CopilotStreamEvent
    if (event.type === 'final') final = event.response
    handlers.onEvent(event)
  }

  if (!final) {
    throw new ApiError(0, 'El copiloto no entrego una respuesta final')
  }
  return final
}

export const copilotApi = {
  status: () => apiFetch<CopilotStatus>('/api/ai-copilot/status'),
  listTasks: (statusFilter?: TaskStatus) =>
    apiFetch<{ items: CopilotTaskDraft[]; count: number }>(
      `/api/ai-copilot/tasks${statusFilter ? `?status_filter=${encodeURIComponent(statusFilter)}` : ''}`,
    ),
  approveTask: (taskId: string, actorNote?: string) =>
    apiFetch<CopilotTaskDraft>(`/api/ai-copilot/tasks/${encodeURIComponent(taskId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ actor_note: actorNote ?? null }),
    }),
  rejectTask: (taskId: string, actorNote?: string) =>
    apiFetch<CopilotTaskDraft>(`/api/ai-copilot/tasks/${encodeURIComponent(taskId)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ actor_note: actorNote ?? null }),
    }),
  completeTask: (taskId: string, actorNote?: string) =>
    apiFetch<CopilotTaskDraft>(`/api/ai-copilot/tasks/${encodeURIComponent(taskId)}/complete`, {
      method: 'POST',
      body: JSON.stringify({ actor_note: actorNote ?? null }),
    }),
  sendFeedback: (payload: { message_id: string; rating: string; note?: string }) =>
    apiFetch<{ status: string }>('/api/ai-copilot/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
