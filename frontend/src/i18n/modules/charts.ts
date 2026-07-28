import type { ModuleDict } from '../useModuleT'

export interface ChartsT {
  // Shared
  notAvailable: string
  // FleetStatusChart / PremiumFleetStatusChart
  statusLabel: (code: string) => string
  fleetCenterLabel: string
  // HourlyProductionChart / PremiumLineAreaChart (shared series names)
  tonsPerHourSeries: string
  accumulatedSeries: string
  // LoadingUnitPerformanceChart / PremiumLoadingRankingChart (shared series name)
  tonnageSeries: string
  // ProductionTrendChart
  cumulativeProductionKicker: string
  realVsPlanTitle: string
  realObservedTitle: string
  last14DaysTag: string
  noPlanConfiguredTag: string
  planSeries: string
  realSeries: string
  realObservedSeries: string
  currentShiftKicker: string
  hourlyProductionTitle: string
  liveTag: string
  // PremiumChartFrame
  liveBadge: string
  syncingData: string
  couldNotLoadChart: string
  noDataToDisplay: string
  // PremiumDonutChart
  equipmentEventsUnit: string
  // PremiumGaugeChart
  complianceLabel: string
  complianceTooltip: (pct: string) => string
  currentTooltip: (value: string) => string
  targetTooltip: (value: string) => string
  gapTooltip: (value: string) => string
  // PremiumHeatmapChart
  metricLabel: (metric: string) => string
  tonnageTooltip: (value: string) => string
  cyclesTooltip: (value: string) => string
  delaysTooltip: (value: string) => string
  // PremiumLineAreaChart
  targetDifferenceTooltip: (value: string) => string
  hourlyTargetSeries: string
  bestHourPoint: string
  worstHourPoint: string
  // PremiumLoadingRankingChart
  performanceTooltip: (value: string) => string
  trucksServedTooltip: (value: string) => string
}

const STATUS_LABEL_ES: Record<string, string> = {
  ACTIVO: 'ACTIVO',
  DEMORA: 'DEMORA',
  MANTENCION: 'MANTENCION',
  'SIN ACTIVIDAD': 'SIN ACTIVIDAD',
}

const STATUS_LABEL_EN: Record<string, string> = {
  ACTIVO: 'ACTIVE',
  DEMORA: 'DELAY',
  MANTENCION: 'MAINTENANCE',
  'SIN ACTIVIDAD': 'NO ACTIVITY',
}

export const chartsT: ModuleDict<ChartsT> = {
  es: {
    notAvailable: 'N/D',
    statusLabel: (code) => STATUS_LABEL_ES[code] ?? code,
    fleetCenterLabel: 'Flota',
    tonsPerHourSeries: 'Toneladas/h',
    accumulatedSeries: 'Acumulado',
    tonnageSeries: 'Toneladas',
    cumulativeProductionKicker: 'Produccion acumulada',
    realVsPlanTitle: 'Real vs plan diario',
    realObservedTitle: 'Real observado',
    last14DaysTag: 'Ultimos 14 dias',
    noPlanConfiguredTag: 'Sin plan configurado',
    planSeries: 'Plan',
    realSeries: 'Real',
    realObservedSeries: 'Real observado',
    currentShiftKicker: 'Turno actual',
    hourlyProductionTitle: 'Produccion hora a hora',
    liveTag: 'En vivo',
    liveBadge: 'EN VIVO',
    syncingData: 'Sincronizando datos...',
    couldNotLoadChart: 'No fue posible cargar el grafico',
    noDataToDisplay: 'Sin datos para visualizar',
    equipmentEventsUnit: 'equipos/eventos',
    complianceLabel: 'Cumplimiento',
    complianceTooltip: (pct) => `Cumplimiento: <strong>${pct}%</strong>`,
    currentTooltip: (value) => `Actual: <strong>${value}</strong>`,
    targetTooltip: (value) => `Meta: <strong>${value}</strong>`,
    gapTooltip: (value) => `Brecha: <strong>${value}</strong>`,
    metricLabel: (metric) => ({ toneladas: 'Toneladas', ciclos: 'Ciclos', demoras: 'Demoras' } as Record<string, string>)[metric] ?? metric,
    tonnageTooltip: (value) => `Toneladas: <strong>${value}</strong>`,
    cyclesTooltip: (value) => `Ciclos: <strong>${value}</strong>`,
    delaysTooltip: (value) => `Demoras: <strong>${value}</strong>`,
    targetDifferenceTooltip: (value) => `Diferencia meta: <strong>${value}</strong>`,
    hourlyTargetSeries: 'Meta horaria',
    bestHourPoint: 'Mejor hora',
    worstHourPoint: 'Peor hora',
    performanceTooltip: (value) => `Rendimiento: <strong>${value}</strong>`,
    trucksServedTooltip: (value) => `Camiones atendidos: <strong>${value}</strong>`,
  },
  en: {
    notAvailable: 'N/A',
    statusLabel: (code) => STATUS_LABEL_EN[code] ?? code,
    fleetCenterLabel: 'Fleet',
    tonsPerHourSeries: 'Tons/h',
    accumulatedSeries: 'Accumulated',
    tonnageSeries: 'Tonnage',
    cumulativeProductionKicker: 'Cumulative production',
    realVsPlanTitle: 'Actual vs daily plan',
    realObservedTitle: 'Observed actual',
    last14DaysTag: 'Last 14 days',
    noPlanConfiguredTag: 'No plan configured',
    planSeries: 'Plan',
    realSeries: 'Actual',
    realObservedSeries: 'Observed actual',
    currentShiftKicker: 'Current shift',
    hourlyProductionTitle: 'Hour-by-hour production',
    liveTag: 'Live',
    liveBadge: 'LIVE',
    syncingData: 'Syncing data...',
    couldNotLoadChart: 'Could not load the chart',
    noDataToDisplay: 'No data to display',
    equipmentEventsUnit: 'equipment/events',
    complianceLabel: 'Compliance',
    complianceTooltip: (pct) => `Compliance: <strong>${pct}%</strong>`,
    currentTooltip: (value) => `Current: <strong>${value}</strong>`,
    targetTooltip: (value) => `Target: <strong>${value}</strong>`,
    gapTooltip: (value) => `Gap: <strong>${value}</strong>`,
    metricLabel: (metric) => ({ toneladas: 'Tonnage', ciclos: 'Cycles', demoras: 'Delays' } as Record<string, string>)[metric] ?? metric,
    tonnageTooltip: (value) => `Tonnage: <strong>${value}</strong>`,
    cyclesTooltip: (value) => `Cycles: <strong>${value}</strong>`,
    delaysTooltip: (value) => `Delays: <strong>${value}</strong>`,
    targetDifferenceTooltip: (value) => `Target difference: <strong>${value}</strong>`,
    hourlyTargetSeries: 'Hourly target',
    bestHourPoint: 'Best hour',
    worstHourPoint: 'Worst hour',
    performanceTooltip: (value) => `Performance: <strong>${value}</strong>`,
    trucksServedTooltip: (value) => `Trucks served: <strong>${value}</strong>`,
  },
}
