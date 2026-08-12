import { apiFetch } from './api'

/**
 * Cliente de work products + memoria + proactividad (Etapa 6). Espejo de
 * backend/app/ai/work_products/models.py, memory/models.py y
 * proactivity/models.py - mismo criterio que agentInvestigations.ts: tipos
 * snake_case que reflejan exactamente el JSON que el backend ya emite
 * (Pydantic serializa con el nombre de campo tal cual, sin alias camelCase).
 */

// ── Memoria ──────────────────────────────────────────────────────────────

export interface MemoryRecallItem {
  kind: string
  ref_id: string
  label: string
  status: string
  occurred_at: string
  source: string
  related_investigation_ids: string[]
  evidence_ids: string[]
}

export interface MemoryRecalledPayload {
  queryEntity: string | null
  items: MemoryRecallItem[]
}

export type EntityMemoryStatus = 'new' | 'ongoing' | 'worsening' | 'improving' | 'resolved'

export interface WorkingMemoryEntity {
  entity_id: string
  entity: string
  entity_type: string
  company_id: string | null
  site_id: string | null
  shift: string | null
  current_issue: string
  status: EntityMemoryStatus
  first_detected_at: string
  last_verified_at: string
  related_investigation_ids: string[]
  related_alert_ids: string[]
  related_watch_ids: string[]
  last_metric_value: number | null
  last_metric_label: string | null
  created_by: string | null
}

export type EpisodeType = 'investigation' | 'incident' | 'report' | 'task' | 'handover'

export interface OperationalEpisode {
  episode_id: string
  episode_type: EpisodeType
  company_id: string | null
  site_id: string | null
  title: string
  summary: string
  entity_ids: string[]
  evidence_ids: string[]
  investigation_ids: string[]
  outcome: string | null
  human_decision: string | null
  started_at: string
  ended_at: string | null
  created_by: string
}

export interface MemorySummary {
  active_entities: WorkingMemoryEntity[]
  recent_investigations: OperationalEpisode[]
}

// ── Proactividad ─────────────────────────────────────────────────────────

export type QuietMode = 'normal' | 'visual_only' | 'quiet' | 'critical_only'
export type ProactiveSeverity = 'informational' | 'warning' | 'high' | 'critical'
export type WatchStatus = 'active' | 'triggered' | 'expired' | 'cancelled'

export interface AgentWatch {
  watch_id: string
  user_id: string
  company_id: string | null
  site_id: string | null
  entity_ids: string[]
  entity_label: string | null
  metric: string
  condition: 'above' | 'below' | 'stale'
  threshold: number | null
  baseline_reference: string | null
  source_investigation_id: string | null
  created_at: string
  expires_at: string | null
  status: WatchStatus
  triggered_at: string | null
}

export interface ProactiveAgentEvent {
  proactive_event_id: string
  event_type: string
  severity: ProactiveSeverity
  title: string
  summary: string
  entity_ids: string[]
  evidence_ids: string[]
  source_event_ids: string[]
  watch_id: string | null
  trigger_id: string | null
  company_id: string | null
  site_id: string | null
  user_id: string | null
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'dismissed'
  fingerprint: string | null
  created_at: string
}

// ── Work products ────────────────────────────────────────────────────────

export type ReportType =
  | 'SHIFT_REPORT' | 'INVESTIGATION_REPORT' | 'PRODUCTION_REPORT'
  | 'FLEET_REPORT' | 'BREAKDOWN_REPORT' | 'EXECUTIVE_SUMMARY'
export type WorkProductStatus = 'draft' | 'review' | 'approved' | 'rejected'
export type Audience = 'dispatcher' | 'supervisor' | 'manager' | 'executive'

export interface ReportScope {
  shift: string | null
  date_range: { from: string; to: string } | null
  equipment_ids: string[]
  audience: Audience
}

export interface ReportSection {
  section_id: string
  title: string
  content: string
  evidence_ids: string[]
}

export interface ReportTable {
  table_id: string
  title: string
  question: string
  columns: string[]
  rows: Array<Record<string, string | number | null>>
  evidence_ids: string[]
}

export interface ReportChart {
  chart_id: string
  title: string
  question: string
  chart_type: 'bar' | 'line' | 'area'
  x_field: string
  y_fields: string[]
  data: Array<Record<string, string | number | null>>
  evidence_ids: string[]
}

export interface ReportQualityGate {
  passed: boolean
  total_score: number
  numerical_consistency: number
  errors: string[]
  warnings: string[]
}

export interface ReportDraft {
  report_id: string
  report_type: ReportType
  title: string
  scope: ReportScope
  status: WorkProductStatus
  sections: ReportSection[]
  tables: ReportTable[]
  charts: ReportChart[]
  evidence_ids: string[]
  investigation_ids: string[]
  company_id: string | null
  site_id: string | null
  generated_by: string
  generated_at: string
  updated_at: string
  version: number
  change_log: string[]
  conceptual_diff: string[]
  quality_gate: ReportQualityGate
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  requires_human_approval: true
  decision_authority: 'human'
}

export interface HandoverSection {
  section_id: string
  title: string
  content: string
}

export interface ShiftHandoverDraft {
  handover_id: string
  title: string
  shift: string | null
  status: WorkProductStatus
  sections: HandoverSection[]
  pending_for_next_shift: string[]
  resolved_this_shift: string[]
  investigation_ids: string[]
  task_ids: string[]
  watch_ids: string[]
  data_quality_notes: string[]
  company_id: string | null
  site_id: string | null
  generated_by: string
  generated_at: string
  version: number
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  requires_human_approval: true
  decision_authority: 'human'
}

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'

export interface TaskDraft {
  task_id: string
  title: string
  description: string
  reason: string
  priority_suggested: TaskPriority
  responsible_suggested: string | null
  entity_ids: string[]
  evidence_ids: string[]
  investigation_id: string | null
  finding_ids: string[]
  hypothesis_ids: string[]
  due_at: string | null
  status: TaskStatus
  company_id: string | null
  site_id: string | null
  created_by: string
  created_at: string
  approved_by: string | null
  rejection_reason: string | null
  requires_human_approval: true
  decision_authority: 'human'
}

export interface WorkProductReadyPayload {
  productType: 'report' | 'handover' | 'task' | 'pending_work_summary'
  id?: string
  report?: ReportDraft
  handover?: ShiftHandoverDraft
  task?: TaskDraft
  tasks?: TaskDraft[]
  watches?: AgentWatch[]
}

const BASE = '/api/ai-agent/work-products'

export const workProductsApi = {
  memorySummary: (limit = 10) => apiFetch<MemorySummary>(`${BASE}/memory-summary?limit=${limit}`),

  listReports: (statusFilter?: string) =>
    apiFetch<ReportDraft[]>(`${BASE}/reports${statusFilter ? `?status_filter=${statusFilter}` : ''}`),
  getReport: (reportId: string, version?: number) =>
    apiFetch<ReportDraft>(`${BASE}/reports/${encodeURIComponent(reportId)}${version ? `?version=${version}` : ''}`),
  getReportVersions: (reportId: string) =>
    apiFetch<ReportDraft[]>(`${BASE}/reports/${encodeURIComponent(reportId)}/versions`),
  approveReport: (reportId: string) =>
    apiFetch<ReportDraft>(`${BASE}/reports/${encodeURIComponent(reportId)}/approve`, { method: 'POST' }),
  rejectReport: (reportId: string, reason?: string) =>
    apiFetch<ReportDraft>(`${BASE}/reports/${encodeURIComponent(reportId)}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),

  listHandovers: () => apiFetch<ShiftHandoverDraft[]>(`${BASE}/handovers`),
  getHandover: (handoverId: string) => apiFetch<ShiftHandoverDraft>(`${BASE}/handovers/${encodeURIComponent(handoverId)}`),
  approveHandover: (handoverId: string) =>
    apiFetch<ShiftHandoverDraft>(`${BASE}/handovers/${encodeURIComponent(handoverId)}/approve`, { method: 'POST' }),
  rejectHandover: (handoverId: string, reason?: string) =>
    apiFetch<ShiftHandoverDraft>(`${BASE}/handovers/${encodeURIComponent(handoverId)}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),

  listTasks: (pendingOnly = true) => apiFetch<TaskDraft[]>(`${BASE}/tasks?pending_only=${pendingOnly}`),
  approveTask: (taskId: string) => apiFetch<TaskDraft>(`${BASE}/tasks/${encodeURIComponent(taskId)}/approve`, { method: 'POST' }),
  rejectTask: (taskId: string, reason?: string) =>
    apiFetch<TaskDraft>(`${BASE}/tasks/${encodeURIComponent(taskId)}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  completeTask: (taskId: string) => apiFetch<TaskDraft>(`${BASE}/tasks/${encodeURIComponent(taskId)}/complete`, { method: 'POST' }),

  listWatches: () => apiFetch<AgentWatch[]>(`${BASE}/watches`),
  cancelWatch: (watchId: string) => apiFetch<AgentWatch>(`${BASE}/watches/${encodeURIComponent(watchId)}/cancel`, { method: 'POST' }),

  listProactiveEvents: (statusFilter?: string) =>
    apiFetch<ProactiveAgentEvent[]>(`${BASE}/proactive-events${statusFilter ? `?status_filter=${statusFilter}` : ''}`),
  acknowledgeProactiveEvent: (id: string) =>
    apiFetch<ProactiveAgentEvent>(`${BASE}/proactive-events/${encodeURIComponent(id)}/acknowledge`, { method: 'POST' }),
  dismissProactiveEvent: (id: string) =>
    apiFetch<ProactiveAgentEvent>(`${BASE}/proactive-events/${encodeURIComponent(id)}/dismiss`, { method: 'POST' }),
}
