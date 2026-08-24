import type { ModuleDict } from '../useModuleT'

export interface FiltersT {
  barTitle: string
  activeFilters: (n: number) => string
  hideFilters: string
  moreFilters: string
  clear: string
  applying: string
  apply: string
  commandFilters: string
  close: string
  advancedFiltersInline: string
  advancedFiltersAria: string
  activeFiltersAria: string
  noActiveFilters: string
  filteredBy: string
  removeFilterAria: (label: string) => string
  all: string
  allFem: string
  fieldStartDate: string
  fieldEndDate: string
  fieldShift: string
  fieldEquipment: string
  fieldModel: string
  fieldPhase: string
  fieldOrigin: string
  fieldDestination: string
  fieldMaterial: string
  fieldOperator: string
  fieldStatus: string
  fieldSeverity: string
  fieldCategory: string
  fieldDelayCategory: string
  fieldLoadingUnit: string
  fieldCaex: string
  fieldMinScore: string
  fieldMaxScore: string
  fieldRecurrence: string
}

export const filtersT: ModuleDict<FiltersT> = {
  es: {
    barTitle: 'Filtros analiticos',
    activeFilters: (n) => `${n} filtros activos`,
    hideFilters: 'Ocultar filtros',
    moreFilters: 'Mas filtros',
    clear: 'Limpiar',
    applying: 'Aplicando...',
    apply: 'Aplicar filtros',
    commandFilters: 'Command filters',
    close: 'Cerrar',
    advancedFiltersInline: 'Filtros avanzados',
    advancedFiltersAria: 'Filtros avanzados inline',
    activeFiltersAria: 'Filtros activos',
    noActiveFilters: 'Sin filtros activos',
    filteredBy: 'Datos filtrados por',
    removeFilterAria: (label) => `Quitar filtro ${label}`,
    all: 'Todos',
    allFem: 'Todas',
    fieldStartDate: 'Desde',
    fieldEndDate: 'Hasta',
    fieldShift: 'Turno',
    fieldEquipment: 'Equipo',
    fieldModel: 'Modelo',
    fieldPhase: 'Fase',
    fieldOrigin: 'Origen',
    fieldDestination: 'Destino',
    fieldMaterial: 'Material',
    fieldOperator: 'Operador',
    fieldStatus: 'Estado',
    fieldSeverity: 'Severidad',
    fieldCategory: 'Categoria',
    fieldDelayCategory: 'Categoria demora',
    fieldLoadingUnit: 'Unidad carguio',
    fieldCaex: 'CAEX',
    fieldMinScore: 'Score min',
    fieldMaxScore: 'Score max',
    fieldRecurrence: 'Recurrencia',
  },
  en: {
    barTitle: 'Analytical filters',
    activeFilters: (n) => `${n} active filters`,
    hideFilters: 'Hide filters',
    moreFilters: 'More filters',
    clear: 'Clear',
    applying: 'Applying...',
    apply: 'Apply filters',
    commandFilters: 'Command filters',
    close: 'Close',
    advancedFiltersInline: 'Advanced filters',
    advancedFiltersAria: 'Inline advanced filters',
    activeFiltersAria: 'Active filters',
    noActiveFilters: 'No active filters',
    filteredBy: 'Data filtered by',
    removeFilterAria: (label) => `Remove filter ${label}`,
    all: 'All',
    allFem: 'All',
    fieldStartDate: 'From',
    fieldEndDate: 'To',
    fieldShift: 'Shift',
    fieldEquipment: 'Equipment',
    fieldModel: 'Model',
    fieldPhase: 'Phase',
    fieldOrigin: 'Origin',
    fieldDestination: 'Destination',
    fieldMaterial: 'Material',
    fieldOperator: 'Operator',
    fieldStatus: 'Status',
    fieldSeverity: 'Severity',
    fieldCategory: 'Category',
    fieldDelayCategory: 'Delay category',
    fieldLoadingUnit: 'Loading unit',
    fieldCaex: 'CAEX',
    fieldMinScore: 'Min score',
    fieldMaxScore: 'Max score',
    fieldRecurrence: 'Recurrence',
  },
  de: {
    barTitle: 'Analytische Filter',
    activeFilters: (n) => `${n} aktive Filter`,
    hideFilters: 'Filter ausblenden',
    moreFilters: 'Mehr Filter',
    clear: 'Zurücksetzen',
    applying: 'Wird angewendet...',
    apply: 'Filter anwenden',
    commandFilters: 'Befehlsfilter',
    close: 'Schließen',
    advancedFiltersInline: 'Erweiterte Filter',
    advancedFiltersAria: 'Erweiterte Inline-Filter',
    activeFiltersAria: 'Aktive Filter',
    noActiveFilters: 'Keine aktiven Filter',
    filteredBy: 'Daten gefiltert nach',
    removeFilterAria: (label) => `Filter entfernen: ${label}`,
    all: 'Alle',
    allFem: 'Alle',
    fieldStartDate: 'Von',
    fieldEndDate: 'Bis',
    fieldShift: 'Schicht',
    fieldEquipment: 'Gerät',
    fieldModel: 'Modell',
    fieldPhase: 'Phase',
    fieldOrigin: 'Herkunft',
    fieldDestination: 'Ziel',
    fieldMaterial: 'Material',
    fieldOperator: 'Operator',
    fieldStatus: 'Status',
    fieldSeverity: 'Schweregrad',
    fieldCategory: 'Kategorie',
    fieldDelayCategory: 'Verzugskategorie',
    fieldLoadingUnit: 'Ladeeinheit',
    fieldCaex: 'CAEX',
    fieldMinScore: 'Mindest-Score',
    fieldMaxScore: 'Maximal-Score',
    fieldRecurrence: 'Wiederholung',
  },
}
