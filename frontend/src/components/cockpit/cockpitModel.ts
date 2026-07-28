import type { CockpitResponse } from '../../lib/api'

export type DataAvailability = 'available' | 'missing' | 'partial'

export interface NumericMetric {
  value: number | null
  availability: DataAvailability
}

export interface CockpitHourlyPoint {
  hour: string
  tonnes: number
  accumulated: number
  cycles: number | null
  tonnesPerCycle: number | null
}

export interface CockpitShovelHourlyPoint {
  loaderId: string
  hour: string
  tonnes: number
  cycles: number
  origin: string | null
  destination: string | null
  avgDistanceKm: number | null
  avgLoadingTimeMin: number | null
  avgLoadingTimeSource: string | null
  avgCaexWaitTimeMin: number | null
  avgCaexWaitTimeSource: string | null
}

export interface CockpitEquipmentRow {
  id: string
  status: string
  tonnes: number | null
  cycles: number | null
  ageLabel: string
  tone: 'good' | 'warn' | 'bad' | 'neutral'
}

export interface CockpitEquipmentCardModel {
  id: string
  status: string
  tonnes: number | null
  cycles: number | null
  averageCycle: number | null
  efficiency: number | null
  operator: string | null
  front: string
  destination: string
  destinationPct: number | null
  tone: 'good' | 'warn' | 'bad' | 'neutral'
}

export interface CockpitSectorBreakdown {
  sector: string
  actualTonnes: number
  forecastTonnes: number | null
  cycles: number | null
  pctOfTotal: number | null
  source: string | null
}

export interface CockpitViewModel {
  raw: CockpitResponse
  source: string
  sourceSystem: string
  dataSource: string
  backendStatus: string
  dataSourceStatus: string
  apiVersion: string
  generatedAt: string
  mode: string
  isDemo: boolean
  stale: boolean
  shiftLabel: string
  shiftDate: string
  selectedShift: string
  shiftPeriod: string
  lastRecordLabel: string
  lastRealRecordLabel: string
  dataQualityLabel: string
  dataQualityScore: number | null
  lastRecordAgeMin: number | null
  healthScore: number
  healthState: string
  actualTonnes: number
  forecastTonnes: number
  targetTonnes: number
  dailyTargetTonnes: number | null
  targetSource: string
  riskPct: number
  costPerTonne: number
  totalCost: number
  cycles: NumericMetric
  activeCaex: NumericMetric
  averageCycle: NumericMetric
  averageCaexCircuit: NumericMetric
  availabilityPct: number
  sectorBreakdown: CockpitSectorBreakdown[]
  hourly: CockpitHourlyPoint[]
  shovelHourly: CockpitShovelHourlyPoint[]
  caexRows: CockpitEquipmentRow[]
  shovelRows: CockpitEquipmentRow[]
  equipmentCards: CockpitEquipmentCardModel[]
  events: string[]
  warnings: string[]
  recommendation: CockpitResponse['recommendation']
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Sin dato'
  return value.toLocaleString('es-CL', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

export function formatTons(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Sin dato'
  return `${formatNumber(value)} t`
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Sin dato'
  return `USD ${formatNumber(value)}`
}

export function formatPct(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined) return 'Sin dato'
  return `${formatNumber(value, digits)}%`
}

function toneFromStatus(status: string): CockpitEquipmentRow['tone'] {
  const normalized = status.toUpperCase()
  if (normalized.includes('AVERIA') || normalized.includes('CRIT') || normalized.includes('DETEN')) return 'bad'
  if (normalized.includes('SIN') || normalized.includes('SATUR') || normalized.includes('DEMORA')) return 'warn'
  if (normalized.includes('OPER') || normalized.includes('ACT')) return 'good'
  return 'neutral'
}

function accumulatedHourly(points: CockpitResponse['hourly_production']): CockpitHourlyPoint[] {
  let accumulated = 0
  return points.map((point) => {
    accumulated = point.accumulated ?? accumulated + point.tons
    return {
      hour: point.hour,
      tonnes: point.tons,
      accumulated,
      cycles: typeof point.cycles === 'number' ? point.cycles : null,
      tonnesPerCycle: typeof point.tonnes_per_cycle === 'number' ? point.tonnes_per_cycle : null,
    }
  })
}

function timeLabel(value: string | null | undefined): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

function shiftPeriod(response: CockpitResponse): string {
  const start = timeLabel(response.shift.started_at)
  const end = timeLabel(response.shift.ends_at)
  if (!start || !end) return 'Periodo no disponible en /api/cockpit v1'
  return `${start} - ${end}`
}

function metric(value: number | null | undefined): NumericMetric {
  return typeof value === 'number'
    ? { value, availability: 'available' }
    : { value: null, availability: 'missing' }
}

export function buildCockpitViewModel(response: CockpitResponse): CockpitViewModel {
  const hourly = accumulatedHourly(response.hourly_production ?? [])
  const shovelHourly: CockpitShovelHourlyPoint[] = (response.loader_hourly ?? []).map((item) => ({
    loaderId: item.loader_id,
    hour: item.hour,
    tonnes: item.tons,
    cycles: item.cycles,
    origin: item.origin ?? null,
    destination: item.destination ?? null,
    avgDistanceKm: typeof item.avg_distance_km === 'number' ? item.avg_distance_km : null,
    avgLoadingTimeMin: typeof item.avg_loading_time_min === 'number' ? item.avg_loading_time_min : null,
    avgLoadingTimeSource: item.avg_loading_time_source ?? null,
    avgCaexWaitTimeMin: typeof item.avg_caex_wait_time_min === 'number' ? item.avg_caex_wait_time_min : null,
    avgCaexWaitTimeSource: item.avg_caex_wait_time_source ?? null,
  }))

  const caexRows: CockpitEquipmentRow[] = (response.caex_status ?? []).map((item) => ({
    id: item.caex_id,
    status: item.status,
    tonnes: item.tons,
    cycles: item.cycles,
    ageLabel: typeof item.minutes_inactive === 'number'
      ? `${formatNumber(item.minutes_inactive)} min`
      : item.last_activity ?? 'Sin registro',
    tone: toneFromStatus(item.status),
  }))

  const shovelRows: CockpitEquipmentRow[] = (response.shovels ?? []).map((item) => ({
    id: item.id,
    status: item.status,
    tonnes: item.tons,
    cycles: typeof item.cycles === 'number' ? item.cycles : null,
    ageLabel: `${formatNumber(item.queue_min, 1)} min cola`,
    tone: toneFromStatus(item.status),
  }))

  const equipmentCards: CockpitEquipmentCardModel[] = (response.shovels ?? []).map((item) => ({
    id: item.id,
    status: item.status,
    tonnes: item.tons,
    cycles: typeof item.cycles === 'number' ? item.cycles : null,
    averageCycle: typeof item.avg_tonnes_per_cycle === 'number' ? item.avg_tonnes_per_cycle : null,
    efficiency: typeof item.efficiency_pct === 'number' ? item.efficiency_pct : null,
    operator: item.operator ?? null,
    front: item.front ?? 'Frente no disponible',
    destination: item.destination ?? 'Destino no disponible',
    destinationPct: typeof item.destination_pct === 'number' ? item.destination_pct : null,
    tone: toneFromStatus(item.status),
  }))

  const sectorBreakdown: CockpitSectorBreakdown[] = (response.production.sectors ?? []).map((item) => ({
    sector: item.sector,
    actualTonnes: item.actual_tonnes,
    forecastTonnes: typeof item.forecast_tonnes === 'number' ? item.forecast_tonnes : null,
    cycles: typeof item.cycles === 'number' ? item.cycles : null,
    pctOfTotal: typeof item.pct_of_total === 'number' ? item.pct_of_total : null,
    source: item.source ?? null,
  }))

  const lastRecordAge = response.data_quality?.last_record_age_min
  const lastRealRecord = response.last_real_record ?? response.data_quality?.last_record_at

  return {
    raw: response,
    source: response.source,
    sourceSystem: response.source_system ?? (response.data_source === 'REAL' ? 'WENCO' : 'DEMO'),
    dataSource: response.data_source,
    backendStatus: response.backend_status ?? 'CONNECTED',
    dataSourceStatus: response.data_source_status ?? (response.stale ? 'STALE' : response.data_source === 'DEMO' ? 'DEMO' : 'CONNECTED'),
    apiVersion: response.api_version,
    generatedAt: response.generated_at,
    mode: response.mode,
    isDemo: response.is_demo,
    stale: response.stale,
    shiftLabel: response.shift.name,
    shiftDate: response.selected_date ?? response.shift.date,
    selectedShift: response.selected_shift ?? response.shift.name,
    shiftPeriod: shiftPeriod(response),
    lastRecordLabel: timeLabel(lastRealRecord) ?? new Date(response.generated_at).toLocaleTimeString('es-CL'),
    lastRealRecordLabel: timeLabel(lastRealRecord) ?? 'Sin registro real',
    dataQualityLabel: response.data_quality?.status ?? (response.stale ? 'STALE' : 'OK'),
    dataQualityScore: response.data_quality?.score ?? null,
    lastRecordAgeMin: typeof lastRecordAge === 'number' ? lastRecordAge : null,
    healthScore: response.health.score,
    healthState: response.health.state,
    actualTonnes: response.production.actual_tonnes,
    forecastTonnes: response.production.forecast_tonnes,
    targetTonnes: response.production.target_tonnes,
    dailyTargetTonnes: typeof response.production.daily_target_tonnes === 'number' ? response.production.daily_target_tonnes : null,
    targetSource: response.production.target_source ?? 'SIN_META',
    riskPct: Math.round(response.production.non_compliance_risk * 100),
    costPerTonne: response.economics.cost_per_tonne_usd,
    totalCost: response.economics.total_cost_usd,
    cycles: metric(response.production.cycles),
    activeCaex: metric(response.production.caex_active),
    averageCycle: metric(response.production.avg_tonnes_per_cycle),
    averageCaexCircuit: metric(response.production.avg_caex_in_circuit),
    availabilityPct: response.availability,
    sectorBreakdown,
    hourly,
    shovelHourly,
    caexRows,
    shovelRows,
    equipmentCards,
    events: response.events ?? [],
    warnings: response.warnings ?? [],
    recommendation: response.recommendation,
  }
}
