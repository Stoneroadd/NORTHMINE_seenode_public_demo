export type OperatorRiskLevel = 'EXCELENTE' | 'BUENO' | 'SEGUIMIENTO' | 'RIESGO_ALTO' | 'CRITICO'

export interface OperatorRecurrence {
  bathroom_over_threshold_shifts: number
  lunch_over_threshold_shifts: number
  shift_change_over_threshold_shifts: number
  no_assignment_over_threshold_shifts: number
  high_delay_shifts: number
  pattern_level: string
}

export interface OperatorRankingItem {
  rank: number
  operator_id: string
  operator_name: string
  frequent_equipment_id: string
  score_global: number
  productividad_score: number
  disponibilidad_score: number
  utilizacion_score: number
  control_demoras_score: number
  seguridad_score: number
  toneladas_reales: number
  toneladas_esperadas: number
  ciclos: number
  tph: number
  disponibilidad_percent: number
  utilizacion_percent: number
  total_delay_minutes: number
  manageable_delay_minutes: number
  system_delay_minutes: number
  bathroom_minutes: number
  lunch_minutes: number
  shift_change_minutes: number
  fueling_minutes: number
  no_assignment_minutes: number
  lost_tons_estimated: number
  recurrence_level: string
  main_loss_cause: string
  risk_level: OperatorRiskLevel | string
  recommendation: string
  recurrence: OperatorRecurrence
  manageable_delay_breakdown?: Record<string, number>
  system_delay_breakdown?: Record<string, number>
}

export interface CalculationTraceStep {
  component: string
  formula: string
  raw_value: number
  normalized_score: number
  weight: number
  weighted_points: number
}

export interface OperatorRankingMethodology {
  source: string
  data_mode: string
  score_formula: {
    text: string
    components: Record<string, string>
  }
  weights: Record<string, number>
  manageable_delays: Array<{ code: string; name: string; category: string; rule: string }>
  system_delays: Array<{ category: string; rule: string }>
  thresholds: Record<string, unknown>
  interpretation: Record<string, string>
  responsible_use_note: string
}

export interface OperatorRankingThresholds {
  source: string
  data_mode: string
  thresholds: Record<string, unknown>
  bathroom: Record<string, unknown>
  lunch: Record<string, unknown>
  shift_change: Record<string, unknown>
  no_assignment: Record<string, unknown>
  fueling: Record<string, unknown>
}

export interface OperatorRankingResponsibleUse {
  source: string
  data_mode: string
  title: string
  responsible_use_note: string
  principles: string[]
}

export interface OperatorRankingSummary {
  best_operator: string
  best_score: number
  average_score: number
  high_risk_count: number
  total_lost_tons_estimated: number
  manageable_delay_minutes: number
  main_loss_cause: string
}

export interface OperatorRankingResponse {
  source: string
  data_mode: 'real_wenco_sql' | string
  data_source?: 'REAL' | 'DEMO' | string
  source_system?: string
  generated_at: string
  filters: Record<string, string>
  count: number
  summary: OperatorRankingSummary
  items: OperatorRankingItem[]
}

export interface OperatorScoreBreakdown {
  productividad_score: number
  disponibilidad_score: number
  utilizacion_score: number
  control_demoras_score: number
  seguridad_score: number
  score_global: number
}

export interface OperatorDelayCategory {
  category: string
  type: 'gestionable' | 'sistemica' | string
  minutes: number
}

export interface OperatorTimelineEvent {
  fecha: string
  turno: string
  equipment_id: string
  category: string
  type: 'gestionable' | 'sistemica' | string
  minutes: number
  severity: string
}

export interface OperatorTrendPoint {
  fecha: string
  turno: string
  score_global: number
  toneladas: number
  disponibilidad: number
  utilizacion: number
  demoras_gestionables: number
  demoras_sistema: number
  tonelaje_perdido: number
}

export interface OperatorRankingDetail {
  source: string
  data_mode: string
  operator: OperatorRankingItem | null
  score_breakdown: OperatorScoreBreakdown
  delay_categories: OperatorDelayCategory[]
  timeline: OperatorTimelineEvent[]
  fleet_average: {
    score_global: number
    productividad_score: number
    manageable_delay_minutes: number
  }
  trend: OperatorTrendPoint[]
  lost_tons_estimated: number
  explanation: string[]
  recommendation: string
  privacy_note: string
}

export interface OperatorDelayPattern {
  operator_id: string
  operator_name: string
  category: string
  over_threshold_shifts: number
  pattern_level: string
  manageable_delay_minutes: number
  lost_tons_estimated: number
  recommendation: string
}

export interface OperatorDelayPatternsResponse {
  source: string
  data_mode: string
  count: number
  items: OperatorDelayPattern[]
}

export interface OperatorTrendsResponse {
  source: string
  data_mode: string
  count: number
  items: OperatorTrendPoint[]
}

export interface ScoreExplanation {
  source: string
  data_mode: string
  operator_id: string
  operator_name: string
  score_global: number
  explanation: string[]
  recommendation: string
}

export interface OperatorRankingAudit {
  source: string
  data_mode: string
  generated_at: string
  requested_by: string
  applied_filters: Record<string, string>
  seed_id: string
  operator: {
    operator_id: string
    operator_name: string
    frequent_equipment_id: string
  }
  period: {
    start_date?: string
    end_date?: string
    shift?: string
    turnos_analizados: number
  }
  score: {
    score_global: number
    risk_level: string
    risk_reason: string
  }
  components: Record<string, number>
  raw_values: Record<string, number | string>
  normalized_scores: Record<string, number>
  penalties: Record<string, number | string>
  thresholds_used: Record<string, unknown>
  calculation_trace: CalculationTraceStep[]
  manageable_delay_excess: Array<{ category: string; excess_minutes: number; applied: boolean; note: string }>
  recurrence: OperatorRecurrence
  system_delays_context: Record<string, number>
  system_delay_note: string
  impact: {
    lost_tons_estimated: number
    manageable_delay_minutes: number
    system_delay_minutes: number
    availability_percent: number
    utilization_percent: number
  }
  explanation_lines: string[]
  recommendation: string
  recommendation_reason: string
  responsible_use_note: string
}

export interface OperatorRankingAuditLogItem {
  timestamp: string
  usuario: string
  accion: string
  applied_filters: Record<string, string>
  operator_id: string
  operator_name: string
  result_score: number
  risk_level: string
  data_mode: string
  seed_id: string
}

export interface OperatorRankingAuditLogResponse {
  source: string
  data_mode: string
  count: number
  items: OperatorRankingAuditLogItem[]
}
