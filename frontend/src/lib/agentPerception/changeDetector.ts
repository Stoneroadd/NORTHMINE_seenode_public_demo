import type { PerceptionChange, PerceptionChangeKind, PerceivedWidget, SemanticPerceptionSnapshot } from './types'

/**
 * PerceptionChangeDetector (Etapa 5, seccion 5 del brief): compara dos
 * snapshots semanticos consecutivos y devuelve SOLO los cambios que
 * importan, clasificados. No todo cambio se convierte en evento para el
 * agente - por ejemplo, `generatedAt`/timestamps internos nunca generan un
 * PerceptionChange por si solos.
 */

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

function widgetsByid(widgets: PerceivedWidget[]): Map<string, PerceivedWidget> {
  return new Map(widgets.map((w) => [w.widgetId, w]))
}

/** Umbral minimo de variacion relativa para considerar un KPI "cambio material" (seccion 5). */
const METRIC_MATERIAL_CHANGE_RATIO = 0.03

function isMaterialMetricChange(previous: unknown, next: unknown): boolean {
  if (typeof previous !== 'number' || typeof next !== 'number') return previous !== next
  if (previous === 0) return next !== 0
  return Math.abs((next - previous) / previous) >= METRIC_MATERIAL_CHANGE_RATIO
}

export function detectPerceptionChanges(previous: SemanticPerceptionSnapshot | null, next: SemanticPerceptionSnapshot): PerceptionChange[] {
  const now = new Date().toISOString()
  const changes: PerceptionChange[] = []
  const push = (kind: PerceptionChangeKind, path: string, prev: unknown, nxt: unknown) => {
    changes.push({ kind, path, previous: prev, next: nxt, detectedAt: now })
  }

  if (!previous) {
    push('navigation', 'route', null, next.route)
    return changes
  }

  if (previous.route !== next.route || previous.moduleId !== next.moduleId) {
    push('navigation', 'moduleId', previous.moduleId, next.moduleId)
  }

  if (!shallowEqual(previous.selectedEntities, next.selectedEntities)) {
    push('selection', 'selectedEntities', previous.selectedEntities, next.selectedEntities)
  }

  if (previous.focusedWidgetId !== next.focusedWidgetId) {
    push('widget_visibility', 'focusedWidgetId', previous.focusedWidgetId, next.focusedWidgetId)
  }

  if (!shallowEqual(previous.activeFilters, next.activeFilters)) {
    push('filter', 'activeFilters', previous.activeFilters, next.activeFilters)
  }

  if (previous.dateRange?.from !== next.dateRange?.from || previous.dateRange?.to !== next.dateRange?.to) {
    push('filter', 'dateRange', previous.dateRange, next.dateRange)
  }

  const prevWidgets = widgetsByid(previous.visibleWidgets)
  const nextWidgets = widgetsByid(next.visibleWidgets)

  for (const [id, widget] of nextWidgets) {
    const prevWidget = prevWidgets.get(id)
    if (!prevWidget) {
      push('widget_visibility', `widget.${id}`, null, widget.visibility.level)
      continue
    }
    if (prevWidget.visibility.level !== widget.visibility.level) {
      push('widget_visibility', `widget.${id}.visibility`, prevWidget.visibility.level, widget.visibility.level)
    }
    if (isMaterialMetricChange(extractNumericValue(prevWidget), extractNumericValue(widget))) {
      push('metric_change', `widget.${id}.value`, extractNumericValue(prevWidget), extractNumericValue(widget))
    }
    if (prevWidget.freshnessStatus !== widget.freshnessStatus) {
      push('data_freshness', `widget.${id}.freshness`, prevWidget.freshnessStatus, widget.freshnessStatus)
    }
  }
  for (const id of prevWidgets.keys()) {
    if (!nextWidgets.has(id)) push('widget_visibility', `widget.${id}`, 'visible', null)
  }

  if (!shallowEqual(previous.visibleAlerts, next.visibleAlerts)) {
    const prevIds = new Set(previous.visibleAlerts.map((a) => a.alertId))
    const nextIds = new Set(next.visibleAlerts.map((a) => a.alertId))
    const added = next.visibleAlerts.filter((a) => !prevIds.has(a.alertId))
    const removed = previous.visibleAlerts.filter((a) => !nextIds.has(a.alertId))
    if (added.length || removed.length) {
      push('alert_change', 'visibleAlerts', removed.map((a) => a.alertId), added.map((a) => a.alertId))
    }
  }

  return changes
}

function extractNumericValue(widget: PerceivedWidget): number | null {
  const match = widget.semanticSummary.match(/(-?\d[\d.,]*)/)
  if (!match) return null
  const normalized = match[1].replace(/\./g, '').replace(',', '.')
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

/** Debounce simple para no reenviar rafagas de cambios (p.ej. varios filtros
 * cambiando en la misma interaccion) - agrupa cambios en una sola llamada. */
export function createChangeDebouncer(callback: (changes: PerceptionChange[]) => void, waitMs = 250) {
  let pending: PerceptionChange[] = []
  let timer: number | null = null

  return (changes: PerceptionChange[]) => {
    if (!changes.length) return
    pending = pending.concat(changes)
    if (timer != null) window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      const batch = pending
      pending = []
      timer = null
      callback(batch)
    }, waitMs)
  }
}
