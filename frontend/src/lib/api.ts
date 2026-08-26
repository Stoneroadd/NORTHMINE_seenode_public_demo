import { isAxiosError, type AxiosRequestConfig } from 'axios'
import { secureApi } from './secureApi'
import { withAnalysisQuery } from './queryParams'
import type { AnalysisFilters } from '../components/filters/filterTypes'
import { settingsService } from '../services/settingsService'

export const API_BASE_URL = settingsService.apiBaseUrl

export { secureApi }
export { secureApi as apiClient }

export type Role = 'admin' | 'supervisor' | 'operador' | 'viewer'

export interface HealthResponse {
  status: string
  service?: string
  version?: string
  environment?: string
  mode: string
  database?: 'connected' | 'disconnected' | string
  identity_store?: 'connected' | 'disconnected' | string
  sql_available: boolean
  demo_mode?: boolean
  production_ready?: boolean
  timestamp?: string
  checks?: {
    service_identity?: boolean
    cors_origins?: string[]
    production_errors?: string[]
    users?: {
      status?: string
      path?: string
      total_users?: number
      active_users?: number
      active_admins?: number
      active_demo_users?: number
    }
  }
}

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthSession {
  user_id: string
  username: string
  nombre: string
  rol: Role
  faena: string
  empresa: string
  access_token: string
  token_type: string
  expires_in?: number
  modo: 'produccion' | 'sql'
  sql_disponible: boolean
  is_demo?: boolean
}

export type UserRole = Role

export interface UserPublic {
  id: string
  username: string
  full_name: string
  email: string | null
  role: UserRole
  is_active: boolean
  is_demo: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
  faena: string
  empresa: string
}

export interface UserListResponse {
  count: number
  items: UserPublic[]
}

export interface UserCreateRequest {
  username: string
  full_name: string
  email?: string | null
  password: string
  role: UserRole
  is_active?: boolean
  faena?: string
  empresa?: string
}

export interface UserUpdateRequest {
  full_name?: string
  email?: string | null
  faena?: string
  empresa?: string
}

export interface UserRoleUpdateRequest {
  role: UserRole
}

export interface UserPasswordResetRequest {
  new_password: string
}

export interface UserStatusUpdateRequest {
  is_active: boolean
}

export interface DailyProduction {
  fecha: string
  // null cuando no hay meta mensual configurada (NORTHMINE_MONTHLY_TARGET_TONS
  // ausente) - el dia sigue siendo real, solo no hay con que comparar.
  plan: number | null
  real: number
  diferencia: number | null
  cumplimiento: number | null
}

export interface HourlyShift {
  hora: number
  tonelaje: number
  ciclos: number
}

export interface HourlyProduction {
  hora: number
  toneladas: number
  ciclos: number
  acumulado?: number
  meta?: number | null
  meta_acumulada?: number | null
  diferencia_meta?: number | null
}

export interface OperationalHeatmapCell {
  equipo: string
  hora: number
  toneladas: number
  ciclos: number
  demoras?: number
}

export interface RankingItem {
  tonelaje: number
  ciclos: number
  carguio_id?: string
  caex_id?: string
  destino?: string
  fase?: string
}

export interface CurrentShift {
  fecha: string
  turno: 'DIA' | 'NOCHE' | string
  tonelaje: number
  ciclos: number
  caex_activos: number
  carguios_activos: number
}

export interface DashboardKpis {
  tonelaje_total: number
  ciclos: number
  meta_configurada?: boolean
  meta_acumulada: number
  meta_mensual: number
  cumplimiento_pct: number
  promedio_por_ciclo: number
  caex_activos: number
  carguios_activos: number
  proyeccion_fin_mes: number
  ritmo_necesario_diario: number
  dias_restantes: number
  dias_con_datos?: number
}

export interface DemoSummary {
  source: string
  mode: 'demo' | string
  generated_at: string
  period: {
    from: string
    to: string
    days_elapsed: number
    days_in_month: number
  }
  kpis: DashboardKpis
  shift_breakdown?: {
    dia: number
    noche: number
  }
  daily: DailyProduction[]
  hourly_shift: HourlyShift[]
  top_loaders: RankingItem[]
  top_trucks: RankingItem[]
  destinations: RankingItem[]
  phase_breakdown: RankingItem[]
  current_shift: CurrentShift
}

export interface CurrentShiftHourly {
  hora: number
  label: string
  toneladas: number
  ciclos: number
  promedio_ton_ciclo: number
  acumulado: number
}

export interface CurrentShiftLoaderHourly {
  carguio_id: string
  hora: number
  label: string
  toneladas: number
  ciclos: number
}

export interface CurrentShiftCaexStatus {
  caex_id: string
  modelo: string
  estado: 'OPERATIVO' | 'SIN ACTIVIDAD' | 'POSIBLE AVERIA' | 'STANDBY' | string
  toneladas: number
  ciclos: number
  ultima_actividad: string
  minutos_sin_actividad: number
  operador?: string | null
  carguio_actual?: string | null
  destino_actual?: string | null
  origen_principal?: string | null
  destino_principal?: string | null
  avg_distance_km?: number | null
  status_code?: string | null
  status_desc?: string | null
  status_category?: string | null
  status_started_at?: string | null
  gestion_flota?: string | null
}

export interface CurrentShiftLoadingUnit {
  carguio_id: string
  modelo: string
  estado: 'OPERATIVO' | 'SIN ACTIVIDAD' | 'POSIBLE AVERIA' | 'STANDBY' | string
  toneladas: number
  ciclos: number
  rendimiento_tph: number
  ultima_actividad: string
  minutos_sin_actividad: number
  ubicacion: string
  operador?: string | null
  origen_principal?: string | null
  destino_principal?: string | null
  avg_distance_km?: number | null
  status_code?: string | null
  status_desc?: string | null
  status_category?: string | null
  status_started_at?: string | null
  gestion_flota?: string | null
}

export interface CaexModelRoute {
  origen: string
  fase: string
  banco: string
  malla: string
  destino: string
  toneladas: number
  ciclos: number
  avg_distance_km?: number | null
}

export interface CaexModelRoutesGroup {
  modelo: string
  equipos: number
  toneladas: number
  ciclos: number
  avg_distance_km?: number | null
  rutas: CaexModelRoute[]
}

export interface CurrentShiftProjection {
  model: string
  produccion_actual: number
  proyeccion_final: number
  meta_turno: number
  ritmo_actual_tph: number
  elapsed_pct: number
  status: 'SOBRE META' | 'BAJO META' | string
  diferencia_proyectada: number
}

export interface CurrentShiftCommandCenter {
  source: string
  fecha: string
  turno: 'DIA' | 'NOCHE' | string
  shift_label: string
  started_at: string
  ends_at: string
  current_time: string
  elapsed_minutes: number
  elapsed_pct: number
  hours_order: number[]
  toneladas_turno: number
  meta_turno: number
  cumplimiento_pct: number
  brecha_ton: number
  ciclos: number
  caex_activos: number
  caex_sin_actividad: number
  caex_standby?: number
  caex_posible_averia: number
  promedio_ton_ciclo: number
  hourly: CurrentShiftHourly[]
  loader_hourly: CurrentShiftLoaderHourly[]
  caex_status: CurrentShiftCaexStatus[]
  loading_units: CurrentShiftLoadingUnit[]
  caex_model_routes?: CaexModelRoutesGroup[]
  projection: CurrentShiftProjection
  generated_at: string
}

export interface CockpitResponse {
  status: 'OK' | 'STALE' | string
  generated_at: string
  api_version: string
  data_source: 'REAL' | 'DEMO' | string
  source_system?: 'WENCO' | string
  source: string
  mode: 'DATOS_REALES' | 'DEMOSTRACION' | 'CACHE' | string
  backend_status?: 'CONNECTED' | 'DISCONNECTED' | string
  data_source_status?: 'CONNECTED' | 'DISCONNECTED' | 'STALE' | string
  selected_date?: string
  selected_shift?: string
  last_real_record?: string | null
  data_freshness_seconds?: number | null
  is_demo: boolean
  stale: boolean
  shift: {
    name: string
    date: string
    started_at?: string | null
    ends_at?: string | null
    current_time?: string | null
    elapsed_minutes?: number | null
    elapsed_pct?: number | null
  }
  health: {
    score: number
    state: string
  }
  production: {
    actual_tonnes: number
    forecast_tonnes: number
    target_tonnes: number
    daily_target_tonnes?: number
    target_source?: string
    non_compliance_risk: number
    cycles?: number
    caex_active?: number
    caex_inactive?: number
    caex_possible_breakdown?: number
    avg_tonnes_per_cycle?: number
    avg_caex_in_circuit?: number
    compliance_pct?: number
    sectors?: Array<{
      sector: string
      actual_tonnes: number
      forecast_tonnes?: number | null
      cycles?: number | null
      pct_of_total?: number | null
      source?: string | null
    }>
  }
  economics: {
    total_cost_usd: number
    cost_per_tonne_usd: number
    estimated_loss_usd: number
    potential_close_loss_usd: number
    fuel_liters: number
    fuel_cost_usd: number
    source: string
  }
  main_cause: {
    cause: string
    impact_pct: number
  }
  why: Array<{ cause: string; impact_pct: number }>
  happening: string[]
  recommendation: {
    title: string
    impact_tons: number
    impact_usd: number
    queue_delta_min: number
    confidence: 'BAJA' | 'MEDIA' | 'ALTA' | string
  }
  scenarios: Array<{
    scenario: string
    tons: number
    cost: number
    cost_per_tonne?: number
    risk: string
    value: string
  }>
  warnings: string[]
  confidence: 'BAJA' | 'MEDIA' | 'ALTA' | string
  refresh_policy?: {
    kpis_seconds: number
    analytics_seconds: number
    heavy_analysis_seconds: number
    simulation: string
  }
  hourly_production: Array<{ hour: string; tons: number; cycles?: number; tonnes_per_cycle?: number; accumulated?: number }>
  loader_hourly?: Array<{
    loader_id: string
    hour: string
    tons: number
    cycles: number
    origin?: string | null
    destination?: string | null
    avg_distance_km?: number | null
    avg_loading_time_min?: number | null
    avg_loading_time_source?: string | null
    avg_caex_wait_time_min?: number | null
    avg_caex_wait_time_source?: string | null
  }>
  delays: Array<{ type: string; minutes: number }>
  caex_status?: Array<{
    caex_id: string
    model?: string
    status: string
    tons: number
    cycles: number
    last_activity?: string | null
    minutes_inactive?: number | null
    operator?: string | null
    loading_unit?: string | null
    destination?: string | null
  }>
  shovels: Array<{
    id: string
    model?: string
    status: string
    queue_min: number
    tons: number
    cycles?: number
    avg_tonnes_per_cycle?: number
    efficiency_pct?: number
    front?: string
    destination?: string
    destination_pct?: number
    last_activity?: string | null
    minutes_inactive?: number | null
    operator?: string | null
  }>
  destinations: Array<{ destination: string; pct: number; tons: number }>
  events: string[]
  operational_alerts?: {
    counts?: Record<string, number>
    items?: SmartAlert[]
    low_caex?: LowCaexAlert[]
  }
  data_quality?: {
    status: 'OK' | 'STALE' | 'EMPTY' | string
    score: number
    completeness_pct: number
    cycles_total: number
    cycles_with_time: number
    cycles_with_destination: number
    cycles_with_loader: number
    last_record_at?: string | null
    last_record_age_min?: number | null
    stale: boolean
    source: string
  }
  availability: number
}

export interface ProfitScenario {
  id: string
  name: string
  description: string
  production_tonnes: number
  production_delta_tonnes: number
  total_cost_usd: number
  cost_delta_usd: number
  cost_per_tonne_usd: number
  estimated_losses_usd: number
  loss_delta_usd: number
  gross_margin_usd: number
  margin_per_tonne_usd: number
  risk: number
  risk_label: 'Bajo' | 'Medio' | 'Alto' | string
  risk_penalty_usd: number
  risk_adjusted_value_usd: number
  value_delta_usd: number
  confidence: 'BAJA' | 'MEDIA' | 'ALTA' | string
  feasibility: 'BAJA' | 'MEDIA' | 'ALTA' | string
  tradeoff: string
}

export interface ProfitOptimizationResponse {
  status: 'OK' | 'STALE' | string
  generated_at: string
  api_version: string
  data_source: 'REAL' | 'DEMO' | string
  source: string
  mode: 'DATOS_REALES' | 'DEMOSTRACION' | 'CACHE' | string
  is_demo: boolean
  stale: boolean
  objective: 'MAX_RISK_ADJUSTED_VALUE' | string
  shift: {
    name: string
    date: string
    started_at?: string | null
    ends_at?: string | null
    current_time?: string | null
  }
  baseline: {
    production_tonnes: number
    target_tonnes: number
    cost_per_tonne_usd: number
    estimated_losses_usd: number
    non_compliance_risk: number
  }
  best_scenario_id: string
  recommendation: {
    title: string
    summary: string
    best_scenario_id: string
    why: string
    confidence: 'BAJA' | 'MEDIA' | 'ALTA' | string
    feasibility: 'BAJA' | 'MEDIA' | 'ALTA' | string
    risk_adjusted_value_usd: number
    value_delta_usd: number
  }
  best: {
    highest_production: string
    lowest_cost: string
    lowest_cost_per_tonne: string
    highest_margin: string
    highest_risk_adjusted_value: string
  }
  scenarios: ProfitScenario[]
  ranking: Array<{
    scenario_id: string
    name: string
    risk_adjusted_value_usd: number
    rank_metric: string
  }>
  insights: string[]
  assumptions: {
    value_per_tonne_usd: number
    risk_penalty_factor: number
    cost_source: string
    optimization_scope: string
  }
  data_quality?: CockpitResponse['data_quality']
  warnings: string[]
  refresh_policy?: {
    analytics_seconds: number
    simulation: string
  }
}

export interface HiddenLossItem {
  id: string
  category: string
  title: string
  equipment_id?: string | null
  loss_usd: number
  recoverable_usd: number
  lost_tonnes: number
  lost_hours: number
  lost_minutes: number
  confidence: 'BAJA' | 'MEDIA' | 'ALTA' | string
  severity: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA' | string
  evidence: string[]
  recommendation: string
  impact: {
    fuel_liters: number
    fuel_cost_usd: number
    wear_cost_usd: number
  }
}

export interface HiddenLossesResponse {
  status: 'OK' | 'STALE' | string
  generated_at: string
  api_version: string
  data_source: 'REAL' | 'DEMO' | string
  source: string
  mode: 'DATOS_REALES' | 'DEMOSTRACION' | 'CACHE' | string
  is_demo: boolean
  stale: boolean
  summary: {
    hidden_loss_usd: number
    recoverable_value_usd: number
    potential_tonnes: number
    lost_hours: number
    confidence: 'BAJA' | 'MEDIA' | 'ALTA' | string
    primary_source: string
    primary_category: string
    primary_recommendation: string
  }
  primary_source: HiddenLossItem
  losses: HiddenLossItem[]
  by_equipment: Array<{
    equipment_id: string
    loss_usd: number
    lost_hours: number
    sources: string[]
  }>
  recommendations: Array<{
    title: string
    source_loss_id: string
    recoverable_usd: number
    confidence: 'BAJA' | 'MEDIA' | 'ALTA' | string
  }>
  insights: string[]
  assumptions: {
    delay_cost_usd_per_min: number
    value_per_tonne_usd: number
    fuel_liters_per_tonne: number
    scope: string
  }
  data_quality?: CockpitResponse['data_quality']
  warnings: string[]
  refresh_policy?: {
    analytics_seconds: number
    heavy_analysis_seconds: number
  }
  shift: {
    name: string
    date: string
    started_at?: string | null
    ends_at?: string | null
    current_time?: string | null
  }
}

export interface OperationalNlpPattern {
  id: string
  label: string
  category: string
  frequency: number
  free_text_frequency: number
  source_documents: string[]
  trend: 'EN_AUMENTO' | 'EN_DESCENSO' | 'ESTABLE' | 'SIN_HISTORIA' | string
  confidence: 'BAJA' | 'MEDIA' | 'ALTA' | string
  estimated_lost_hours: number
  estimated_impact_usd: number
  linked_hidden_loss_usd: number
  associated_equipment: string[]
  associated_operators: string[]
  keywords: string[]
  evidence: string[]
  recommendation: string
}

export interface OperationalNlpResponse {
  status: 'OK' | 'STALE' | string
  generated_at: string
  api_version: string
  data_source: 'REAL' | 'DEMO' | string
  source: string
  mode: 'DATOS_REALES' | 'DEMOSTRACION' | 'CACHE' | string
  is_demo: boolean
  stale: boolean
  summary: {
    emerging_pattern: string
    frequency: number
    shifts_analyzed?: number | null
    associated_equipment: string[]
    estimated_lost_hours: number
    estimated_impact_usd: number
    trend: string
    confidence: 'BAJA' | 'MEDIA' | 'ALTA' | string
  }
  patterns: OperationalNlpPattern[]
  entities: {
    equipment: Array<{ id: string; mentions: number; patterns: string[] }>
    operators: Array<{ id: string; mentions: number; patterns: string[] }>
  }
  source_mix: {
    total_texts: number
    free_texts: number
    alert_texts: number
  }
  hidden_loss_context: {
    recoverable_value_usd: number
    primary_source: string
  }
  recommendations: Array<{
    title: string
    pattern_id: string
    estimated_impact_usd: number
    confidence: 'BAJA' | 'MEDIA' | 'ALTA' | string
  }>
  insights: string[]
  warnings: string[]
  refresh_policy?: {
    analytics_seconds: number
    heavy_analysis_seconds: number
  }
}

export interface DispatcherAdvisorEvidence {
  source: 'cockpit' | 'profit_optimization' | 'hidden_losses' | 'operational_nlp' | string
  title: string
  detail: string
  weight: number
}

export interface DispatcherAdvisorResponse {
  status: 'OK' | 'STALE' | string
  generated_at: string
  api_version: string
  data_source: 'REAL' | 'DEMO' | string
  source_system?: string
  source: string
  mode: 'DATOS_REALES' | 'DEMOSTRACION' | 'CACHE' | string
  selected_date?: string | null
  selected_shift?: string | null
  shift?: CockpitResponse['shift']
  is_demo: boolean
  stale: boolean
  advisor: {
    situation: string
    probable_cause: string
    action: {
      title: string
      type: string
      rationale: string[]
    }
    target_equipment: string[]
    impact: {
      productivity_pct: number
      production_tonnes: number
      queue_delta_min: number
      expected_value_usd: number
      hidden_recoverable_usd: number
      nlp_impact_usd: number
    }
    risk: 'BAJO' | 'MEDIO' | 'ALTO' | string
    confidence: 'BAJA' | 'MEDIA' | 'ALTA' | string
    execution_window_min: number
  }
  evidence: DispatcherAdvisorEvidence[]
  alternatives: Array<{
    id: string
    name: string
    expected_value_usd: number
    production_tonnes: number
    risk: string
    confidence: string
  }>
  traceability: {
    inputs: Array<{
      endpoint: string
      api_version: string
      status: string
    }>
    decision_policy: string
  }
  data_quality: {
    score: number
    cockpit_status: string
    texts_analyzed: number
    free_texts: number
    alert_texts: number
    hidden_loss_confidence: string
  }
  warnings: string[]
  refresh_policy?: {
    analytics_seconds: number
    simulation: string
  }
}

export interface DecisionAuditImpact {
  delta_tonnes: number | null
  delta_usd: number | null
  delta_risk: number | null
  queue_reduction_minutes: number | null
}

export interface DecisionAuditEvaluation {
  status: 'OK' | 'INSUFICIENTE' | string
  effectiveness_score: number | null
  expected_value_usd: number | null
  actual_value_usd: number | null
  value_recovery_ratio: number | null
  tonnage_accuracy: number | null
  risk_accuracy: number | null
  queue_accuracy?: number | null
  economic_accuracy?: number | null
  overall_accuracy: number | null
  deviation?: {
    value_usd: number | null
    tonnes: number | null
    risk: number | null
    queue_minutes: number | null
  }
  warnings: string[]
}

export interface DecisionAuditRecommendation {
  decision_id: string
  advisor_recommendation_id: string
  generated_at: string | null
  source: string
  situation: string
  recommended_action: string
  action_type: string
  expected_impact: DecisionAuditImpact
  confidence: 'BAJA' | 'MEDIA' | 'ALTA' | string
  evidence: unknown[]
  status: string
}

export interface DecisionAuditRecord {
  decision_id: string
  issued_at: string | null
  executed_at: string | null
  action_type: string
  recommended_action: string
  execution_status: 'PENDIENTE' | 'EJECUTADA' | 'PARCIAL' | 'NO_EJECUTADA' | 'NO_CONFIRMADA' | string
  recommendation: DecisionAuditRecommendation
  actual_result: {
    decision_id: string
    execution_status: string
    executed_at: string | null
    actual_action: string
    observed_window?: { start?: string | null; end?: string | null }
    actual_impact: DecisionAuditImpact
    data_quality?: number | null
    confidence?: string | null
    evidence?: unknown[]
  } | null
  evaluation: DecisionAuditEvaluation
}

export interface DecisionAuditMetrics {
  status: 'OK' | 'INSUFICIENTE' | string
  recommendations: number
  executed: number
  partial: number
  not_executed: number
  pending: number
  adoption_rate_pct: number | null
  evaluated: number
  minimum_required: number
  average_effectiveness_pct: number | null
  economic_accuracy_pct: number | null
  tonnage_accuracy_pct: number | null
  expected_value_usd: number | null
  actual_value_usd: number | null
  value_recovery_ratio_pct: number | null
  average_deviation_usd: number | null
  best_action_type?: { action_type: string; effectiveness_pct: number; count: number } | null
  worst_action_type?: { action_type: string; effectiveness_pct: number; count: number } | null
  by_action_type?: Array<{ action_type: string; effectiveness_pct: number; count: number }>
  message: string
}

export interface DecisionAuditResponse {
  status: 'OK' | 'SIN_HISTORIAL' | 'INSUFICIENTE' | string
  generated_at: string
  api_version: string
  data_source: 'REAL' | 'DEMO' | string
  demo_label?: string
  source_system: string
  operational_source_system?: string
  advisor_source: string
  mode: 'DATOS_REALES' | 'DEMOSTRACION' | 'CACHE' | string
  is_demo: boolean
  selected_date?: string | null
  selected_shift?: string | null
  current_decision: {
    recommendation: DecisionAuditRecommendation
    execution_status: string
    actual_impact: DecisionAuditImpact
    evaluation: DecisionAuditEvaluation
  } | null
  summary: {
    recommendations: number
    executed: number
    partial?: number
    not_executed?: number
    adoption_rate_pct?: number | null
    average_effectiveness_pct?: number | null
    advisor_accuracy_pct?: number | null
    expected_value_usd?: number | null
    actual_value_usd?: number | null
    realized_value_usd?: number | null
    value_recovery_ratio_pct?: number | null
    principal_strength?: string | null
    principal_deviation?: string | null
    message: string
    confidence: string
  }
  historical_metrics: DecisionAuditMetrics | null
  records: DecisionAuditRecord[]
  executive_summary: DecisionAuditResponse['summary'] | null
  confidence: 'BAJA' | 'MEDIA' | 'ALTA' | string
  message: string
  warnings: string[]
}

export interface MonthlyTargetResponse {
  status: 'OK' | 'SIN_DATOS' | string
  api_version: string
  generated_at: string
  data_source: 'REAL' | 'DEMO' | 'ESTIMADO' | string
  demo_label?: string
  source_system: string
  period: {
    month: number
    year: number
    label: string
    start_date: string
    end_date: string
    month_end_date?: string
  }
  sector: string
  daily_target_f01_tonnes?: number
  monthly_target_f01_tonnes?: number
  mov_programado_acumulado: number
  mov_real_acumulado: number
  mov_f02_acumulado?: number
  mov_total_con_f02?: number
  mov_diferencia: number
  cumplimiento_pct: number | null
  quality: string
  last_updated: string | null
  program_source: string
  real_source: string
  daily_breakdown?: Array<{
    date: string
    day: number
    f01_programmed_tonnes: number
    f01_real_tonnes: number
    f01_difference_tonnes: number | null
    f01_cumplimiento_pct: number | null
    f02_real_tonnes: number
    total_real_tonnes: number
    total_vs_f01_target_pct: number | null
    status: string
    tone: 'BULL' | 'BEAR' | 'FLAT' | 'PENDING' | string
    is_future: boolean
  }>
  stale: boolean
  warnings: string[]
}

export interface SmartAlert {
  id: string
  equipment_id?: string | null
  titulo?: string
  descripcion?: string
  severidad?: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA' | string
  modulo?: string
  timestamp?: string
  estado?: string
  recomendacion?: string
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | string
  type?: string
  title?: string
  description?: string
  status?: string
  relative_minutes?: number
}

export interface PerformanceDay {
  fecha: string
  toneladas: number
  ciclos: number
  plan: number
  cumplimiento_pct: number
}

export interface PerformanceHourlyProfile {
  hora: number
  label: string
  promedio_ton: number
  desv_std: number
  min_confianza: number
  max_confianza: number
  porcentaje_total: number
}

export interface PerformanceHeatmapCell {
  fecha: string
  hora: number
  label: string
  toneladas: number
  ranking?: number
}

export interface LoaderPerformance {
  carguio_id: string
  modelo: string
  fase: 'F01' | 'F02' | string
  toneladas: number
  ciclos: number
  ton_ciclo: number
}

export interface PerformanceSummary {
  source: string
  desde: string
  hasta: string
  kpis: {
    total_periodo: number
    ciclos: number
    promedio_dia: number
    mejor_dia: PerformanceDay | null
    peor_dia: PerformanceDay | null
  }
  daily: PerformanceDay[]
  hourly_profile: PerformanceHourlyProfile[]
  top_hours: PerformanceHourlyProfile[]
  top_hour_set: number[]
  top_concentration_pct: number
  peak_title: string
  heatmap: PerformanceHeatmapCell[]
  heatmap_max: PerformanceHeatmapCell
  loader_performance: LoaderPerformance[]
  generated_at: string
}

export interface LowCaexAlert {
  caex_id: string
  modelo: string
  toneladas: number
  porcentaje_promedio: number
  ultimo_ciclo: string
  badge: 'CRITICO' | 'ATENCION' | 'NORMAL' | string
}

export interface WeekdayProductivity {
  weekday: number
  label: string
  toneladas: number
  delta_pct: number
  is_best: boolean
  is_worst: boolean
}

export interface DestinationDistribution {
  destino: string
  tonelaje: number
  ciclos: number
  porcentaje: number
}

export interface OperationalAlertsResponse {
  source: string
  counts: Record<'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA', number>
  items: SmartAlert[]
  count: number
  low_caex: LowCaexAlert[]
  weekday_productivity: WeekdayProductivity[]
  best_weekday: WeekdayProductivity
  worst_weekday: WeekdayProductivity
  destination_distribution: DestinationDistribution[]
  generated_at: string
}

export interface ProductionShift {
  status?: 'OK' | 'NO_DATA' | string
  api_version?: string
  data_source?: 'REAL' | 'DEMO' | string
  source_system?: string
  backend_status?: string
  data_source_status?: string
  source: string
  stale?: boolean
  turno_actual: string
  selected_shift?: string
  fecha: string
  last_real_record?: string | null
  meta_configurada?: boolean
  meta_source?: string
  daily_target_tonnes?: number
  toneladas_turno: number
  meta_turno: number
  meta_horaria?: number | null
  cumplimiento_pct: number
  brecha_ton: number
  elapsed_minutes?: number
  elapsed_pct?: number
  expected_tonnes_now?: number | null
  actual_vs_expected_ton?: number | null
  proyeccion_fin_turno?: number
  proyeccion_modelo?: string
  proyeccion_r2?: number | null
  brecha_proyectada_ton?: number | null
  ritmo_actual_tph?: number
  ritmo_requerido_tph?: number | null
  toneladas_por_hora: HourlyProduction[]
  produccion_acumulada: HourlyProduction[]
  heatmap?: OperationalHeatmapCell[]
  mejor_hora: HourlyProduction | null
  peor_hora: HourlyProduction | null
  tendencia: string
  warnings?: string[]
  generated_at: string
}

export interface FleetEquipment {
  caex_id: string
  modelo: string
  estado: 'ACTIVO' | 'DEMORA' | 'SIN ACTIVIDAD' | 'MANTENCION' | 'STANDBY' | string
  toneladas: number
  ciclos: number
  ultima_actividad: string
  ultimo_registro?: string
  minutos_sin_actividad?: number
  operador?: string | null
  alerta?: string | null
  carguio_actual?: string
  destino_actual?: string
  origen_principal?: string | null
  destino_principal?: string | null
  avg_distance_km?: number | null
  status_code?: string | null
  status_desc?: string | null
  status_category?: string | null
  status_started_at?: string | null
  gestion_flota?: string | null
}

export interface FleetStatus {
  source: string
  total_equipos: number
  equipos_activos: number
  equipos_en_demora: number
  equipos_sin_actividad: number
  equipos_mantencion: number
  equipos_standby?: number
  utilizacion_pct: number
  disponibilidad_pct: number
  lista_equipos: FleetEquipment[]
  items: FleetEquipment[]
  count: number
  generated_at: string
}

export interface FleetFullRankingItem {
  rank: number
  caex_id: string
  modelo: string
  capacidad: number
  toneladas: number
  ciclos: number
  tph: number
  eficiencia_pct: number
  estado: 'ACTIVO' | 'SIN ACTIVIDAD' | 'MANTENCION' | 'DEMORA' | string
  prom_ciclo: number
  tiempo_ciclo_min: number
}

export interface FleetModelEfficiency {
  modelo: string
  equipos: number
  eficiencia_pct: number
  ciclos_hora: number
  t_ciclo_nominal: number
  t_ciclo_real: number
  mejor_caex: string
}

export interface FleetFullResponse {
  source: string
  dias: number
  resumen: {
    total_caex: number
    disponibilidad: number
    prom_ciclo: number
    ciclos_hora: number
  }
  ranking: FleetFullRankingItem[]
  por_modelo: FleetModelEfficiency[]
  estado_flota: {
    activo: number
    sin_actividad: number
    mantencion: number
    demora: number
  }
  tiempo_ciclos: FleetFullRankingItem[]
  top5: FleetFullRankingItem[]
}

export interface LoadingUnit {
  carguio_id: string
  modelo: string
  toneladas: number
  ciclos: number
  camiones_atendidos: number
  rendimiento_tph: number
  ubicacion: string
  estado: string
  variacion_pct: number
  status_code?: string | null
  status_desc?: string | null
  status_category?: string | null
  status_started_at?: string | null
  gestion_flota?: string | null
}

export interface LoadingUnitsSummary {
  source: string
  count: number
  items: LoadingUnit[]
  unidades: LoadingUnit[]
  total_toneladas: number
  rendimiento_promedio_tph: number
  generated_at: string
}

export interface ShiftReport {
  status?: string
  api_version?: string
  data_source?: 'REAL' | 'DEMO' | string
  source_system?: string
  backend_status?: string
  data_source_status?: string
  source: string
  stale?: boolean
  fecha: string
  turno: string
  selected_shift?: string
  last_real_record?: string | null
  resumen_texto: string
  toneladas: number
  meta: number
  cumplimiento_pct: number
  brecha: number
  top_carguio: LoadingUnit | null
  top_caex: FleetEquipment | null
  principales_alertas: SmartAlert[]
  recomendaciones: string[]
  warnings?: string[]
  generado_en: string
}

export interface ComparePeriod {
  label: string
  tonelaje: number
  ciclos: number
  prom_dia: number
}

export interface CompareTableRow {
  kpi: string
  a: number
  b: number
  var: number
  trend: 'up' | 'down' | string
  suffix?: string
}

export interface CompareHourlyPoint {
  hora: number
  label: string
  toneladas: number
}

export interface CompareLoaderPoint {
  carguio_id: string
  toneladas: number
}

export interface CompareDay {
  fecha: string
  ton: number
  pct: number
}

export interface CompareResponse {
  source: string
  periodo_a: ComparePeriod
  periodo_b: ComparePeriod
  tabla: CompareTableRow[]
  hora_hora_a: CompareHourlyPoint[]
  hora_hora_b: CompareHourlyPoint[]
  por_pala_a: CompareLoaderPoint[]
  por_pala_b: CompareLoaderPoint[]
  mejor_dia_a: CompareDay
  peor_dia_a: CompareDay
  mejor_dia_b: CompareDay
  peor_dia_b: CompareDay
  generated_at: string
}

export interface ShiftComparisonShiftSummary {
  shift: 'DIA' | 'NOCHE' | string
  label: string
  total_tonnes: number
  cycles: number
  avg_tonnes_per_cycle: number
  caex_count: number
  loading_units_count: number
}

export interface ShiftComparisonHourlyPoint {
  slot: number
  label: string
  dia_hour: string
  noche_hour: string
  dia_tonnes: number
  noche_tonnes: number
  difference_tonnes: number
  dia_cycles: number
  noche_cycles: number
  leader: 'DIA' | 'NOCHE' | 'EMPATE' | string
}

export interface ShiftComparisonDistributionEntry {
  name: string
  tonnes: number
  cycles: number
  pct: number
}

export interface ShiftComparisonEquipmentPoint {
  id: string
  model: string
  operator?: string | null
  dia_operator?: string | null
  noche_operator?: string | null
  dia_tonnes: number
  noche_tonnes: number
  dia_cycles: number
  noche_cycles: number
  total_tonnes: number
  total_cycles: number
  difference_tonnes: number
  leader: 'DIA' | 'NOCHE' | 'EMPATE' | string
  assigned_caex?: number
  dia_assigned_caex?: number
  noche_assigned_caex?: number
  caex_id_list?: string[]
  dia_caex_id_list?: string[]
  noche_caex_id_list?: string[]
  loading_units?: number
  dia_loading_units?: number
  noche_loading_units?: number
  main_loading_unit?: string | null
  loading_unit_pct?: number
  dia_main_loading_unit?: string | null
  dia_loading_unit_pct?: number
  noche_main_loading_unit?: string | null
  noche_loading_unit_pct?: number
  avg_caex_in_circuit?: number | null
  dia_avg_caex_in_circuit?: number | null
  noche_avg_caex_in_circuit?: number | null
  main_destination?: string
  destination_pct?: number
  dia_main_destination?: string
  dia_destination_pct?: number
  noche_main_destination?: string
  noche_destination_pct?: number
  destination_breakdown?: ShiftComparisonDistributionEntry[]
  dia_destination_breakdown?: ShiftComparisonDistributionEntry[]
  noche_destination_breakdown?: ShiftComparisonDistributionEntry[]
  bench_mesh?: string
  bench_mesh_pct?: number
  dia_bench_mesh?: string
  dia_bench_mesh_pct?: number
  noche_bench_mesh?: string
  noche_bench_mesh_pct?: number
  origin_breakdown?: ShiftComparisonDistributionEntry[]
  dia_origin_breakdown?: ShiftComparisonDistributionEntry[]
  noche_origin_breakdown?: ShiftComparisonDistributionEntry[]
  avg_distance_km?: number | null
  dia_avg_distance_km?: number | null
  noche_avg_distance_km?: number | null
  efficiency_pct?: number
  status_code?: string | null
  status_desc?: string | null
  status_category?: string | null
  status_started_at?: string | null
}

export interface ShiftComparisonEquipmentStatusBreakdown {
  code: string
  description: string
  category: string
  minutes: number
  pct?: number
  occurrences?: number
}

export interface ShiftComparisonEquipmentHourlyPoint extends ShiftComparisonHourlyPoint {
  equipment_id: string
  dia_operator?: string | null
  noche_operator?: string | null
  dia_origin?: string | null
  noche_origin?: string | null
  dia_destination?: string | null
  noche_destination?: string | null
  dia_distance_km?: number | null
  noche_distance_km?: number | null
  dia_loaded_distance_km?: number | null
  noche_loaded_distance_km?: number | null
  dia_loading_time_min?: number | null
  noche_loading_time_min?: number | null
  dia_loading_time_source?: string | null
  noche_loading_time_source?: string | null
  dia_caex_wait_time_min?: number | null
  noche_caex_wait_time_min?: number | null
  dia_caex_wait_time_source?: string | null
  noche_caex_wait_time_source?: string | null
  dia_transport_time_min?: number | null
  noche_transport_time_min?: number | null
  dia_transport_time_source?: string | null
  noche_transport_time_source?: string | null
  dia_empty_return_time_min?: number | null
  noche_empty_return_time_min?: number | null
  dia_empty_return_time_source?: string | null
  noche_empty_return_time_source?: string | null
  dia_travel_cycle_time_min?: number | null
  noche_travel_cycle_time_min?: number | null
  dia_travel_cycle_time_source?: string | null
  noche_travel_cycle_time_source?: string | null
  dia_shovel_wait_time_min?: number | null
  noche_shovel_wait_time_min?: number | null
  dia_shovel_wait_time_source?: string | null
  noche_shovel_wait_time_source?: string | null
  dia_caex_cycle_time_min?: number | null
  noche_caex_cycle_time_min?: number | null
  dia_caex_cycle_time_source?: string | null
  noche_caex_cycle_time_source?: string | null
  dia_cycle_time_min?: number | null
  noche_cycle_time_min?: number | null
  dia_status_breakdown?: ShiftComparisonEquipmentStatusBreakdown[]
  noche_status_breakdown?: ShiftComparisonEquipmentStatusBreakdown[]
  dia_maintenance_code?: string | null
  noche_maintenance_code?: string | null
  dia_maintenance_desc?: string | null
  noche_maintenance_desc?: string | null
  dia_maintenance_minutes?: number | null
  noche_maintenance_minutes?: number | null
}

export interface ShiftComparisonOperationalContext {
  turno_nombre: 'DIA' | 'NOCHE' | string
  fecha_operacional: string
  turno_inicio: string
  turno_fin: string
  current_time?: string | null
  elapsed_minutes?: number | null
}

export interface ShiftComparisonResponse {
  status: 'OK' | 'NO_DATA' | string
  api_version: string
  data_source: 'REAL' | 'DEMO' | string
  source_system: string
  source: string
  selected_date: string
  operational_context?: ShiftComparisonOperationalContext
  generated_at: string
  stale: boolean
  summary: {
    dia: ShiftComparisonShiftSummary
    noche: ShiftComparisonShiftSummary
    difference_tonnes: number
    leader: 'DIA' | 'NOCHE' | 'EMPATE' | string
  }
  hourly: ShiftComparisonHourlyPoint[]
  loading_units: ShiftComparisonEquipmentPoint[]
  loading_unit_hourly?: ShiftComparisonEquipmentHourlyPoint[]
  caex: ShiftComparisonEquipmentPoint[]
  caex_hourly?: ShiftComparisonEquipmentHourlyPoint[]
  warnings: string[]
}

export interface ListResponse<T> {
  source: string
  count: number
  items: T[]
}

export interface OperationalCollection<T> {
  source: string
  count: number
  items: T[]
  generated_at?: string
}

export interface OperationsSummaryResponse {
  source: string
  limited?: boolean
  kpis: Partial<DashboardKpis>
  current_shift?: CurrentShift
  phase_breakdown?: RankingItem[]
  destinations?: RankingItem[]
  daily?: DailyProduction[]
  hourly_shift?: HourlyShift[]
  top_loaders?: RankingItem[]
  top_trucks?: RankingItem[]
  count?: number
  generated_at?: string
}

export interface ShiftCurrentResponse extends CurrentShiftCommandCenter {
  caex_bajo_promedio?: Array<CurrentShiftCaexStatus & { porcentaje_promedio: number }>
}

export interface ShiftCaexRankingItem extends CurrentShiftCaexStatus {
  rank: number
  rendimiento_tph: number
}

export interface FleetCycleTimeItem {
  caex_id: string
  modelo: string
  avg_cycle_min: number
  toneladas_por_ciclo: number
  estado: string
}

export interface FleetCycleTimeResponse extends OperationalCollection<FleetCycleTimeItem> {
  average_cycle_min: number
}

export interface CaexDistanceItem {
  caex_id: string
  modelo: string
  toneladas: number
  ciclos: number
  distance_km: number
  avg_distance_km: number
  toneladas_por_ciclo: number
}

export interface RouteDistanceItem {
  origin: string
  destination: string
  carguio_id?: string
  toneladas: number
  ciclos: number
  distance_km: number
  avg_distance_km: number
}

export interface DistanceSummary {
  source: string
  total_distance_km: number
  avg_distance_per_cycle_km: number
  count: number
  items: CaexDistanceItem[]
  routes: RouteDistanceItem[]
  generated_at: string
}

export interface LoadingUnitDistanceItem {
  carguio_id: string
  toneladas: number
  ciclos: number
  distance_km: number
  avg_distance_km: number
  toneladas_por_ciclo: number
}

export interface AveriaSummary {
  source: string
  active_breakdowns: number
  inactive_equipment: number
  maintenance_equipment: number
  critical_alerts: number
  high_alerts: number
  items?: ActiveBreakdownItem[]
  generated_at: string
}

export interface ActiveBreakdownItem {
  id: string
  equipment_id: string
  model?: string | null
  status: string
  severity: string
  started_at?: string | null
  last_activity?: string | null
  duration_min: number
  description: string
  recommendation?: string | null
}

export interface AerialFileItem {
  file_name: string
  extension: string
  size_mb: number
  updated_at: string
  status: string
}

export interface AerialStatus {
  source: string
  status: string
  faena: string
  latest_file: AerialFileItem | null
  files_count: number
  viewer_status: string
  heavy_tif_loaded: boolean
  equipment_counts: Record<string, number>
  generated_at: string
}

export interface CockpitQueryParams {
  date?: string
  shift?: string
  sector?: string
}

export class ApiError extends Error {
  status: number
  errorCode?: string

  constructor(status: number, message: string, errorCode?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errorCode = errorCode
  }
}

function normalizeHeaders(headers: HeadersInit | undefined): Record<string, string> | undefined {
  if (!headers) return undefined
  if (headers instanceof Headers) {
    const normalized: Record<string, string> = {}
    headers.forEach((value, key) => {
      normalized[key] = value
    })
    return normalized
  }
  if (Array.isArray(headers)) return Object.fromEntries(headers)
  return headers as Record<string, string>
}

function normalizeBody(body: BodyInit | null | undefined): unknown {
  if (!body) return undefined
  if (typeof body !== 'string') return body
  try {
    return JSON.parse(body)
  } catch {
    return body
  }
}

// El backend a veces responde con `detail` como string (FastAPI generico) y a
// veces como objeto estructurado (p.ej. { error_code: "REAL_DATA_ONLY",
// message: "..." } en los 410 del Decision Cockpit). Antes solo se leia el
// caso string, asi que un 410 estructurado caia siempre al fallback "HTTP 410"
// en vez de mostrar el mensaje real del backend.
function extractErrorInfo(data: unknown, status: number): { message: string; errorCode?: string } {
  if (typeof data === 'string' && data.trim()) return { message: data }
  if (data && typeof data === 'object') {
    const maybeError = data as { detail?: unknown; message?: unknown }
    if (typeof maybeError.detail === 'string') return { message: maybeError.detail }
    if (maybeError.detail && typeof maybeError.detail === 'object') {
      const detail = maybeError.detail as { message?: unknown; error_code?: unknown }
      if (typeof detail.message === 'string') {
        return {
          message: detail.message,
          errorCode: typeof detail.error_code === 'string' ? detail.error_code : undefined,
        }
      }
    }
    if (typeof maybeError.message === 'string') return { message: maybeError.message }
  }
  return { message: status ? `HTTP ${status}` : 'Error de red' }
}

function withCockpitQuery(path: string, params: CockpitQueryParams = {}): string {
  const search = new URLSearchParams()
  if (params.date) search.set('date', params.date)
  if (params.shift) search.set('shift', params.shift)
  if (params.sector) search.set('sector', params.sector)
  const query = search.toString()
  return `${path}${query ? `?${query}` : ''}`
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const config: AxiosRequestConfig = {
    url: path,
    method: init.method ?? 'GET',
    headers: normalizeHeaders(init.headers),
    data: normalizeBody(init.body),
  }

  if (init.signal) {
    config.signal = init.signal
  }

  try {
    const response = await secureApi.request<T>(config)
    return response.data
  } catch (error) {
    if (isAxiosError(error)) {
      const status = error.response?.status ?? 0
      const info = extractErrorInfo(error.response?.data, status)
      throw new ApiError(status, info.message, info.errorCode)
    }
    throw error
  }
}

export const northmineApi = {
  health: () => apiFetch<HealthResponse>('/health'),
  login: (payload: LoginRequest) =>
    apiFetch<AuthSession>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getUsers: () => apiFetch<UserListResponse>('/api/admin/users'),
  getUser: (userId: string) => apiFetch<UserPublic>(`/api/admin/users/${encodeURIComponent(userId)}`),
  createUser: (payload: UserCreateRequest) =>
    apiFetch<UserPublic>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateUser: (userId: string, payload: UserUpdateRequest) =>
    apiFetch<UserPublic>(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  updateUserRole: (userId: string, payload: UserRoleUpdateRequest) =>
    apiFetch<UserPublic>(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  updateUserStatus: (userId: string, payload: UserStatusUpdateRequest) =>
    apiFetch<UserPublic>(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  resetUserPassword: (userId: string, payload: UserPasswordResetRequest) =>
    apiFetch<UserPublic>(`/api/admin/users/${encodeURIComponent(userId)}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  summary: (filters?: AnalysisFilters) => apiFetch<DemoSummary>(withAnalysisQuery('/api/summary', filters)),
  cockpit: (params?: CockpitQueryParams) => apiFetch<CockpitResponse>(withCockpitQuery('/api/cockpit', params)),
  profitOptimization: () => apiFetch<ProfitOptimizationResponse>('/api/profit-optimization'),
  hiddenLosses: () => apiFetch<HiddenLossesResponse>('/api/hidden-losses'),
  operationalNlp: () => apiFetch<OperationalNlpResponse>('/api/operational-nlp'),
  dispatcherAdvisor: (params?: CockpitQueryParams) => apiFetch<DispatcherAdvisorResponse>(withCockpitQuery('/api/dispatcher-advisor', params)),
  decisionAudit: (params?: CockpitQueryParams) => apiFetch<DecisionAuditResponse>(withCockpitQuery('/api/decision-audit', params)),
  monthlyTarget: (params?: CockpitQueryParams) => apiFetch<MonthlyTargetResponse>(withCockpitQuery('/api/monthly-target', params)),
  shiftComparison: (params?: CockpitQueryParams) => apiFetch<ShiftComparisonResponse>(withCockpitQuery('/api/shift-comparison', params)),
  currentShiftCommandCenter: () => apiFetch<CurrentShiftCommandCenter>('/api/current-shift/command-center'),
  performanceSummary: (desde?: string, hasta?: string) => {
    const params = new URLSearchParams()
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', hasta)
    const query = params.toString()
    return apiFetch<PerformanceSummary>(`/api/performance/summary${query ? `?${query}` : ''}`)
  },
  productionShift: (turno = 'ACTUAL', filters?: AnalysisFilters) =>
    apiFetch<ProductionShift>(withAnalysisQuery('/api/production/shift', filters, { turno })),
  fleetStatus: (turno = 'ACTUAL', filters?: AnalysisFilters) =>
    apiFetch<FleetStatus>(withAnalysisQuery('/api/fleet/status', filters, { turno })),
  fleetFull: (dias = 7, filters?: AnalysisFilters) =>
    apiFetch<FleetFullResponse>(withAnalysisQuery('/api/fleet/full', filters, { dias })),
  loadingUnits: (turno = 'ACTUAL', filters?: AnalysisFilters) =>
    apiFetch<LoadingUnitsSummary>(withAnalysisQuery('/api/loading-units/summary', filters, { turno })),
  alerts: (filters?: AnalysisFilters) => apiFetch<ListResponse<SmartAlert>>(withAnalysisQuery('/api/alerts', filters)),
  operationalAlerts: (filters?: AnalysisFilters) => apiFetch<OperationalAlertsResponse>(withAnalysisQuery('/api/alerts/operational', filters)),
  shiftReport: (turno = 'ACTUAL', filters?: AnalysisFilters) =>
    apiFetch<ShiftReport>(withAnalysisQuery('/api/reports/shift', filters, { turno })),
  compare: (params: { desde_a?: string; hasta_a?: string; desde_b?: string; hasta_b?: string } = {}) => {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) search.set(key, value)
    })
    const query = search.toString()
    return apiFetch<CompareResponse>(`/api/compare${query ? `?${query}` : ''}`)
  },
}

export function getOperationsSummary(): Promise<OperationsSummaryResponse> {
  return apiFetch<OperationsSummaryResponse>('/api/operations/summary')
}

export function getDailyProduction(): Promise<DailyProduction[]> {
  return apiFetch<DailyProduction[]>('/api/operations/daily-production')
}

export function getHourlyProduction(turno = 'ACTUAL'): Promise<HourlyProduction[]> {
  return apiFetch<HourlyProduction[]>(`/api/operations/hourly-production?turno=${encodeURIComponent(turno)}`)
}

export function getCurrentShift(): Promise<ShiftCurrentResponse> {
  return apiFetch<ShiftCurrentResponse>('/api/shift/current')
}

export function getShiftHourlyTonnage(): Promise<OperationalCollection<CurrentShiftHourly>> {
  return apiFetch<OperationalCollection<CurrentShiftHourly>>('/api/shift/hourly-tonnage')
}

export function getShiftLoadingUnits(): Promise<OperationalCollection<CurrentShiftLoadingUnit>> {
  return apiFetch<OperationalCollection<CurrentShiftLoadingUnit>>('/api/shift/loading-units')
}

export function getShiftCaexRanking(): Promise<OperationalCollection<ShiftCaexRankingItem>> {
  return apiFetch<OperationalCollection<ShiftCaexRankingItem>>('/api/shift/caex-ranking')
}

export interface ShiftReportDateItem {
  fecha: string
  turno: 'DIA' | 'NOCHE' | string
  ciclos: number
}

export interface ShiftReportSnapshot {
  source: string
  historic: boolean
  fecha: string
  turno: 'DIA' | 'NOCHE' | string
  shift_label: string
  elapsed_minutes: number
  toneladas_turno: number
  ciclos: number
  meta_turno: number
  meta_configurada: boolean
  cumplimiento_pct: number
  hourly: Array<{ hora: number; label: string; toneladas: number; ciclos: number }>
  caex: ShiftCaexRankingItem[]
  loading_units: CurrentShiftLoadingUnit[]
  caex_model_routes?: CaexModelRoutesGroup[]
  generated_at: string
}

export function getShiftReportDates(): Promise<{ count: number; items: ShiftReportDateItem[] }> {
  return apiFetch<{ count: number; items: ShiftReportDateItem[] }>('/api/shift/report-dates')
}

export function getShiftReportSnapshot(fecha: string, turno: string): Promise<ShiftReportSnapshot> {
  return apiFetch<ShiftReportSnapshot>(`/api/shift/report-snapshot?fecha=${encodeURIComponent(fecha)}&turno=${encodeURIComponent(turno)}`)
}

export async function getShiftExport(exportType: 'shift' | 'caex' | 'loading' = 'shift'): Promise<Blob> {
  const response = await secureApi.get<Blob>(`/api/shift/export?export_type=${encodeURIComponent(exportType)}`, { responseType: 'blob' })
  return response.data
}

export async function getShiftExportXlsx(exportType: 'shift' | 'caex' | 'loading' = 'shift'): Promise<Blob> {
  const response = await secureApi.get<Blob>(`/api/shift/export.xlsx?export_type=${encodeURIComponent(exportType)}`, { responseType: 'blob' })
  return response.data
}

export function getFleetCaexRanking(): Promise<OperationalCollection<FleetFullRankingItem>> {
  return apiFetch<OperationalCollection<FleetFullRankingItem>>('/api/fleet/caex-ranking')
}

export function getFleetByModel(): Promise<OperationalCollection<FleetModelEfficiency>> {
  return apiFetch<OperationalCollection<FleetModelEfficiency>>('/api/fleet/caex-by-model')
}

export function getFleetFastest(): Promise<OperationalCollection<FleetFullRankingItem>> {
  return apiFetch<OperationalCollection<FleetFullRankingItem>>('/api/fleet/fastest')
}

export function getFleetSlowest(): Promise<OperationalCollection<FleetFullRankingItem>> {
  return apiFetch<OperationalCollection<FleetFullRankingItem>>('/api/fleet/slowest')
}

export function getFleetCycleTime(): Promise<FleetCycleTimeResponse> {
  return apiFetch<FleetCycleTimeResponse>('/api/fleet/cycle-time')
}

export function getFleetDistance(): Promise<DistanceSummary> {
  return apiFetch<DistanceSummary>('/api/fleet/distance')
}

export function getLoadingUnitRanking(): Promise<LoadingUnitsSummary> {
  return apiFetch<LoadingUnitsSummary>('/api/loading-units/ranking')
}

export function getLoadingUnitHourly(): Promise<OperationalCollection<CurrentShiftLoaderHourly>> {
  return apiFetch<OperationalCollection<CurrentShiftLoaderHourly>>('/api/loading-units/hourly')
}

export function getLoadingUnitDistanceCycle(): Promise<OperationalCollection<LoadingUnitDistanceItem>> {
  return apiFetch<OperationalCollection<LoadingUnitDistanceItem>>('/api/loading-units/distance-cycle')
}

export function getLoadingUnitRoutes(): Promise<OperationalCollection<RouteDistanceItem>> {
  return apiFetch<OperationalCollection<RouteDistanceItem>>('/api/loading-units/routes')
}

export function getAveriasSummary(): Promise<AveriaSummary> {
  return apiFetch<AveriaSummary>('/api/averias/summary')
}

export function getAveriasActive(): Promise<OperationalCollection<ActiveBreakdownItem>> {
  return apiFetch<OperationalCollection<ActiveBreakdownItem>>('/api/averias/active')
}

export function getAveriasHistory(): Promise<OperationalCollection<ActiveBreakdownItem>> {
  return apiFetch<OperationalCollection<ActiveBreakdownItem>>('/api/averias/history')
}

export function getAveriasInactivityAlerts(): Promise<OperationalCollection<ActiveBreakdownItem>> {
  return apiFetch<OperationalCollection<ActiveBreakdownItem>>('/api/averias/inactivity-alerts')
}

export interface AveriaImportedEvent {
  id: string
  equipment_id: string
  model?: string | null
  fecha?: string | null
  inicio?: string | null
  fin?: string | null
  duracion_min?: number | null
  sistema?: string | null
  tipo?: string | null
  descripcion?: string | null
  ot?: string | null
  estado?: string | null
  severidad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'SIN DATO' | string
  origen: 'correo' | 'manual' | 'carpeta' | string
  source_file?: string | null
  imported_at: string
}

export interface AveriaFleetSystem {
  name: string
  events: number
  min: number
}

export interface AveriaFleetEquipment {
  equipment_id: string
  model?: string | null
  events: number
  total_min: number
  costo_usd: number
  criticas: number
  disponibilidad_pct: number
  sistemas: AveriaFleetSystem[]
  tipos: AveriaFleetSystem[]
  tipo_principal?: string | null
  last_event?: string | null
}

export interface AveriaDowntimeCost {
  tasa_usd_por_min: number
  total_usd: number
  correctiva_usd: number
  programada_usd: number
  fuente_tasa: string
  nota: string
}

export interface AveriaMaintenanceKpis {
  dias_observados: number
  equipos: number
  disponibilidad_fisica_pct: number
  mttr_horas?: number | null
  mtbf_horas?: number | null
  num_averias: number
  horas_correctiva: number
  horas_programada: number
  pct_programada: number
  pct_correctiva: number
  peor_equipo?: { equipment_id: string; disponibilidad_pct: number } | null
}

export interface AveriaFleetDetail {
  source: string
  days: number
  count_events: number
  count_equipment: number
  total_min: number
  kpis?: AveriaMaintenanceKpis
  costos?: AveriaDowntimeCost
  equipment: AveriaFleetEquipment[]
  events: AveriaImportedEvent[]
  generated_at: string
}

export interface AveriaImportResult {
  status: string
  filename: string
  origen: string
  events_parsed: number
  events_imported: number
  events_duplicated: number
  notes: string[]
  generated_at: string
}

export interface AveriaMailStatus {
  mail_configured: boolean
  mail_host: string
  mail_user?: string | null
  mail_folder: string
  mail_sender_filter?: string | null
  watch_dir?: string | null
  total_events: number
  auto_sync?: {
    enabled: boolean
    interval_min: number
    last_run?: string | null
    last_result?: string | null
  }
  last_imports: Array<{
    kind: string
    source?: string | null
    filename?: string | null
    events: number
    imported_at: string
  }>
}

export interface AveriaMailSyncResult {
  folder: { status: string; detail?: string; imported_files: AveriaImportResult[]; errors?: string[] }
  mail: { status: string; detail?: string; imported_files: AveriaImportResult[]; errors?: string[] }
  generated_at: string
}

export interface AerialMailStatus {
  drive_configured: boolean
  drive_root_id?: string | null
  gmail_configured: boolean
  gmail_user?: string | null
  gmail_sender_filter?: string | null
  name_hint: string
  dest_dir_exists: boolean
  auto_sync?: {
    enabled: boolean
    interval_min: number
    last_run?: string | null
    last_result?: string | null
  }
}

export interface AerialSourceSyncResult {
  status: string
  detail?: string
  imported_files: Array<{ filename: string; size_mb: number; origen: string; subject?: string; fecha_vuelo?: string }>
  checked?: string[]
  errors?: string[]
}

export interface AerialMailSyncResult {
  drive: AerialSourceSyncResult
  mail: AerialSourceSyncResult
  generated_at: string
}

export function getAerialMailStatus(): Promise<AerialMailStatus> {
  return apiFetch<AerialMailStatus>('/api/aerial/mail-status')
}

// Vista previa JPEG del ortomosaico: se pide con auth y se entrega como
// object URL para usar directo en <img src>.
export async function getAerialPreviewUrl(fileName: string): Promise<string> {
  const response = await secureApi.get<Blob>(`/api/aerial/preview?file=${encodeURIComponent(fileName)}`, {
    responseType: 'blob',
  })
  return URL.createObjectURL(response.data)
}

export function postAerialMailSync(): Promise<AerialMailSyncResult> {
  return apiFetch<AerialMailSyncResult>('/api/aerial/mail-sync', { method: 'POST' })
}

export interface AveriaRecurrentPattern {
  equipment_id: string
  model?: string | null
  sistema: string
  eventos: number
  total_min: number
  gap_promedio_dias?: number | null
  tendencia: 'EN AUMENTO' | 'ESTABLE' | 'A LA BAJA' | string
  ultima_fecha?: string | null
  ultima_descripcion?: string | null
  causa_probable: string
  solucion_sugerida: string
  confianza: 'ALTA' | 'MEDIA' | string
}

export interface AveriaSystemTrend {
  sistema: string
  primera_mitad: number
  segunda_mitad: number
  variacion_pct: number
  direccion: 'SUBE' | 'BAJA' | 'ESTABLE' | string
}

export interface AveriaRiskEquipment {
  equipment_id: string
  model?: string | null
  score: number
  nivel: 'CRITICO' | 'ALTO' | 'MEDIO' | string
  razones: string[]
}

export interface AveriaInsights {
  source: string
  days: number
  eventos_analizados: number
  averias_analizadas: number
  recurrentes: AveriaRecurrentPattern[]
  tendencias_sistema: AveriaSystemTrend[]
  equipos_riesgo: AveriaRiskEquipment[]
  generated_at: string
}

export function getAveriasInsights(days = 31): Promise<AveriaInsights> {
  return apiFetch<AveriaInsights>(`/api/averias/insights?days=${days}`)
}

export interface ExpertFinding {
  titulo: string
  valor: string
  detalle: string
  tono: 'rojo' | 'ambar' | 'verde' | string
}

export interface ExpertAnalysis {
  source: string
  days: number
  hallazgos: ExpertFinding[]
  toneladas_perdidas: {
    total: number
    equipos: Array<{
      equipment_id: string
      dias_detenido: number
      ton_dia_promedio: number
      ton_perdidas: number
    }>
  }
  post_pm: {
    pct_dentro_7_dias?: number | null
    averias_post_pm: number
    equipos_repetidos: Array<{ equipment_id: string; casos: number }>
  }
  meta?: {
    meta_turno: number
    turnos_analizados: number
    pct_turnos_cumplidos: number
    mediana_turno: number
    percentil_meta: number
  } | null
  control_semanal?: {
    semana: string
    averias_semana: number
    promedio_historico: number
    limite_superior: number
    estado: string
  } | null
  generated_at: string
}

export interface CyclesHistoryStatus {
  total_ciclos: number
  desde?: string | null
  hasta?: string | null
  auto_sync?: { enabled: boolean; interval_min: number; last_run?: string | null; last_result?: string | null }
}

export interface ShiftStatusSourceItem {
  id: string
  estado?: string | null
  status_category?: string | null
  status_desc?: string | null
  destino?: string | null
}

export interface ShiftStatusSources {
  wenco_caex: ShiftStatusSourceItem[]
  wenco_uc: ShiftStatusSourceItem[]
  averias: {
    report_date?: string | null
    items: Array<{
      equipment_id: string
      model?: string | null
      estado: 'OP' | 'FS' | string
      tipo?: string | null
      sistema?: string | null
      descripcion?: string | null
    }>
  }
  generated_at?: string | null
}

export function getShiftStatusSources(): Promise<ShiftStatusSources> {
  return apiFetch<ShiftStatusSources>('/api/fleet/shift-status-sources')
}

export function getExpertAnalysis(days = 90): Promise<ExpertAnalysis> {
  return apiFetch<ExpertAnalysis>(`/api/analysis/expert?days=${days}`)
}

export function getCyclesHistoryStatus(): Promise<CyclesHistoryStatus> {
  return apiFetch<CyclesHistoryStatus>('/api/analysis/cycles-status')
}

export interface DispatchFilters {
  fechas: string[]
  turnos: string[]
  caex_ids: string[]
  carguio_ids: string[]
  fases: string[]
  mallas: string[]
}

export interface CycleAnomaly {
  equipment_id: string
  model?: string | null
  carguio_id?: string | null
  tipo: 'gap_cerrado' | 'gap_abierto' | string
  inicio: string
  fin?: string | null
  gap_min: number
  esperado_min: number
  umbral_min: number
  severidad: 'CRITICA' | 'ALTA' | string
}

export interface CycleAnomaliesResponse {
  source: string
  fecha?: string | null
  turno?: string | null
  modo: 'en_vivo' | 'historico' | string
  equipos_con_baseline: number
  anomalias: CycleAnomaly[]
  nota: string
  generated_at: string
}

export interface DispatchAnomalyQuery {
  fecha?: string
  turno?: string
  caex_id?: string
  carguio_id?: string
  fase?: string
  malla?: string
}

export function getDispatchFilters(days = 30): Promise<DispatchFilters> {
  return apiFetch<DispatchFilters>(`/api/dispatch/filters?days=${days}`)
}

export function getCycleAnomalies(query: DispatchAnomalyQuery = {}): Promise<CycleAnomaliesResponse> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value)
  }
  const qs = params.toString()
  return apiFetch<CycleAnomaliesResponse>(`/api/dispatch/cycle-anomalies${qs ? `?${qs}` : ''}`)
}

export function getAveriasFleetDetail(days = 31): Promise<AveriaFleetDetail> {
  return apiFetch<AveriaFleetDetail>(`/api/averias/fleet-detail?days=${days}`)
}

export function getAveriasMailStatus(): Promise<AveriaMailStatus> {
  return apiFetch<AveriaMailStatus>('/api/averias/mail-status')
}

export function postAveriasMailSync(): Promise<AveriaMailSyncResult> {
  return apiFetch<AveriaMailSyncResult>('/api/averias/mail-sync', { method: 'POST' })
}

export async function uploadAveriasXls(file: File): Promise<AveriaImportResult> {
  const form = new FormData()
  form.append('file', file)
  const response = await secureApi.post<AveriaImportResult>('/api/averias/import-xls', form)
  return response.data
}

export function getAerialStatus(): Promise<AerialStatus> {
  return apiFetch<AerialStatus>('/api/aerial/status')
}

export function getAerialFiles(): Promise<OperationalCollection<AerialFileItem>> {
  return apiFetch<OperationalCollection<AerialFileItem>>('/api/aerial/files')
}
