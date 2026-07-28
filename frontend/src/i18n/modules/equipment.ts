import type { ModuleDict } from '../useModuleT'

export interface EquipmentT {
  // EquipmentAlertsPanel
  alertsAssociated: string
  operationalRisk: string
  activeAlerts: (n: number) => string
  noActiveAlerts: string
  // EquipmentCycleBreakdown
  operatingCycle: string
  timeBreakdown: string
  totalMin: (n: string) => string
  noData: string
  minValue: (n: string) => string
  emptyTravel: string
  loadTravelUnload: string
  // EquipmentDetailDrawer
  equipmentDetailAria: string
  closeDetailAria: string
  loadingOperationalDetail: string
  couldNotLoadEquipment: string
  checkBackendRetry: string
  close: string
  // EquipmentDetailHeader
  operationalDetail: string
  closeDetail: string
  risk: (level: string) => string
  operator: string
  location: string
  shift: string
  lastActivity: string
  // EquipmentHourlyChart
  hourlyHistory: string
  tonsAndCycles: string
  currentShift: string
  tons: string
  cycles: string
  // EquipmentOperationalKpis
  tonsShift: string
  operationalContribution: string
  cyclesShift: string
  realCycles: string
  performance: string
  tonsPerHour: string
  availability: string
  mechanicalState: string
  utilization: string
  shiftUsage: string
  delays: string
  currentStateAccumulated: string
  alerts: string
  associated: string
  noDataAvailable: string
  // EquipmentRecommendationPanel
  recommendation: string
  suggestedAction: string
  readyForDrilldown: string
  // EquipmentVisualCard / MachineHeroCard / MachineStatusOverlay
  viewOperationalDetail: (id: string) => string
  quickAnalysis: string
  operatorLabel: (name: string) => string
  noOperatorData: string
  reviewRestriction: string
  prioritizeDispatch: string
  operationWithinRange: string
  featuredEquipment: string
}

export const equipmentT: ModuleDict<EquipmentT> = {
  es: {
    alertsAssociated: 'Alertas asociadas',
    operationalRisk: 'Riesgo operacional',
    activeAlerts: (n) => `${n} activas`,
    noActiveAlerts: 'Sin alertas activas asociadas a este equipo.',
    operatingCycle: 'Ciclo operativo',
    timeBreakdown: 'Desglose de tiempos',
    totalMin: (n) => `${n} min total`,
    noData: 'Sin dato',
    minValue: (n) => `${n} min`,
    emptyTravel: 'Viaje vacio',
    loadTravelUnload: 'Carga + viaje cargado + descarga',
    equipmentDetailAria: 'Detalle de equipo',
    closeDetailAria: 'Cerrar detalle',
    loadingOperationalDetail: 'Cargando detalle operacional...',
    couldNotLoadEquipment: 'No fue posible cargar el equipo',
    checkBackendRetry: 'Verifica el backend FastAPI y vuelve a intentar.',
    close: 'Cerrar',
    operationalDetail: 'Detalle operacional',
    closeDetail: 'Cerrar detalle',
    risk: (level) => `Riesgo ${level}`,
    operator: 'Operador',
    location: 'Ubicacion',
    shift: 'Turno',
    lastActivity: 'Ultima actividad',
    hourlyHistory: 'Historial horario',
    tonsAndCycles: 'Toneladas y ciclos',
    currentShift: 'Turno actual',
    tons: 'Toneladas',
    cycles: 'Ciclos',
    tonsShift: 'Toneladas turno',
    operationalContribution: 'aporte operacional',
    cyclesShift: 'Ciclos turno',
    realCycles: 'ciclos reales',
    performance: 'Rendimiento',
    tonsPerHour: 'toneladas por hora',
    availability: 'Disponibilidad',
    mechanicalState: 'estado mecanico',
    utilization: 'Utilizacion',
    shiftUsage: 'uso de turno',
    delays: 'Demoras',
    currentStateAccumulated: 'acumulado estado actual',
    alerts: 'Alertas',
    associated: 'asociadas',
    noDataAvailable: 'no disponible en WENCO',
    recommendation: 'Recomendacion',
    suggestedAction: 'Accion operacional sugerida',
    readyForDrilldown: 'Preparado para drill-down SQL/WENCO en siguiente sprint.',
    viewOperationalDetail: (id) => `Ver detalle operacional ${id}`,
    quickAnalysis: 'Analisis rapido',
    operatorLabel: (name) => `Operador ${name}`,
    noOperatorData: 'Sin dato de operador',
    reviewRestriction: 'Revisar restriccion operacional.',
    prioritizeDispatch: 'Priorizar accion de despacho.',
    operationWithinRange: 'Operacion dentro de rango.',
    featuredEquipment: 'Equipo destacado',
  },
  en: {
    alertsAssociated: 'Associated alerts',
    operationalRisk: 'Operational risk',
    activeAlerts: (n) => `${n} active`,
    noActiveAlerts: 'No active alerts associated with this equipment.',
    operatingCycle: 'Operating cycle',
    timeBreakdown: 'Time breakdown',
    totalMin: (n) => `${n} min total`,
    noData: 'No data',
    minValue: (n) => `${n} min`,
    emptyTravel: 'Empty travel',
    loadTravelUnload: 'Load + loaded travel + unload',
    equipmentDetailAria: 'Equipment detail',
    closeDetailAria: 'Close detail',
    loadingOperationalDetail: 'Loading operational detail...',
    couldNotLoadEquipment: 'Could not load the equipment',
    checkBackendRetry: 'Check the FastAPI backend and try again.',
    close: 'Close',
    operationalDetail: 'Operational detail',
    closeDetail: 'Close detail',
    risk: (level) => `Risk ${level}`,
    operator: 'Operator',
    location: 'Location',
    shift: 'Shift',
    lastActivity: 'Last activity',
    hourlyHistory: 'Hourly history',
    tonsAndCycles: 'Tons and cycles',
    currentShift: 'Current shift',
    tons: 'Tons',
    cycles: 'Cycles',
    tonsShift: 'Shift tonnage',
    operationalContribution: 'operational contribution',
    cyclesShift: 'Shift cycles',
    realCycles: 'real cycles',
    performance: 'Performance',
    tonsPerHour: 'tons per hour',
    availability: 'Availability',
    mechanicalState: 'mechanical state',
    utilization: 'Utilization',
    shiftUsage: 'shift usage',
    delays: 'Delays',
    currentStateAccumulated: 'accumulated in current state',
    alerts: 'Alerts',
    associated: 'associated',
    noDataAvailable: 'not available in WENCO',
    recommendation: 'Recommendation',
    suggestedAction: 'Suggested operational action',
    readyForDrilldown: 'Ready for SQL/WENCO drill-down in the next sprint.',
    viewOperationalDetail: (id) => `View operational detail ${id}`,
    quickAnalysis: 'Quick analysis',
    operatorLabel: (name) => `Operator ${name}`,
    noOperatorData: 'No operator data',
    reviewRestriction: 'Review operational restriction.',
    prioritizeDispatch: 'Prioritize dispatch action.',
    operationWithinRange: 'Operation within range.',
    featuredEquipment: 'Featured equipment',
  },
}
