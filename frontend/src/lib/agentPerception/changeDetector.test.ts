import { describe, expect, it } from 'vitest'
import { detectPerceptionChanges } from './changeDetector'
import type { PerceivedWidget, SemanticPerceptionSnapshot } from './types'

/**
 * PerceptionChangeDetector (Etapa 5, seccion 5): compara dos snapshots
 * semanticos consecutivos. Cubre clasificacion de cambios y el umbral de
 * "cambio material" para metricas (3%), que es el detalle mas facil de
 * romper sin darse cuenta.
 */

function widget(overrides: Partial<PerceivedWidget> = {}): PerceivedWidget {
  return {
    widgetId: 'w1', type: 'kpi', label: 'Produccion', moduleId: 'produccion',
    semanticSummary: '1000 t/h.', freshnessStatus: 'current', qualityStatus: 'high',
    visualCaptureSupported: true,
    visibility: { mounted: true, visible: true, intersectionRatio: 1, level: 'visible' },
    ...overrides,
  }
}

function snapshot(overrides: Partial<SemanticPerceptionSnapshot> = {}): SemanticPerceptionSnapshot {
  return {
    route: '/produccion', moduleId: 'produccion' as any, shift: 'DIA', dateRange: null,
    activeFilters: {}, selectedEntities: [], focusedWidgetId: null,
    visibleWidgets: [], visibleAlerts: [], activeDrawer: null, activeModal: null, userRole: 'operador',
    ...overrides,
  }
}

describe('detectPerceptionChanges', () => {
  it('sin snapshot previo, solo reporta navigation (primer envio)', () => {
    const changes = detectPerceptionChanges(null, snapshot())
    expect(changes).toHaveLength(1)
    expect(changes[0].kind).toBe('navigation')
  })

  it('snapshots identicos no generan cambios', () => {
    const s = snapshot()
    expect(detectPerceptionChanges(s, snapshot())).toHaveLength(0)
  })

  it('detecta cambio de modulo/ruta como navigation', () => {
    const changes = detectPerceptionChanges(snapshot({ route: '/produccion' }), snapshot({ route: '/alertas', moduleId: 'alertas' as any }))
    expect(changes.some((c) => c.kind === 'navigation' && c.path === 'moduleId')).toBe(true)
  })

  it('detecta cambio de entidad seleccionada como selection', () => {
    const changes = detectPerceptionChanges(
      snapshot({ selectedEntities: [] }),
      snapshot({ selectedEntities: [{ type: 'equipment', id: 'EX-01' }] }),
    )
    expect(changes.some((c) => c.kind === 'selection')).toBe(true)
  })

  it('detecta cambio de foco como widget_visibility', () => {
    const changes = detectPerceptionChanges(
      snapshot({ focusedWidgetId: null }),
      snapshot({ focusedWidgetId: 'w1' }),
    )
    expect(changes.some((c) => c.kind === 'widget_visibility' && c.path === 'focusedWidgetId')).toBe(true)
  })

  it('detecta cambio de filtros activos como filter', () => {
    const changes = detectPerceptionChanges(
      snapshot({ activeFilters: { shift: 'DIA' } }),
      snapshot({ activeFilters: { shift: 'NOCHE' } }),
    )
    expect(changes.some((c) => c.kind === 'filter' && c.path === 'activeFilters')).toBe(true)
  })

  it('un widget nuevo genera widget_visibility, uno removido tambien', () => {
    const added = detectPerceptionChanges(snapshot({ visibleWidgets: [] }), snapshot({ visibleWidgets: [widget()] }))
    expect(added.some((c) => c.path === 'widget.w1')).toBe(true)

    const removed = detectPerceptionChanges(snapshot({ visibleWidgets: [widget()] }), snapshot({ visibleWidgets: [] }))
    expect(removed.some((c) => c.path === 'widget.w1')).toBe(true)
  })

  it('una variacion de valor >= 3% en el resumen del widget cuenta como metric_change', () => {
    const changes = detectPerceptionChanges(
      snapshot({ visibleWidgets: [widget({ semanticSummary: '1000 t/h.' })] }),
      snapshot({ visibleWidgets: [widget({ semanticSummary: '1050 t/h.' })] }),
    )
    expect(changes.some((c) => c.kind === 'metric_change')).toBe(true)
  })

  it('una variacion menor al 3% NO cuenta como metric_change (evita ruido)', () => {
    const changes = detectPerceptionChanges(
      snapshot({ visibleWidgets: [widget({ semanticSummary: '1000 t/h.' })] }),
      snapshot({ visibleWidgets: [widget({ semanticSummary: '1010 t/h.' })] }),
    )
    expect(changes.some((c) => c.kind === 'metric_change')).toBe(false)
  })

  it('cambio de freshnessStatus de un widget se reporta como data_freshness', () => {
    const changes = detectPerceptionChanges(
      snapshot({ visibleWidgets: [widget({ freshnessStatus: 'current' })] }),
      snapshot({ visibleWidgets: [widget({ freshnessStatus: 'stale' })] }),
    )
    expect(changes.some((c) => c.kind === 'data_freshness')).toBe(true)
  })

  it('alertas agregadas/quitadas se reportan como alert_change con los ids afectados', () => {
    const changes = detectPerceptionChanges(
      snapshot({ visibleAlerts: [{ alertId: 'a1', severity: 'critical', label: 'Alerta 1', isOpen: false }] }),
      snapshot({ visibleAlerts: [{ alertId: 'a2', severity: 'warning', label: 'Alerta 2', isOpen: false }] }),
    )
    const change = changes.find((c) => c.kind === 'alert_change')
    expect(change).toBeDefined()
    expect(change!.previous).toEqual(['a1'])
    expect(change!.next).toEqual(['a2'])
  })
})
