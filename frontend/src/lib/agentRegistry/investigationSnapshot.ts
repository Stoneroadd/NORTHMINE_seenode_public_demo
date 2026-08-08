import { useAppStore } from '../../store'
import { agentWidgetRegistry } from './registry'
import type { AgentDataMetadata, AgentWidgetSnapshot } from './types'

/**
 * Recopila y normaliza los snapshots YA registrados por categoria de
 * investigacion (seccion 9 del brief). No ejecuta ningun analisis ni
 * calcula nada nuevo - un futuro Planner consume esto como "que evidencia
 * hay disponible ahora mismo", incluyendo que falta.
 */
export interface OperationalInvestigationSnapshot {
  scope: {
    shiftId?: string
    dateRange?: { from: string; to: string }
  }
  production?: AgentWidgetSnapshot
  loading: AgentWidgetSnapshot[]
  fleet: AgentWidgetSnapshot[]
  cycle: AgentWidgetSnapshot[]
  delays: AgentWidgetSnapshot[]
  breakdowns: AgentWidgetSnapshot[]
  alerts: AgentWidgetSnapshot[]
  comparison: AgentWidgetSnapshot[]
  dataQuality?: AgentWidgetSnapshot
  missingCapabilities: string[]
  generatedAt: string
}

// Categoria -> widgets instrumentados que la alimentan. Los arrays vacios
// (cycle, delays, dataQuality) son honestos: hoy no existe un widget
// dedicado a tiempo de ciclo puro, demoras operacionales aisladas de
// averias, ni calidad de dato en el frontend (el backend SI la calcula via
// la tool get_data_quality_status de Etapa 1, pero no hay snapshot de UI
// equivalente) - por eso siempre caen en missingCapabilities.
const PRODUCTION_WIDGET_CANDIDATES = ['production-hourly-chart', 'production-plan-compliance', 'shift-summary', 'cockpit-production-summary']
const CATEGORY_WIDGETS: Record<'loading' | 'fleet' | 'breakdowns' | 'alerts' | 'comparison', string[]> = {
  loading: ['loading-rate-chart'],
  fleet: ['fleet-status-table'],
  breakdowns: ['breakdown-summary', 'breakdown-active-list'],
  alerts: ['alerts-priority-list'],
  comparison: ['comparison-variance'],
}

function collect(ids: string[]): AgentWidgetSnapshot[] {
  return ids
    .map((id) => agentWidgetRegistry.snapshot(id))
    .filter((snapshot): snapshot is AgentWidgetSnapshot => snapshot != null)
}

export function buildOperationalInvestigationSnapshot(): OperationalInvestigationSnapshot {
  const state = useAppStore.getState()
  const missingCapabilities: string[] = []

  const production = PRODUCTION_WIDGET_CANDIDATES.map((id) => agentWidgetRegistry.snapshot(id)).find((s) => s != null) ?? undefined
  if (!production) missingCapabilities.push('production_summary (visite Producción, Cockpit o Turno para poblarlo)')

  const loading = collect(CATEGORY_WIDGETS.loading)
  if (!loading.length) missingCapabilities.push('loading_performance (visite Carguío)')

  const fleet = collect(CATEGORY_WIDGETS.fleet)
  if (!fleet.length) missingCapabilities.push('fleet_status (visite Flota)')

  const cycle: AgentWidgetSnapshot[] = []
  missingCapabilities.push('cycle_time_dedicated_widget (no instrumentado todavia - fuera del alcance de la Etapa 2.5)')

  const delays: AgentWidgetSnapshot[] = []
  missingCapabilities.push('operational_delays_widget (demoras operacionales aisladas de averias - no instrumentado todavia)')

  const breakdowns = collect(CATEGORY_WIDGETS.breakdowns)
  if (!breakdowns.length) missingCapabilities.push('breakdowns (visite Averías)')

  const alerts = collect(CATEGORY_WIDGETS.alerts)
  if (!alerts.length) missingCapabilities.push('alerts (visite Alertas)')

  const comparison = collect(CATEGORY_WIDGETS.comparison)
  if (!comparison.length) missingCapabilities.push('comparison (visite Comparativa)')

  missingCapabilities.push('data_quality_widget (el backend calcula calidad de dato via get_data_quality_status, pero no hay snapshot de UI equivalente todavia)')

  return {
    scope: {
      shiftId: state.filtro.turno,
      dateRange: state.filtro.fechaDesde && state.filtro.fechaHasta ? { from: state.filtro.fechaDesde, to: state.filtro.fechaHasta } : undefined,
    },
    production,
    loading,
    fleet,
    cycle,
    delays,
    breakdowns,
    alerts,
    comparison,
    dataQuality: undefined,
    missingCapabilities,
    generatedAt: new Date().toISOString(),
  }
}

// ── Metadata de calidad/frescura (seccion 10) ────────────────────────────
// No inventa calidad si la fuente no la entrega - default 'unknown'.
export function metadataFromSnapshot(snapshot: AgentWidgetSnapshot | undefined | null): AgentDataMetadata {
  if (!snapshot) return { freshnessStatus: 'unknown', qualityStatus: 'unknown' }
  return {
    source: typeof snapshot.source === 'string' ? snapshot.source : undefined,
    updatedAt: snapshot.updatedAt,
    freshnessStatus: 'unknown',
    qualityStatus: 'unknown',
  }
}
