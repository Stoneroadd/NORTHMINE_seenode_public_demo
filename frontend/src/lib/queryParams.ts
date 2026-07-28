import type { AnalysisFilters } from '../components/filters/filterTypes'

const PARAM_MAP: Record<keyof AnalysisFilters, string> = {
  startDate: 'start_date',
  endDate: 'end_date',
  shift: 'shift',
  equipmentId: 'equipment_id',
  model: 'model',
  phase: 'phase',
  origin: 'origin',
  destination: 'destination',
  material: 'material',
  operatorId: 'operator_id',
  status: 'status',
  severity: 'severity',
  eventCategory: 'event_category',
  delayCategory: 'delay_category',
  loadingUnitId: 'loading_unit_id',
  caexId: 'caex_id',
  minScore: 'min_score',
  maxScore: 'max_score',
  recurrenceLevel: 'recurrence_level',
}

const EMPTY_VALUES = new Set(['', 'TODOS', 'TODAS', 'ALL'])

export function cleanAnalysisFilters(filters: AnalysisFilters = {}): AnalysisFilters {
  return Object.entries(filters).reduce<AnalysisFilters>((acc, [key, value]) => {
    const normalized = String(value ?? '').trim()
    if (!normalized || EMPTY_VALUES.has(normalized.toUpperCase())) return acc
    return { ...acc, [key]: normalized }
  }, {})
}

export function analysisFiltersToSearchParams(filters: AnalysisFilters = {}, extra: Record<string, string | number | undefined> = {}) {
  const params = new URLSearchParams()
  Object.entries(cleanAnalysisFilters(filters)).forEach(([key, value]) => {
    params.set(PARAM_MAP[key as keyof AnalysisFilters], String(value))
  })
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim()) params.set(key, String(value))
  })
  return params
}

export function withAnalysisQuery(path: string, filters?: AnalysisFilters, extra?: Record<string, string | number | undefined>) {
  const query = analysisFiltersToSearchParams(filters, extra).toString()
  return `${path}${query ? `?${query}` : ''}`
}
