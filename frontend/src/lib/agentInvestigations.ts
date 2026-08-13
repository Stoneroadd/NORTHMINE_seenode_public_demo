import { apiFetch, ApiError } from './api'
import { useAppStore } from '../store'
import { settingsService } from '../services/settingsService'

const BASE_URL = settingsService.apiBaseUrl

/**
 * Cliente del motor de investigacion Planner-Executor-Verifier (Etapa 3).
 * Espejo exacto de backend/app/ai/investigation_schemas.py e
 * investigation_router.py - mismo patron NDJSON que lib/aiCopilot.ts.
 */

// ── Alcance cerrado: 4 tipos, nada mas (seccion 4 del brief) ────────────────
export const INVESTIGATION_TYPES = [
  'production_drop',
  'cycle_time_increase',
  'loading_unit_underperformance',
  'shift_summary',
] as const
export type InvestigationType = (typeof INVESTIGATION_TYPES)[number]

export const INVESTIGATION_TYPE_LABELS: Record<InvestigationType, string> = {
  production_drop: 'Caída de producción',
  cycle_time_increase: 'Aumento de tiempo de ciclo',
  loading_unit_underperformance: 'Bajo rendimiento de unidad de carguío',
  shift_summary: 'Resumen de turno',
}

export type StepKind = 'tool' | 'ui_action'
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled' | 'rejected'
export type StepRequirement = 'required' | 'optional' | 'alternative_available'
export type InvestigationStatus = 'planned' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface PlanStep {
  step_id: string
  kind: StepKind
  capability_id: string
  description: string
  status: StepStatus
  requirement: StepRequirement
  started_at?: string | null
  completed_at?: string | null
  duration_ms?: number | null
  error?: string | null
  evidence_ids: string[]
}

export interface InvestigationScope {
  shift?: string | null
  site_id?: string | null
  date_range?: { from: string; to: string } | null
  equipment_ids: string[]
}

export interface InvestigationPlan {
  investigation_id: string
  type: InvestigationType
  goal: string
  scope: InvestigationScope
  status: InvestigationStatus
  steps: PlanStep[]
  missing_capabilities: string[]
  created_at: string
}

export interface EvidenceItem {
  evidence_id: string
  source_type: string
  capability_id: string
  label: string
  value: unknown
  unit?: string | null
  entity_ids: string[]
  source?: string | null
  updated_at?: string | null
  freshness_status: 'current' | 'stale' | 'unknown'
  quality_status: 'high' | 'medium' | 'low' | 'unknown'
  verification_status: 'verified' | 'partial' | 'rejected' | 'insufficient_data' | 'pending'
}

export interface VerificationResult {
  status: 'verified' | 'partial' | 'rejected' | 'insufficient_data'
  reasons: string[]
  accepted_evidence_ids: string[]
  rejected_evidence_ids: string[]
  limitations: string[]
}

export type HypothesisStatus = 'unsupported' | 'possible' | 'probable' | 'insufficient_data'

export interface OperationalHypothesis {
  hypothesis_id: string
  label: string
  status: HypothesisStatus
  supporting_evidence_ids: string[]
  contradicting_evidence_ids: string[]
  /** Desempate heurístico interno documentado por regla, NUNCA una
   * probabilidad estadística — `status` es lo que expresa certeza real. */
  score: number | null
}

/** Confianza de una InvestigationConclusion — derivada 100% de
 * VerificationResult.status y de si hay una hipótesis 'probable', nunca del
 * `score` heurístico de una hipótesis individual. Dominio distinto de
 * CopilotConfidence (aiCopilot.ts), que resume la confianza de un turno de
 * chat con otra agregación y otro vocabulario de niveles. */
export interface InvestigationConfidence {
  level: 'low' | 'medium' | 'high'
  calculated_by: 'backend_rules'
}

export interface InvestigationConclusion {
  summary: string
  facts: string[]
  probable_causes: string[]
  contradictions: string[]
  recommendations: string[]
  limitations: string[]
  confidence: InvestigationConfidence
  decision_authority: 'human'
  requires_human_approval: true
}

export interface InvestigationResult {
  plan: InvestigationPlan
  evidence: EvidenceItem[]
  verification: VerificationResult
  hypotheses: OperationalHypothesis[]
  conclusion: InvestigationConclusion | null
}

export interface CreateInvestigationRequest {
  type: InvestigationType
  shift?: string | null
  equipment_id?: string | null
  start_date?: string | null
  end_date?: string | null
}

export type InvestigationStreamEvent =
  | { type: 'investigation.started'; investigationId: string; investigationType: string; goal: string }
  | { type: 'investigation.plan'; investigationId: string; plan: InvestigationPlan }
  | { type: 'step.started'; investigationId: string; stepId: string; capabilityId: string }
  | { type: 'tool.completed' | 'tool.failed'; investigationId: string; stepId: string; capabilityId: string; status: StepStatus; durationMs: number | null; error: string | null }
  | { type: 'verification.started'; investigationId: string }
  | { type: 'verification.completed'; investigationId: string; verification: VerificationResult }
  | { type: 'ui_action.requested'; investigationId: string; stepId: string; capabilityId: string; moduleId: string | null; widgetId: string | null }
  | { type: 'investigation.completed'; investigationId: string; result: InvestigationResult }
  | { type: 'investigation.failed'; investigationId: string; message: string }

function authToken(): string | null {
  return useAppStore.getState().usuario?.token ?? null
}

async function streamNdjson(
  path: string,
  init: RequestInit,
  onEvent: (event: InvestigationStreamEvent) => void,
  signal?: AbortSignal,
): Promise<InvestigationResult | null> {
  const token = authToken()
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    signal,
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok || !response.body) {
    let message = `HTTP ${response.status}`
    try {
      const data = await response.json()
      message = data?.detail ?? message
    } catch {
      // sin body legible, se mantiene el mensaje generico
    }
    throw new ApiError(response.status, typeof message === 'string' ? message : `HTTP ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let final: InvestigationResult | null = null

  const consume = (line: string) => {
    if (!line.trim()) return
    const event = JSON.parse(line) as InvestigationStreamEvent
    if (event.type === 'investigation.completed') final = event.result
    onEvent(event)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) consume(line)
  }
  if (buffer.trim()) consume(buffer)

  return final
}

/** Modo Guiado (default, seccion 16): construye el plan SIN ejecutar nada. */
export function planInvestigation(payload: CreateInvestigationRequest): Promise<{ plan: InvestigationPlan; investigationType: InvestigationType }> {
  return apiFetch('/api/ai-copilot/investigations/plan', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** Segundo paso del modo Guiado: ejecuta un plan ya construido y confirmado. */
export function streamExecuteInvestigation(
  investigationId: string,
  handlers: { onEvent: (event: InvestigationStreamEvent) => void; signal?: AbortSignal },
): Promise<InvestigationResult | null> {
  return streamNdjson(
    `/api/ai-copilot/investigations/${encodeURIComponent(investigationId)}/execute`,
    { method: 'POST' },
    handlers.onEvent,
    handlers.signal,
  )
}

/** Modo Automatico de solo lectura: plan + ejecucion en una sola llamada. */
export function streamAutomaticInvestigation(
  payload: CreateInvestigationRequest,
  handlers: { onEvent: (event: InvestigationStreamEvent) => void; signal?: AbortSignal },
): Promise<InvestigationResult | null> {
  return streamNdjson('/api/ai-copilot/investigations', { method: 'POST', body: JSON.stringify(payload) }, handlers.onEvent, handlers.signal)
}

export const investigationsApi = {
  get: (investigationId: string) =>
    apiFetch<{ result: InvestigationResult }>(`/api/ai-copilot/investigations/${encodeURIComponent(investigationId)}`),
  list: () =>
    apiFetch<{ items: Array<{ id: string; type: InvestigationType; status: InvestigationStatus; created_at: string }>; count: number }>(
      '/api/ai-copilot/investigations',
    ),
  reportUiStep: (investigationId: string, stepId: string, payload: { status: string; context_updated: boolean; label?: string }) =>
    apiFetch<{ status: string }>(
      `/api/ai-copilot/investigations/${encodeURIComponent(investigationId)}/ui-steps/${encodeURIComponent(stepId)}/report`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),
}
