import type {
  ActiveBreakdownItem,
  AerialFileItem,
  AerialMailStatus,
  AerialStatus,
  AveriaFleetDetail,
  AveriaInsights,
  AveriaMailStatus,
  AveriaSummary,
  CockpitResponse,
  DecisionAuditResponse,
  DispatcherAdvisorResponse,
  HiddenLossesResponse,
  MonthlyTargetResponse,
  OperationalCollection,
  OperationalNlpResponse,
  ProfitOptimizationResponse,
  ShiftComparisonEquipmentHourlyPoint,
  ShiftComparisonEquipmentPoint,
  ShiftComparisonHourlyPoint,
  ShiftComparisonResponse,
} from '../lib/api'
import { buildOperationalMindMap, type MindMapGraph } from '../components/mindmap3d/mindMapModel'

export const FAST_PUBLIC_DEMO = import.meta.env.VITE_NORTHMINE_FAST_DEMO !== 'false'

const DEMO_DATE = '2026-07-29'
const DEMO_NOW = '2026-07-29T06:53:00-04:00'
const SHIFT_START = '2026-07-29T19:00:00-04:00'
const SHIFT_END = '2026-07-30T07:00:00-04:00'

// Nombres ficticios fijos por equipo (no genericos "OPERADOR NN"), consistentes
// entre Cockpit y Averias -- el mismo CAEX/pala muestra el mismo operador en
// ambos modulos, para que la demo cuente una historia coherente.
const DEMO_OPERATORS = {
  PALA1: 'Ricardo Fuentes',
  PALA2: 'Camila Vergara',
  CF2: 'Jorge Salinas',
  CAEX01: 'Manuel Contreras',
  CAEX07: 'Priscila Muñoz',
  CAEX09: 'Luis Bahamondes',
  CAEX12: 'Fernanda Rojas',
  CAEX15: 'Daniela Pizarro',
  CAEX18: 'Cristian Alarcón',
  CAEX22: 'Valentina Soto',
} as const

const cockpitHours = [
  ['19:00', 8580, 38],
  ['20:00', 7920, 36],
  ['21:00', 9010, 40],
  ['22:00', 7760, 35],
  ['23:00', 9920, 43],
  ['00:00', 8440, 38],
  ['01:00', 8670, 39],
  ['02:00', 8210, 37],
  ['03:00', 8740, 39],
  ['04:00', 9120, 41],
  ['05:00', 7830, 35],
  ['06:00', 8843, 39],
] as const

let accumulated = 0

const hourlyProduction = cockpitHours.map(([hour, tons, cycles]) => {
  accumulated += tons
  return {
    hour,
    tons,
    cycles,
    tonnes_per_cycle: Math.round((tons / cycles) * 10) / 10,
    accumulated,
  }
})

const loaders = [
  { id: 'PALA 1', model: 'P&H 4100XPC AC', status: 'OPERANDO', tons: 46180, cycles: 64, operator: DEMO_OPERATORS.PALA1, front: 'F02/2296/135/DEMO', destination: 'BOTADERO DEMO', pct: 92 },
  { id: 'PALA 2', model: 'P&H 4100XPC AC', status: 'OPERANDO', tons: 37620, cycles: 57, operator: DEMO_OPERATORS.PALA2, front: 'F01/2328/135/DEMO', destination: 'CHANCADO PRIMARIO DEMO', pct: 74 },
  { id: 'CF 2', model: 'CAT 994K', status: 'REVISAR', tons: 23243, cycles: 46, operator: DEMO_OPERATORS.CF2, front: 'F01/2280/135/DEMO', destination: 'BOTADERO DEMO', pct: 58 },
]

const loaderHourly = loaders.flatMap((loader, loaderIndex) =>
  cockpitHours.map(([hour, tons, cycles], hourIndex) => ({
    loader_id: loader.id,
    hour,
    tons: Math.max(0, Math.round(tons * ([0.44, 0.36, 0.2][loaderIndex] ?? 0.2) * (0.94 + ((hourIndex % 3) * 0.03)))),
    cycles: Math.max(1, Math.round(cycles * ([0.42, 0.34, 0.22][loaderIndex] ?? 0.2))),
    origin: loader.front,
    destination: loader.destination,
    avg_distance_km: 3.6 + (hourIndex % 4) * 0.2,
    avg_loading_time_min: 4.8 + (loaderIndex * 0.4),
    avg_loading_time_source: 'demo',
    avg_caex_wait_time_min: loaderIndex === 2 ? 2.1 : 0.8,
    avg_caex_wait_time_source: 'demo',
  })),
)

export const FAST_DEMO_COCKPIT: CockpitResponse = {
  status: 'OK',
  generated_at: DEMO_NOW,
  api_version: 'v1',
  data_source: 'DEMO',
  source_system: 'DEMO',
  source: 'fast-demo',
  mode: 'DEMOSTRACION',
  backend_status: 'DEMO LOCAL',
  data_source_status: 'DEMO SIN WENCO',
  selected_date: DEMO_DATE,
  selected_shift: 'NOCHE',
  last_real_record: DEMO_NOW,
  data_freshness_seconds: 0,
  is_demo: true,
  stale: false,
  shift: {
    name: 'NOCHE',
    date: DEMO_DATE,
    started_at: SHIFT_START,
    ends_at: SHIFT_END,
    current_time: DEMO_NOW,
    elapsed_minutes: 713,
    elapsed_pct: 99,
  },
  health: { score: 96, state: 'OPERACION DEMO FLUIDA' },
  production: {
    actual_tonnes: 107043,
    forecast_tonnes: 112600,
    target_tonnes: 70000,
    daily_target_tonnes: 140000,
    target_source: 'DEMO',
    non_compliance_risk: 0.05,
    cycles: 459,
    caex_active: 18,
    caex_inactive: 3,
    caex_possible_breakdown: 1,
    avg_tonnes_per_cycle: 233.2,
    avg_caex_in_circuit: 18.4,
    compliance_pct: 152.9,
    sectors: [
      { sector: 'F01', actual_tonnes: 68210, forecast_tonnes: 71760, cycles: 292, pct_of_total: 63.7, source: 'demo' },
      { sector: 'F02', actual_tonnes: 38833, forecast_tonnes: 40840, cycles: 167, pct_of_total: 36.3, source: 'demo' },
    ],
  },
  economics: {
    total_cost_usd: 322900,
    cost_per_tonne_usd: 3.02,
    estimated_loss_usd: 18400,
    potential_close_loss_usd: 0,
    fuel_liters: 42800,
    fuel_cost_usd: 51360,
    source: 'demo',
  },
  main_cause: { cause: 'Cola puntual en CF 2', impact_pct: 13 },
  why: [
    { cause: 'Cola puntual en CF 2', impact_pct: 13 },
    { cause: 'Ciclo CAEX22 sobre referencia', impact_pct: 8 },
    { cause: 'Cambio de frente planificado', impact_pct: 5 },
  ],
  happening: ['Turno sobre meta', 'CF 2 con menor eficiencia', 'PALA 1 sostiene el ritmo del turno'],
  recommendation: {
    title: 'Mantener PALA 1 y mover un CAEX hacia CF 2 por 30 min.',
    impact_tons: 3260,
    impact_usd: 14500,
    queue_delta_min: -1.7,
    confidence: 'ALTA',
  },
  scenarios: [
    { scenario: 'Actual', tons: 112600, cost: 322900, cost_per_tonne: 3.02, risk: 'Bajo', value: 'Base' },
    { scenario: 'Redistribuir CAEX', tons: 115860, cost: 327200, cost_per_tonne: 2.82, risk: 'Bajo', value: '+USD 14.500' },
    { scenario: 'Agregar 1 CAEX', tons: 116900, cost: 335800, cost_per_tonne: 2.87, risk: 'Medio', value: '+USD 11.200' },
  ],
  warnings: [],
  confidence: 'ALTA',
  refresh_policy: { kpis_seconds: 0, analytics_seconds: 0, heavy_analysis_seconds: 0, simulation: 'fast-demo' },
  hourly_production: hourlyProduction,
  loader_hourly: loaderHourly,
  delays: [
    { type: 'Cambio de frente', minutes: 18 },
    { type: 'Combustible', minutes: 12 },
    { type: 'Espera CAEX', minutes: 9 },
  ],
  caex_status: [
    { caex_id: 'CAEX01', model: 'CAT 793F', status: 'OPERATIVO', tons: 7820, cycles: 34, minutes_inactive: 2, operator: DEMO_OPERATORS.CAEX01, loading_unit: 'PALA 1', destination: 'BOTADERO DEMO' },
    { caex_id: 'CAEX07', model: 'KOM 980E', status: 'OPERATIVO', tons: 7510, cycles: 32, minutes_inactive: 4, operator: DEMO_OPERATORS.CAEX07, loading_unit: 'PALA 2', destination: 'CHANCADO PRIMARIO DEMO' },
    { caex_id: 'CAEX12', model: 'CAT 798AC', status: 'OPERATIVO', tons: 8140, cycles: 35, minutes_inactive: 1, operator: DEMO_OPERATORS.CAEX12, loading_unit: 'PALA 1', destination: 'BOTADERO DEMO' },
    { caex_id: 'CAEX18', model: 'KOM 980E', status: 'STANDBY', tons: 4120, cycles: 18, minutes_inactive: 16, operator: DEMO_OPERATORS.CAEX18, loading_unit: 'CF 2', destination: 'BOTADERO DEMO' },
    { caex_id: 'CAEX22', model: 'CAT 793F', status: 'DEMORA', tons: 3680, cycles: 16, minutes_inactive: 22, operator: DEMO_OPERATORS.CAEX22, loading_unit: 'CF 2', destination: 'BOTADERO DEMO' },
  ],
  shovels: loaders.map((loader) => ({
    id: loader.id,
    model: loader.model,
    status: loader.status,
    queue_min: loader.id === 'CF 2' ? 2.4 : 0.7,
    tons: loader.tons,
    cycles: loader.cycles,
    avg_tonnes_per_cycle: Math.round((loader.tons / loader.cycles) * 10) / 10,
    efficiency_pct: loader.id === 'CF 2' ? 72.2 : loader.id === 'PALA 2' ? 82.4 : 94.6,
    front: loader.front,
    destination: loader.destination,
    destination_pct: loader.pct,
    last_activity: DEMO_NOW,
    minutes_inactive: loader.id === 'CF 2' ? 8 : 1,
    operator: loader.operator,
  })),
  destinations: [
    { destination: 'BOTADERO DEMO', pct: 62, tons: 66367 },
    { destination: 'CHANCADO PRIMARIO DEMO', pct: 38, tons: 40676 },
  ],
  events: ['PALA 1 sostiene 43% del aporte', 'CF 2 requiere monitoreo de cola', 'Ritmo de turno sobre meta'],
  operational_alerts: {
    counts: { baja: 2, media: 1, alta: 0 },
    items: [
      { id: 'demo-alert-1', equipment_id: 'CF 2', title: 'Cola de CAEX sobre referencia', severity: 'MEDIUM', status: 'OPEN', relative_minutes: 9 },
    ],
    low_caex: [],
  },
  data_quality: {
    status: 'OK',
    score: 100,
    completeness_pct: 100,
    cycles_total: 459,
    cycles_with_time: 459,
    cycles_with_destination: 459,
    cycles_with_loader: 459,
    last_record_at: DEMO_NOW,
    last_record_age_min: 0,
    stale: false,
    source: 'fast-demo',
  },
  availability: 97,
}

export const FAST_DEMO_MONTHLY_TARGET: MonthlyTargetResponse = {
  status: 'OK',
  api_version: 'v1',
  generated_at: DEMO_NOW,
  data_source: 'DEMO',
  demo_label: 'Fast demo',
  source_system: 'DEMO',
  period: { month: 7, year: 2026, label: 'Julio 2026', start_date: '2026-07-01', end_date: DEMO_DATE, month_end_date: '2026-07-31' },
  sector: 'F01',
  daily_target_f01_tonnes: 140000,
  monthly_target_f01_tonnes: 3920000,
  mov_programado_acumulado: 3640000,
  mov_real_acumulado: 3714200,
  mov_f02_acumulado: 1112000,
  mov_total_con_f02: 4826200,
  mov_diferencia: 74200,
  cumplimiento_pct: 102,
  quality: 'DEMO',
  last_updated: DEMO_NOW,
  program_source: 'fast-demo',
  real_source: 'fast-demo',
  daily_breakdown: Array.from({ length: 8 }, (_, index) => ({
    date: `2026-07-${String(22 + index).padStart(2, '0')}`,
    day: 22 + index,
    f01_programmed_tonnes: 130000,
    f01_real_tonnes: 132000 + index * 1800,
    f01_difference_tonnes: 2000 + index * 1800,
    f01_cumplimiento_pct: 101 + index * 0.8,
    f02_real_tonnes: 39000 + index * 900,
    total_real_tonnes: 171000 + index * 2700,
    total_vs_f01_target_pct: 124 + index,
    status: 'OK',
    tone: 'BULL',
    is_future: false,
  })),
  stale: false,
  warnings: [],
}

export const FAST_DEMO_PROFIT: ProfitOptimizationResponse = {
  status: 'OK',
  generated_at: DEMO_NOW,
  api_version: 'v1',
  data_source: 'DEMO',
  source: 'fast-demo',
  mode: 'DEMOSTRACION',
  is_demo: true,
  stale: false,
  objective: 'MAX_RISK_ADJUSTED_VALUE',
  shift: FAST_DEMO_COCKPIT.shift,
  baseline: { production_tonnes: 107043, target_tonnes: 70000, cost_per_tonne_usd: 3.02, estimated_losses_usd: 18400, non_compliance_risk: 0.05 },
  best_scenario_id: 'redistribute_caex',
  recommendation: {
    title: 'Redistribuir CAEX22 a CF 2',
    summary: 'Recupera cola sin subir riesgo operacional.',
    best_scenario_id: 'redistribute_caex',
    why: 'CF 2 es el unico cuello visible del turno.',
    confidence: 'ALTA',
    feasibility: 'ALTA',
    risk_adjusted_value_usd: 24500,
    value_delta_usd: 14500,
  },
  best: {
    highest_production: 'add_caex',
    lowest_cost: 'current',
    lowest_cost_per_tonne: 'redistribute_caex',
    highest_margin: 'redistribute_caex',
    highest_risk_adjusted_value: 'redistribute_caex',
  },
  scenarios: [
    { id: 'current', name: 'Actual', description: 'Mantener asignacion', production_tonnes: 112600, production_delta_tonnes: 0, total_cost_usd: 322900, cost_delta_usd: 0, cost_per_tonne_usd: 3.02, estimated_losses_usd: 18400, loss_delta_usd: 0, gross_margin_usd: 184000, margin_per_tonne_usd: 1.72, risk: 0.05, risk_label: 'Bajo', risk_penalty_usd: 3200, risk_adjusted_value_usd: 10000, value_delta_usd: 0, confidence: 'ALTA', feasibility: 'ALTA', tradeoff: 'Sin intervencion.' },
    { id: 'redistribute_caex', name: 'Redistribuir CAEX', description: 'Mover CAEX22 por 30 min', production_tonnes: 115860, production_delta_tonnes: 3260, total_cost_usd: 327200, cost_delta_usd: 4300, cost_per_tonne_usd: 2.82, estimated_losses_usd: 10200, loss_delta_usd: -8200, gross_margin_usd: 198500, margin_per_tonne_usd: 1.71, risk: 0.06, risk_label: 'Bajo', risk_penalty_usd: 3800, risk_adjusted_value_usd: 24500, value_delta_usd: 14500, confidence: 'ALTA', feasibility: 'ALTA', tradeoff: 'Mayor coordinacion en despacho.' },
    { id: 'add_caex', name: 'Agregar 1 CAEX', description: 'Refuerzo corto a PALA 2', production_tonnes: 116900, production_delta_tonnes: 4300, total_cost_usd: 335800, cost_delta_usd: 12900, cost_per_tonne_usd: 2.87, estimated_losses_usd: 9800, loss_delta_usd: -8600, gross_margin_usd: 195200, margin_per_tonne_usd: 1.67, risk: 0.12, risk_label: 'Medio', risk_penalty_usd: 9600, risk_adjusted_value_usd: 21200, value_delta_usd: 11200, confidence: 'MEDIA', feasibility: 'MEDIA', tradeoff: 'Mayor costo y cruce operacional.' },
  ],
  ranking: [
    { scenario_id: 'redistribute_caex', name: 'Redistribuir CAEX', risk_adjusted_value_usd: 24500, rank_metric: 'Valor ajustado' },
    { scenario_id: 'add_caex', name: 'Agregar 1 CAEX', risk_adjusted_value_usd: 21200, rank_metric: 'Produccion' },
    { scenario_id: 'current', name: 'Actual', risk_adjusted_value_usd: 10000, rank_metric: 'Base' },
  ],
  insights: ['La demo prioriza flujo rapido: calculo precargado en memoria.', 'CF 2 concentra la principal oportunidad visual.'],
  assumptions: { value_per_tonne_usd: 4.45, risk_penalty_factor: 0.2, cost_source: 'demo', optimization_scope: 'turno' },
  warnings: [],
}

const hiddenLoss = {
  id: 'loss-cf2-queue',
  category: 'Cola carguio',
  title: 'Cola puntual en CF 2',
  equipment_id: 'CF 2',
  loss_usd: 18400,
  recoverable_usd: 14500,
  lost_tonnes: 3260,
  lost_hours: 0.5,
  lost_minutes: 30,
  confidence: 'ALTA',
  severity: 'MEDIA',
  evidence: ['Espera CAEX sobre referencia', 'PALA 1 mantiene ritmo lider'],
  recommendation: 'Mover CAEX22 hacia CF 2 por 30 minutos.',
  impact: { fuel_liters: 1200, fuel_cost_usd: 1440, wear_cost_usd: 2600 },
}

export const FAST_DEMO_HIDDEN_LOSSES: HiddenLossesResponse = {
  status: 'OK',
  generated_at: DEMO_NOW,
  api_version: 'v1',
  data_source: 'DEMO',
  source: 'fast-demo',
  mode: 'DEMOSTRACION',
  is_demo: true,
  stale: false,
  summary: { hidden_loss_usd: 18400, recoverable_value_usd: 14500, potential_tonnes: 3260, lost_hours: 0.5, confidence: 'ALTA', primary_source: 'CF 2', primary_category: 'Cola carguio', primary_recommendation: hiddenLoss.recommendation },
  primary_source: hiddenLoss,
  losses: [hiddenLoss],
  by_equipment: [{ equipment_id: 'CF 2', loss_usd: 18400, lost_hours: 0.5, sources: ['Cola carguio'] }],
  recommendations: [{ title: hiddenLoss.recommendation, source_loss_id: hiddenLoss.id, recoverable_usd: 14500, confidence: 'ALTA' }],
  insights: ['La mayor perdida recuperable esta concentrada en una sola accion.'],
  assumptions: { delay_cost_usd_per_min: 610, value_per_tonne_usd: 4.45, fuel_liters_per_tonne: 0.4, scope: 'fast-demo' },
  warnings: [],
  shift: FAST_DEMO_COCKPIT.shift,
}

export const FAST_DEMO_NLP: OperationalNlpResponse = {
  status: 'OK',
  generated_at: DEMO_NOW,
  api_version: 'v1',
  data_source: 'DEMO',
  source: 'fast-demo',
  mode: 'DEMOSTRACION',
  is_demo: true,
  stale: false,
  summary: { emerging_pattern: 'Espera CAEX en carguio', frequency: 3, shifts_analyzed: 4, associated_equipment: ['CF 2', 'CAEX22'], estimated_lost_hours: 0.5, estimated_impact_usd: 14500, trend: 'ESTABLE', confidence: 'ALTA' },
  patterns: [
    { id: 'p-wait', label: 'Espera CAEX', category: 'Despacho', frequency: 3, free_text_frequency: 1, source_documents: ['turno-demo'], trend: 'ESTABLE', confidence: 'ALTA', estimated_lost_hours: 0.5, estimated_impact_usd: 14500, linked_hidden_loss_usd: 14500, associated_equipment: ['CF 2'], associated_operators: ['OPERADOR UC 01'], keywords: ['cola', 'espera', 'reasignar'], evidence: ['Repetido en ultimas horas'], recommendation: 'Reasignar un CAEX y monitorear cola.' },
  ],
  entities: { equipment: [{ id: 'CF 2', mentions: 3, patterns: ['Espera CAEX'] }], operators: [{ id: 'OPERADOR UC 01', mentions: 1, patterns: ['Espera CAEX'] }] },
  source_mix: { total_texts: 8, free_texts: 2, alert_texts: 6 },
  hidden_loss_context: { recoverable_value_usd: 14500, primary_source: 'CF 2' },
  recommendations: [{ title: 'Mover CAEX22 hacia CF 2', pattern_id: 'p-wait', estimated_impact_usd: 14500, confidence: 'ALTA' }],
  insights: ['El lenguaje operacional coincide con la senal de datos.'],
  warnings: [],
}

export const FAST_DEMO_DISPATCHER: DispatcherAdvisorResponse = {
  status: 'OK',
  generated_at: DEMO_NOW,
  api_version: 'v1',
  data_source: 'DEMO',
  source_system: 'DEMO',
  source: 'fast-demo',
  mode: 'DEMOSTRACION',
  selected_date: DEMO_DATE,
  selected_shift: 'NOCHE',
  shift: FAST_DEMO_COCKPIT.shift,
  is_demo: true,
  stale: false,
  advisor: {
    situation: 'Turno sobre meta con cola puntual en CF 2.',
    probable_cause: 'Asignacion CAEX temporalmente desbalanceada.',
    action: { title: 'Redistribuir CAEX22 hacia CF 2', type: 'REDISTRIBUCION_OPERACIONAL', rationale: ['Recupera cola sin abrir nuevo frente', 'Impacto alto y riesgo bajo'] },
    target_equipment: ['CF 2', 'CAEX22'],
    impact: { productivity_pct: 3.1, production_tonnes: 3260, queue_delta_min: -1.7, expected_value_usd: 14500, hidden_recoverable_usd: 14500, nlp_impact_usd: 14500 },
    risk: 'BAJO',
    confidence: 'ALTA',
    execution_window_min: 30,
  },
  evidence: [
    { source: 'cockpit', title: 'Equipo a revisar', detail: 'CF 2 bajo referencia de eficiencia.', weight: 0.44 },
    { source: 'hidden_losses', title: 'Valor recuperable', detail: 'USD 14.500 en 30 minutos.', weight: 0.36 },
  ],
  alternatives: [
    { id: 'hold', name: 'Mantener asignacion', expected_value_usd: 0, production_tonnes: 0, risk: 'BAJO', confidence: 'ALTA' },
    { id: 'redistribute', name: 'Redistribuir CAEX22', expected_value_usd: 14500, production_tonnes: 3260, risk: 'BAJO', confidence: 'ALTA' },
  ],
  traceability: { inputs: [{ endpoint: '/api/cockpit', api_version: 'v1', status: 'OK' }], decision_policy: 'fast-demo' },
  data_quality: { score: 100, cockpit_status: 'OK', texts_analyzed: 8, free_texts: 2, alert_texts: 6, hidden_loss_confidence: 'ALTA' },
  warnings: [],
}

const auditImpact = { delta_tonnes: 3260, delta_usd: 14500, delta_risk: -0.01, queue_reduction_minutes: 1.7 }

export const FAST_DEMO_DECISION_AUDIT: DecisionAuditResponse = {
  status: 'OK',
  generated_at: DEMO_NOW,
  api_version: 'v1',
  data_source: 'DEMO',
  demo_label: 'Fast demo',
  source_system: 'DEMO',
  operational_source_system: 'DEMO',
  advisor_source: 'fast-demo',
  mode: 'DEMOSTRACION',
  is_demo: true,
  selected_date: DEMO_DATE,
  selected_shift: 'NOCHE',
  current_decision: {
    recommendation: {
      decision_id: 'demo-decision-1',
      advisor_recommendation_id: 'redistribute',
      generated_at: DEMO_NOW,
      source: 'fast-demo',
      situation: 'Cola puntual en CF 2',
      recommended_action: 'Redistribuir CAEX22 hacia CF 2',
      action_type: 'REDISTRIBUCION_OPERACIONAL',
      expected_impact: auditImpact,
      confidence: 'ALTA',
      evidence: [],
      status: 'PENDIENTE',
    },
    execution_status: 'PENDIENTE',
    actual_impact: { delta_tonnes: null, delta_usd: null, delta_risk: null, queue_reduction_minutes: null },
    evaluation: { status: 'INSUFICIENTE', effectiveness_score: null, expected_value_usd: 14500, actual_value_usd: null, value_recovery_ratio: null, tonnage_accuracy: null, risk_accuracy: null, overall_accuracy: null, warnings: [] },
  },
  summary: { recommendations: 8, executed: 6, partial: 1, not_executed: 1, adoption_rate_pct: 75, average_effectiveness_pct: 82, advisor_accuracy_pct: 86, expected_value_usd: 78000, actual_value_usd: 64000, realized_value_usd: 64000, value_recovery_ratio_pct: 82, principal_strength: 'Acciones de despacho', principal_deviation: 'Ejecucion tardia', message: 'Demo con historial sintetico liviano.', confidence: 'ALTA' },
  historical_metrics: { status: 'OK', recommendations: 8, executed: 6, partial: 1, not_executed: 1, pending: 0, adoption_rate_pct: 75, evaluated: 7, minimum_required: 5, average_effectiveness_pct: 82, economic_accuracy_pct: 84, tonnage_accuracy_pct: 88, expected_value_usd: 78000, actual_value_usd: 64000, value_recovery_ratio_pct: 82, average_deviation_usd: 2100, best_action_type: { action_type: 'REDISTRIBUCION_OPERACIONAL', effectiveness_pct: 88, count: 4 }, worst_action_type: { action_type: 'AGREGAR_CAEX', effectiveness_pct: 64, count: 1 }, by_action_type: [{ action_type: 'REDISTRIBUCION_OPERACIONAL', effectiveness_pct: 88, count: 4 }], message: 'Historial demo suficiente.' },
  records: [],
  executive_summary: null,
  confidence: 'ALTA',
  message: 'Demo rapida con auditoria sintetica.',
  warnings: [],
}

function shiftComparisonHourly(): ShiftComparisonHourlyPoint[] {
  return cockpitHours.map(([hour, tons, cycles], index) => ({
    slot: index + 1,
    label: `H+${index + 1}`,
    dia_hour: `${String(7 + index).padStart(2, '0')}:00`,
    noche_hour: hour,
    dia_tonnes: Math.round(tons * 0.86),
    noche_tonnes: tons,
    difference_tonnes: Math.round(tons * 0.14),
    dia_cycles: Math.round(cycles * 0.86),
    noche_cycles: cycles,
    leader: 'NOCHE',
  }))
}

function equipmentPoint(id: string, model: string, total: number, cycles: number, leader: 'DIA' | 'NOCHE' = 'NOCHE'): ShiftComparisonEquipmentPoint {
  const dia = Math.round(total * 0.46)
  const noche = total - dia
  const diaCycles = Math.round(cycles * 0.45)
  const nocheCycles = cycles - diaCycles
  return {
    id,
    model,
    operator: id.startsWith('PALA') || id.startsWith('CF') ? 'OPERADOR UC 02' : 'OPERADOR CAEX',
    dia_operator: 'OPERADOR TURNO DIA',
    noche_operator: 'OPERADOR TURNO NOCHE',
    dia_tonnes: dia,
    noche_tonnes: noche,
    dia_cycles: diaCycles,
    noche_cycles: nocheCycles,
    total_tonnes: total,
    total_cycles: cycles,
    difference_tonnes: noche - dia,
    leader,
    assigned_caex: 6,
    main_destination: 'BOTADERO DEMO',
    destination_pct: 82,
    bench_mesh: 'F02/2296/135/DEMO',
    bench_mesh_pct: 74,
    avg_distance_km: 3.9,
    efficiency_pct: id === 'CF 2' ? 72.2 : 92.4,
    status_code: id === 'CF 2' ? 'O11' : 'OK',
    status_desc: id === 'CF 2' ? 'Cola puntual' : 'Operativo',
    status_category: id === 'CF 2' ? 'delay' : 'active',
    status_started_at: DEMO_NOW,
  }
}

const loadingUnits = [
  equipmentPoint('PALA 1', 'P&H 4100XPC AC', 46180, 64),
  equipmentPoint('PALA 2', 'P&H 4100XPC AC', 37620, 57),
  equipmentPoint('CF 2', 'CAT 994K', 23243, 46),
]

const loadingUnitHourly: ShiftComparisonEquipmentHourlyPoint[] = loadingUnits.flatMap((unit, unitIndex) =>
  shiftComparisonHourly().map((row) => ({
    ...row,
    equipment_id: unit.id,
    dia_tonnes: Math.round(row.dia_tonnes * ([0.44, 0.36, 0.2][unitIndex] ?? 0.2)),
    noche_tonnes: Math.round(row.noche_tonnes * ([0.44, 0.36, 0.2][unitIndex] ?? 0.2)),
    dia_cycles: Math.max(1, Math.round(row.dia_cycles * ([0.42, 0.34, 0.22][unitIndex] ?? 0.2))),
    noche_cycles: Math.max(1, Math.round(row.noche_cycles * ([0.42, 0.34, 0.22][unitIndex] ?? 0.2))),
    dia_operator: 'OPERADOR DIA',
    noche_operator: unit.operator ?? 'OPERADOR NOCHE',
    dia_origin: 'F01/2328/135/DEMO',
    noche_origin: unit.bench_mesh,
    dia_destination: 'CHANCADO PRIMARIO DEMO',
    noche_destination: unit.main_destination,
    dia_distance_km: 3.5,
    noche_distance_km: 3.9,
    dia_loaded_distance_km: 2.4,
    noche_loaded_distance_km: 2.7,
    dia_loading_time_min: 5.2,
    noche_loading_time_min: 4.8,
    dia_loading_time_source: 'demo',
    noche_loading_time_source: 'demo',
    dia_caex_wait_time_min: 1.1,
    noche_caex_wait_time_min: unit.id === 'CF 2' ? 2.4 : 0.7,
    dia_caex_wait_time_source: 'demo',
    noche_caex_wait_time_source: 'demo',
    dia_transport_time_min: 15.5,
    noche_transport_time_min: 14.8,
    dia_empty_return_time_min: 10.4,
    noche_empty_return_time_min: 9.7,
    dia_cycle_time_min: 31.1,
    noche_cycle_time_min: unit.id === 'CF 2' ? 32.4 : 29.8,
    noche_status_breakdown: unit.id === 'CF 2' && row.slot === 7 ? [{ code: 'O11', description: 'Combustible', category: 'delay', minutes: 18, pct: 100, occurrences: 1 }] : [],
  })),
)

export const FAST_DEMO_SHIFT_COMPARISON: ShiftComparisonResponse = {
  status: 'OK',
  api_version: 'v1',
  data_source: 'DEMO',
  source_system: 'DEMO',
  source: 'fast-demo',
  selected_date: DEMO_DATE,
  operational_context: { turno_nombre: 'NOCHE', fecha_operacional: DEMO_DATE, turno_inicio: SHIFT_START, turno_fin: SHIFT_END, current_time: DEMO_NOW, elapsed_minutes: 713 },
  generated_at: DEMO_NOW,
  stale: false,
  summary: {
    dia: { shift: 'DIA', label: 'Turno Dia', total_tonnes: 91200, cycles: 392, avg_tonnes_per_cycle: 232.6, caex_count: 18, loading_units_count: 3 },
    noche: { shift: 'NOCHE', label: 'Turno Noche', total_tonnes: 107043, cycles: 459, avg_tonnes_per_cycle: 233.2, caex_count: 18, loading_units_count: 3 },
    difference_tonnes: 15843,
    leader: 'NOCHE',
  },
  hourly: shiftComparisonHourly(),
  loading_units: loadingUnits,
  loading_unit_hourly: loadingUnitHourly,
  caex: [
    equipmentPoint('CAEX01', 'CAT 793F', 7820, 34),
    equipmentPoint('CAEX07', 'KOM 980E', 7510, 32),
    equipmentPoint('CAEX22', 'CAT 793F', 3680, 16),
  ],
  caex_hourly: [],
  warnings: [],
}

export const FAST_DEMO_AVERIAS_SUMMARY: AveriaSummary = {
  source: 'fast-demo',
  active_breakdowns: 3,
  inactive_equipment: 2,
  maintenance_equipment: 2,
  critical_alerts: 1,
  high_alerts: 1,
  items: [
    {
      id: 'av-1',
      equipment_id: 'CAEX09',
      model: 'KOM980E-5',
      status: 'MANTENCION',
      severity: 'CRITICA',
      started_at: '2026-07-29T05:03:00-04:00',
      last_activity: DEMO_NOW,
      duration_min: 110,
      description: `AVERIA hidraulica recurrente (4a vez en 3 semanas), mismo circuito de direccion, turno de ${DEMO_OPERATORS.CAEX09}`,
      recommendation: 'Detener y reemplazar el sello con especificacion certificada; no purgar como solucion temporal, el patron indica desgaste estructural, no aire en el circuito. Enviar el lote de sellos actual a control de calidad.',
    },
    {
      id: 'av-2',
      equipment_id: 'CAEX22',
      model: 'CAT 793F',
      status: 'DEMORA',
      severity: 'ALTA',
      started_at: DEMO_NOW,
      last_activity: DEMO_NOW,
      duration_min: 22,
      description: `AVERIA de combustible y cola de despacho, turno de ${DEMO_OPERATORS.CAEX22}`,
      recommendation: 'Liberar o reasignar en 30 min si no hay mejora de presion.',
    },
    {
      id: 'av-3',
      equipment_id: 'CF 2',
      model: 'CAT 994K',
      status: 'MANTENCION',
      severity: 'MEDIA',
      started_at: DEMO_NOW,
      last_activity: DEMO_NOW,
      duration_min: 18,
      description: `MANTENCION hidraulica corta, turno de ${DEMO_OPERATORS.CF2}`,
      recommendation: 'Monitorear presion y cola; sin patron previo en este equipo, no requiere escalar.',
    },
  ],
  generated_at: DEMO_NOW,
}

export const FAST_DEMO_AVERIAS_HISTORY: OperationalCollection<ActiveBreakdownItem> = {
  source: 'fast-demo',
  count: 3,
  generated_at: DEMO_NOW,
  items: FAST_DEMO_AVERIAS_SUMMARY.items ?? [],
}

// Historial de 3+ semanas con fallas repetidas en el mismo componente
// (CAEX09 hidraulico, CAEX15 combustible, PALA 2 sensor de giro) para que
// "Averias" muestre un patron real de recurrencia, no eventos aislados.
const averiaEvents = [
  { id: 'ev-caex09-1', equipment_id: 'CAEX09', model: 'KOM980E-5', fecha: '2026-07-08', inicio: '2026-07-08T09:12:00-04:00', fin: '2026-07-08T09:52:00-04:00', duracion_min: 40, sistema: 'Hidraulico', tipo: 'Averia propia', descripcion: `Fuga menor en sistema hidraulico de direccion, detectada en inspeccion de rutina (turno ${DEMO_OPERATORS.CAEX09})`, ot: 'OT-8912', estado: 'OP', severidad: 'MEDIA', origen: 'correo', source_file: 'estatus_demo.xlsx', imported_at: DEMO_NOW },
  { id: 'ev-caex09-2', equipment_id: 'CAEX09', model: 'KOM980E-5', fecha: '2026-07-16', inicio: '2026-07-16T14:05:00-04:00', fin: '2026-07-16T15:10:00-04:00', duracion_min: 65, sistema: 'Hidraulico', tipo: 'Averia propia', descripcion: `Perdida de presion hidraulica en cilindro de tolva, requiere ajuste de sello (turno ${DEMO_OPERATORS.CAEX09})`, ot: 'OT-8951', estado: 'OP', severidad: 'ALTA', origen: 'correo', source_file: 'estatus_demo.xlsx', imported_at: DEMO_NOW },
  { id: 'ev-caex09-3', equipment_id: 'CAEX09', model: 'KOM980E-5', fecha: '2026-07-24', inicio: '2026-07-24T02:40:00-04:00', fin: '2026-07-24T04:15:00-04:00', duracion_min: 95, sistema: 'Hidraulico', tipo: 'Averia propia', descripcion: `Falla de bomba hidraulica principal, cambio de sello y purga de circuito (turno ${DEMO_OPERATORS.CAEX09})`, ot: 'OT-8987', estado: 'OP', severidad: 'CRITICA', origen: 'correo', source_file: 'estatus_demo.xlsx', imported_at: DEMO_NOW },
  { id: 'ev-caex09-4', equipment_id: 'CAEX09', model: 'KOM980E-5', fecha: DEMO_DATE, inicio: '2026-07-29T05:03:00-04:00', fin: null, duracion_min: 110, sistema: 'Hidraulico', tipo: 'Averia propia', descripcion: `Recurrencia de falla hidraulica, mismo circuito que el evento anterior, sello posiblemente de lote defectuoso (turno ${DEMO_OPERATORS.CAEX09})`, ot: 'OT-9003', estado: 'F/S', severidad: 'CRITICA', origen: 'correo', source_file: 'estatus_demo.xlsx', imported_at: DEMO_NOW },

  { id: 'ev-caex15-1', equipment_id: 'CAEX15', model: 'CAT789D', fecha: '2026-07-10', inicio: '2026-07-10T11:20:00-04:00', fin: '2026-07-10T11:44:00-04:00', duracion_min: 24, sistema: 'Combustible', tipo: 'Averia propia', descripcion: `Filtro de combustible con restriccion, cambio preventivo (turno ${DEMO_OPERATORS.CAEX15})`, ot: 'OT-8921', estado: 'OP', severidad: 'MEDIA', origen: 'correo', source_file: 'estatus_demo.xlsx', imported_at: DEMO_NOW },
  { id: 'ev-caex15-2', equipment_id: 'CAEX15', model: 'CAT789D', fecha: '2026-07-19', inicio: '2026-07-19T20:10:00-04:00', fin: '2026-07-19T20:40:00-04:00', duracion_min: 30, sistema: 'Combustible', tipo: 'Averia propia', descripcion: `Baja presion de combustible en arranque, purga de aire en la linea (turno ${DEMO_OPERATORS.CAEX15})`, ot: 'OT-8963', estado: 'OP', severidad: 'MEDIA', origen: 'correo', source_file: 'estatus_demo.xlsx', imported_at: DEMO_NOW },
  { id: 'ev-caex15-3', equipment_id: 'CAEX15', model: 'CAT789D', fecha: '2026-07-27', inicio: '2026-07-27T03:15:00-04:00', fin: '2026-07-27T03:43:00-04:00', duracion_min: 28, sistema: 'Combustible', tipo: 'Averia propia', descripcion: `Repite baja presion, mismo sintoma del evento anterior, sospecha de bomba de combustible con desgaste (turno ${DEMO_OPERATORS.CAEX15})`, ot: 'OT-8996', estado: 'OP', severidad: 'ALTA', origen: 'correo', source_file: 'estatus_demo.xlsx', imported_at: DEMO_NOW },

  { id: 'ev-pala2-1', equipment_id: 'PALA 2', model: 'P&H 4100XPC AC', fecha: '2026-07-14', inicio: '2026-07-13T23:20:00-04:00', fin: '2026-07-14T00:05:00-04:00', duracion_min: 45, sistema: 'Electrico', tipo: 'M. Planificado', descripcion: `Cambio preventivo sensor de giro (turno ${DEMO_OPERATORS.PALA2})`, ot: 'OT-8998', estado: 'OP', severidad: 'MEDIA', origen: 'correo', source_file: 'estatus_demo.xlsx', imported_at: DEMO_NOW },
  { id: 'ev-pala2-2', equipment_id: 'PALA 2', model: 'P&H 4100XPC AC', fecha: '2026-07-25', inicio: '2026-07-25T16:50:00-04:00', fin: '2026-07-25T17:28:00-04:00', duracion_min: 38, sistema: 'Electrico', tipo: 'Averia propia', descripcion: `Falla intermitente en sensor de giro, mismo componente reemplazado en el evento anterior, posible instalacion defectuosa (turno ${DEMO_OPERATORS.PALA2})`, ot: 'OT-9000', estado: 'OP', severidad: 'MEDIA', origen: 'correo', source_file: 'estatus_demo.xlsx', imported_at: DEMO_NOW },

  { id: 'ev-caex22-1', equipment_id: 'CAEX22', model: 'CAT 793F', fecha: DEMO_DATE, inicio: '2026-07-29T06:31:00-04:00', fin: null, duracion_min: 22, sistema: 'Combustible', tipo: 'Averia propia', descripcion: `Revision combustible por baja presion (turno ${DEMO_OPERATORS.CAEX22})`, ot: 'OT-9001', estado: 'F/S', severidad: 'ALTA', origen: 'correo', source_file: 'estatus_demo.xlsx', imported_at: DEMO_NOW },
  { id: 'ev-cf2-1', equipment_id: 'CF 2', model: 'CAT 994K', fecha: DEMO_DATE, inicio: '2026-07-29T06:35:00-04:00', fin: '2026-07-29T06:53:00-04:00', duracion_min: 18, sistema: 'Hidraulico', tipo: 'Mantenimiento diario', descripcion: `Chequeo de presion hidraulica (turno ${DEMO_OPERATORS.CF2})`, ot: 'OT-9002', estado: 'OP', severidad: 'MEDIA', origen: 'correo', source_file: 'estatus_demo.xlsx', imported_at: DEMO_NOW },
  { id: 'ev-caex01-1', equipment_id: 'CAEX01', model: 'CAT789D', fecha: '2026-07-12', inicio: '2026-07-12T08:05:00-04:00', fin: '2026-07-12T08:20:00-04:00', duracion_min: 15, sistema: 'Neumatico', tipo: 'Mantenimiento diario', descripcion: `Revision de presion de neumaticos, rutina de turno (turno ${DEMO_OPERATORS.CAEX01})`, ot: 'OT-8932', estado: 'OP', severidad: 'SIN DATO', origen: 'correo', source_file: 'estatus_demo.xlsx', imported_at: DEMO_NOW },
] satisfies AveriaFleetDetail['events']

export const FAST_DEMO_AVERIAS_FLEET = {
  detail: {
    source: 'fast-demo',
    days: 31,
    count_events: averiaEvents.length,
    count_equipment: 6,
    total_min: 530,
    kpis: { dias_observados: 21, equipos: 24, disponibilidad_fisica_pct: 94.5, mttr_horas: 0.9, mtbf_horas: 38, num_averias: 9, horas_correctiva: 7.5, horas_programada: 1.3, pct_programada: 15, pct_correctiva: 85, peor_equipo: { equipment_id: 'CAEX09', disponibilidad_pct: 88.2 } },
    costos: { tasa_usd_por_min: 610, total_usd: 323300, correctiva_usd: 275720, programada_usd: 47580, fuente_tasa: 'demo', nota: 'Valores ilustrativos para flujo de demo.' },
    equipment: [
      { equipment_id: 'CAEX09', model: 'KOM980E-5', events: 4, total_min: 310, costo_usd: 189100, criticas: 2, disponibilidad_pct: 88.2, sistemas: [{ name: 'Hidraulico', events: 4, min: 310 }], tipos: [{ name: 'Averia propia', events: 4, min: 310 }], tipo_principal: 'Averia propia', last_event: '2026-07-29T05:03:00-04:00' },
      { equipment_id: 'CAEX15', model: 'CAT789D', events: 3, total_min: 82, costo_usd: 50020, criticas: 1, disponibilidad_pct: 93.5, sistemas: [{ name: 'Combustible', events: 3, min: 82 }], tipos: [{ name: 'Averia propia', events: 3, min: 82 }], tipo_principal: 'Averia propia', last_event: '2026-07-27T03:15:00-04:00' },
      { equipment_id: 'PALA 2', model: 'P&H 4100XPC AC', events: 2, total_min: 83, costo_usd: 50630, criticas: 0, disponibilidad_pct: 95.4, sistemas: [{ name: 'Electrico', events: 2, min: 83 }], tipos: [{ name: 'M. Planificado', events: 1, min: 45 }, { name: 'Averia propia', events: 1, min: 38 }], tipo_principal: 'Averia propia', last_event: '2026-07-25T16:50:00-04:00' },
      { equipment_id: 'CAEX22', model: 'CAT 793F', events: 1, total_min: 22, costo_usd: 13420, criticas: 0, disponibilidad_pct: 92.4, sistemas: [{ name: 'Combustible', events: 1, min: 22 }], tipos: [{ name: 'Averia propia', events: 1, min: 22 }], tipo_principal: 'Averia propia', last_event: DEMO_NOW },
      { equipment_id: 'CF 2', model: 'CAT 994K', events: 1, total_min: 18, costo_usd: 10980, criticas: 0, disponibilidad_pct: 95.1, sistemas: [{ name: 'Hidraulico', events: 1, min: 18 }], tipos: [{ name: 'Mantenimiento diario', events: 1, min: 18 }], tipo_principal: 'Mantenimiento diario', last_event: DEMO_NOW },
      { equipment_id: 'CAEX01', model: 'CAT789D', events: 1, total_min: 15, costo_usd: 9150, criticas: 0, disponibilidad_pct: 98.1, sistemas: [{ name: 'Neumatico', events: 1, min: 15 }], tipos: [{ name: 'Mantenimiento diario', events: 1, min: 15 }], tipo_principal: 'Mantenimiento diario', last_event: '2026-07-12T08:05:00-04:00' },
    ],
    events: averiaEvents,
    generated_at: DEMO_NOW,
  } satisfies AveriaFleetDetail,
  mailStatus: {
    mail_configured: true,
    mail_host: 'demo',
    mail_user: 'demo@northmine.local',
    mail_folder: 'Inbox/NORTHMINE',
    mail_sender_filter: 'mantencion',
    watch_dir: null,
    total_events: averiaEvents.length,
    auto_sync: { enabled: false, interval_min: 30, last_run: DEMO_NOW, last_result: 'OK' },
    last_imports: [{ kind: 'mail', source: 'demo', filename: 'estatus_demo.xlsx', events: averiaEvents.length, imported_at: DEMO_NOW }],
  } satisfies AveriaMailStatus,
}

export const FAST_DEMO_AVERIAS_INSIGHTS: AveriaInsights = {
  source: 'fast-demo',
  days: 31,
  eventos_analizados: averiaEvents.length,
  averias_analizadas: 9,
  recurrentes: [
    {
      equipment_id: 'CAEX09',
      model: 'KOM980E-5',
      sistema: 'Hidraulico',
      eventos: 4,
      total_min: 310,
      gap_promedio_dias: 7,
      tendencia: 'EN AUMENTO',
      ultima_fecha: DEMO_DATE,
      ultima_descripcion: 'Recurrencia de falla hidraulica, mismo circuito que el evento anterior',
      causa_probable: 'Sello de cilindro/bomba con desgaste acelerado; posible lote de repuesto defectuoso (4 fallas en el mismo circuito en 3 semanas)',
      solucion_sugerida: 'Reemplazar con sello de especificacion certificada y realizar prueba de presion post-instalacion. Enviar el lote actual a control de calidad antes de instalar en otro equipo.',
      confianza: 'ALTA',
    },
    {
      equipment_id: 'CAEX15',
      model: 'CAT789D',
      sistema: 'Combustible',
      eventos: 3,
      total_min: 82,
      gap_promedio_dias: 8,
      tendencia: 'ESTABLE',
      ultima_fecha: '2026-07-27',
      ultima_descripcion: 'Repite baja presion, mismo sintoma del evento anterior',
      causa_probable: 'Bomba de combustible con desgaste; las purgas de aire son el sintoma, no la causa raiz',
      solucion_sugerida: 'Programar cambio de bomba de combustible en la proxima ventana de mantencion en vez de seguir purgando linea.',
      confianza: 'MEDIA',
    },
    {
      equipment_id: 'PALA 2',
      model: 'P&H 4100XPC AC',
      sistema: 'Electrico',
      eventos: 2,
      total_min: 83,
      gap_promedio_dias: 11,
      tendencia: 'A LA BAJA',
      ultima_fecha: '2026-07-25',
      ultima_descripcion: 'Falla intermitente en sensor de giro, mismo componente reemplazado en el evento anterior',
      causa_probable: 'Sensor de giro con instalacion o conexionado defectuoso desde el reemplazo preventivo anterior',
      solucion_sugerida: 'Revisar instalacion y conexionado del sensor reemplazado antes de solicitar una pieza nueva; el patron sugiere error de montaje, no falla de fabrica.',
      confianza: 'MEDIA',
    },
  ],
  tendencias_sistema: [
    { sistema: 'Hidraulico', primera_mitad: 105, segunda_mitad: 223, variacion_pct: 112, direccion: 'SUBE' },
    { sistema: 'Combustible', primera_mitad: 24, segunda_mitad: 80, variacion_pct: 233, direccion: 'SUBE' },
    { sistema: 'Electrico', primera_mitad: 45, segunda_mitad: 38, variacion_pct: -16, direccion: 'BAJA' },
  ],
  equipos_riesgo: [
    { equipment_id: 'CAEX09', model: 'KOM980E-5', score: 82, nivel: 'CRITICO', razones: ['4 fallas hidraulicas en 3 semanas', 'Tendencia en aumento', 'Evento activo sin resolver'] },
    { equipment_id: 'CAEX15', model: 'CAT789D', score: 61, nivel: 'ALTO', razones: ['3 fallas de combustible recurrentes', 'Mismo sintoma repetido cada evento'] },
    { equipment_id: 'CAEX22', model: 'CAT 793F', score: 68, nivel: 'MEDIO', razones: ['Evento abierto', 'Afecta asignacion CF 2'] },
    { equipment_id: 'PALA 2', model: 'P&H 4100XPC AC', score: 45, nivel: 'MEDIO', razones: ['Sensor de giro reincidente', 'Posible error de instalacion'] },
  ],
  generated_at: DEMO_NOW,
}

const aerialFiles: AerialFileItem[] = [
  { file_name: '20260731_AVA_DES_F1-F2_PCP.tif', extension: 'tif', size_mb: 104.01, updated_at: '2026-07-31T11:27:17', status: 'READY' },
  { file_name: '20260730_AVA_DES_F1-F2_PCP.tif', extension: 'tif', size_mb: 105.46, updated_at: '2026-07-30T18:56:49', status: 'READY' },
  { file_name: '20260729_AVA_DES_F1-F2_PCP.tif', extension: 'tif', size_mb: 111.47, updated_at: '2026-07-29T19:34:12', status: 'READY' },
  { file_name: '20260729_AVA_DES_BOT_2420-2440_PCP.tif', extension: 'tif', size_mb: 252.17, updated_at: '2026-07-29T19:34:36', status: 'READY' },
]

export const FAST_DEMO_AERIAL = {
  status: {
    source: 'fast-demo',
    status: 'READY',
    faena: 'MINA CHILE DEMO',
    latest_file: aerialFiles[0],
    files_count: aerialFiles.length,
    viewer_status: 'Ortomosaicos reales',
    heavy_tif_loaded: true,
    equipment_counts: { caex: 18, palas: 3, botaderos: 2, chancadores: 1 },
    generated_at: DEMO_NOW,
  } satisfies AerialStatus,
  files: {
    source: 'fast-demo',
    count: aerialFiles.length,
    generated_at: DEMO_NOW,
    items: aerialFiles,
  } satisfies OperationalCollection<AerialFileItem>,
  mailStatus: {
    drive_configured: true,
    drive_root_id: 'demo',
    gmail_configured: false,
    gmail_user: null,
    gmail_sender_filter: null,
    name_hint: 'ortomosaico_demo',
    dest_dir_exists: true,
    auto_sync: { enabled: false, interval_min: 60, last_run: DEMO_NOW, last_result: 'OK' },
  } satisfies AerialMailStatus,
}

export const FAST_DEMO_MINDMAP: MindMapGraph = buildOperationalMindMap({
  cockpit: FAST_DEMO_COCKPIT,
  profit: FAST_DEMO_PROFIT,
  hiddenLosses: FAST_DEMO_HIDDEN_LOSSES,
  operationalNlp: FAST_DEMO_NLP,
  dispatcher: FAST_DEMO_DISPATCHER,
  decisionAudit: FAST_DEMO_DECISION_AUDIT,
  monthlyTarget: FAST_DEMO_MONTHLY_TARGET,
  errors: [],
})
