import type { FiltersT } from '../../i18n/modules/filters'

export type AnalysisFilterKey =
  | 'startDate'
  | 'endDate'
  | 'shift'
  | 'equipmentId'
  | 'model'
  | 'phase'
  | 'origin'
  | 'destination'
  | 'material'
  | 'operatorId'
  | 'status'
  | 'severity'
  | 'eventCategory'
  | 'delayCategory'
  | 'loadingUnitId'
  | 'caexId'
  | 'minScore'
  | 'maxScore'
  | 'recurrenceLevel'

export interface AnalysisFilters {
  startDate?: string
  endDate?: string
  shift?: string
  equipmentId?: string
  model?: string
  phase?: string
  origin?: string
  destination?: string
  material?: string
  operatorId?: string
  status?: string
  severity?: string
  eventCategory?: string
  delayCategory?: string
  loadingUnitId?: string
  caexId?: string
  minScore?: string
  maxScore?: string
  recurrenceLevel?: string
}

export interface FilterOption {
  value: string
  label: string
}

export interface FilterCatalog {
  source?: string
  shifts: FilterOption[]
  equipment_ids: FilterOption[]
  caex_ids: FilterOption[]
  loading_units: FilterOption[]
  models: FilterOption[]
  phases: FilterOption[]
  origins: FilterOption[]
  destinations: FilterOption[]
  materials: FilterOption[]
  operators: FilterOption[]
  statuses: FilterOption[]
  severities: FilterOption[]
  event_categories: FilterOption[]
  delay_categories?: FilterOption[]
  recurrence_levels?: FilterOption[]
}

export interface FilterFieldConfig {
  key: AnalysisFilterKey
  label: string
  type?: 'date' | 'select'
  catalogKey?: Exclude<keyof FilterCatalog, 'source'>
  allLabel?: string
  compact?: boolean
}

// Las etiquetas se generan a partir del diccionario i18n del modulo (ver
// components/filters/*.tsx, que llaman a estas funciones con `t` obtenido de
// useModuleT(filtersT)) para que reflejen el idioma seleccionado.
export function buildFilterLabels(t: FiltersT): Record<AnalysisFilterKey, string> {
  return {
    startDate: t.fieldStartDate,
    endDate: t.fieldEndDate,
    shift: t.fieldShift,
    equipmentId: t.fieldEquipment,
    model: t.fieldModel,
    phase: t.fieldPhase,
    origin: t.fieldOrigin,
    destination: t.fieldDestination,
    material: t.fieldMaterial,
    operatorId: t.fieldOperator,
    status: t.fieldStatus,
    severity: t.fieldSeverity,
    eventCategory: t.fieldCategory,
    delayCategory: t.fieldDelayCategory,
    loadingUnitId: t.fieldLoadingUnit,
    caexId: t.fieldCaex,
    minScore: t.fieldMinScore,
    maxScore: t.fieldMaxScore,
    recurrenceLevel: t.fieldRecurrence,
  }
}

export function buildDefaultFilterFields(t: FiltersT): FilterFieldConfig[] {
  return [
    { key: 'startDate', label: t.fieldStartDate, type: 'date', compact: true },
    { key: 'endDate', label: t.fieldEndDate, type: 'date', compact: true },
    { key: 'shift', label: t.fieldShift, catalogKey: 'shifts', allLabel: t.all, compact: true },
    { key: 'equipmentId', label: t.fieldEquipment, catalogKey: 'equipment_ids', allLabel: t.all },
    { key: 'model', label: t.fieldModel, catalogKey: 'models', allLabel: t.all },
    { key: 'phase', label: t.fieldPhase, catalogKey: 'phases', allLabel: t.allFem },
    { key: 'origin', label: t.fieldOrigin, catalogKey: 'origins', allLabel: t.all },
    { key: 'destination', label: t.fieldDestination, catalogKey: 'destinations', allLabel: t.all },
    { key: 'material', label: t.fieldMaterial, catalogKey: 'materials', allLabel: t.all },
    { key: 'operatorId', label: t.fieldOperator, catalogKey: 'operators', allLabel: t.all },
    { key: 'status', label: t.fieldStatus, catalogKey: 'statuses', allLabel: t.all },
    { key: 'severity', label: t.fieldSeverity, catalogKey: 'severities', allLabel: t.allFem },
    { key: 'eventCategory', label: t.fieldCategory, catalogKey: 'event_categories', allLabel: t.allFem },
    { key: 'delayCategory', label: t.fieldDelayCategory, catalogKey: 'delay_categories', allLabel: t.allFem },
    { key: 'loadingUnitId', label: t.fieldLoadingUnit, catalogKey: 'loading_units', allLabel: t.allFem },
    { key: 'caexId', label: t.fieldCaex, catalogKey: 'caex_ids', allLabel: t.all },
    { key: 'minScore', label: t.fieldMinScore, allLabel: t.all },
    { key: 'maxScore', label: t.fieldMaxScore, allLabel: t.all },
    { key: 'recurrenceLevel', label: t.fieldRecurrence, catalogKey: 'recurrence_levels', allLabel: t.allFem },
  ]
}
