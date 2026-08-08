import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { recordInteraction, resolveFocusReference } from './focusResolution'
import { agentWidgetRegistry } from '../agentRegistry/registry'
import { useAppStore } from '../../store'

/**
 * Resolucion de referencias naturales (Etapa 5, secciones 8-9): "este
 * grafico", "esa pala", "lo que tengo abierto". Se prueba por orden de
 * prioridad documentado en focusResolution.ts: widget enfocado > interaccion
 * reciente > drawer/modal activo > entidad seleccionada globalmente.
 *
 * No se ejercita la rama final (unico widget visible del tipo mencionado en
 * el DOM via document.querySelectorAll) porque el entorno de test es Node
 * puro sin `document` real (vitest.config.ts: environment 'node') - esa
 * rama queda cubierta por la validacion E2E en Chrome.
 */

const registeredIds: string[] = []

function registerWidget(id: string, type: 'chart' | 'table' | 'kpi' | 'map') {
  agentWidgetRegistry.register({
    id, moduleId: 'produccion' as any, type, label: id,
    description: 'test', supportedActions: [],
  })
  registeredIds.push(id)
}

// Reloj falso continuo para todo el archivo (no se reinicia entre tests):
// solo asi avanzar 121s en beforeEach expira de verdad cualquier
// `lastInteraction` grabada por un test anterior (es estado de modulo, sin
// reset expuesto). Si se usara useFakeTimers()/useRealTimers() por test, el
// reloj volveria al tiempo real en cada test y la interaccion "vieja" nunca
// llegaria a superar el TTL entre dos tests que corren en el mismo milisegundo.
beforeAll(() => {
  vi.useFakeTimers()
})

afterAll(() => {
  vi.useRealTimers()
})

beforeEach(() => {
  vi.advanceTimersByTime(121_000)
  agentWidgetRegistry.setFocusedWidget(null)
  agentWidgetRegistry.setActiveDrawer(null)
  agentWidgetRegistry.setActiveModal(null)
})

afterEach(() => {
  for (const id of registeredIds.splice(0)) agentWidgetRegistry.unregister(id)
  useAppStore.setState((s) => ({ filtro: { ...s.filtro, equipo: undefined } }))
})

describe('resolveFocusReference', () => {
  it('prioriza el widget enfocado explicitamente sobre todo lo demas', () => {
    registerWidget('chart-1', 'chart')
    agentWidgetRegistry.setFocusedWidget('chart-1')
    const result = resolveFocusReference('explica este grafico')
    expect(result).toEqual({ kind: 'widget', widgetId: 'chart-1', confidence: 'high', reason: 'focused_widget' })
  })

  it('si el widget enfocado no coincide con el tipo mencionado, no lo usa (cae a la siguiente prioridad)', () => {
    registerWidget('kpi-1', 'kpi')
    agentWidgetRegistry.setFocusedWidget('kpi-1')
    recordInteraction('entity', 'EX-01')
    const result = resolveFocusReference('explica este grafico')
    expect(result?.reason).toBe('recent_interaction')
    expect(result?.kind).toBe('entity')
  })

  it('usa la interaccion reciente (widget) si no hay foco explicito', () => {
    recordInteraction('widget', 'w-recent')
    const result = resolveFocusReference('eso que vi recien')
    expect(result).toEqual({ kind: 'widget', widgetId: 'w-recent', confidence: 'high', reason: 'recent_interaction' })
  })

  it('usa la interaccion reciente (entity)', () => {
    recordInteraction('entity', 'EX-02')
    const result = resolveFocusReference('esa pala')
    expect(result).toEqual({ kind: 'entity', entityId: 'EX-02', confidence: 'high', reason: 'recent_interaction' })
  })

  it('usa la interaccion reciente (alert)', () => {
    recordInteraction('alert', 'alert-9')
    const result = resolveFocusReference('esa alerta')
    expect(result).toEqual({ kind: 'alert', entityId: 'alert-9', confidence: 'high', reason: 'recent_interaction' })
  })

  it('una interaccion fuera de la ventana de 120s ya no se usa', () => {
    recordInteraction('widget', 'w-old')
    vi.advanceTimersByTime(120_001)
    const result = resolveFocusReference('eso')
    expect(result?.reason).not.toBe('recent_interaction')
  })

  it('"lo que tengo abierto" resuelve al drawer activo si no hay foco ni interaccion reciente', () => {
    agentWidgetRegistry.setActiveDrawer('drawer-equipo-EX-03')
    const result = resolveFocusReference('lo que tengo abierto')
    expect(result).toEqual({ kind: 'entity', entityId: 'drawer-equipo-EX-03', confidence: 'medium', reason: 'active_drawer' })
  })

  it('"lo que tengo abierto" resuelve al modal activo si no hay drawer', () => {
    agentWidgetRegistry.setActiveModal('modal-alert-7')
    const result = resolveFocusReference('que tengo abierto ahora')
    expect(result).toEqual({ kind: 'alert', entityId: 'modal-alert-7', confidence: 'medium', reason: 'active_modal' })
  })

  it('menciones de equipo ("esa pala"/"ese camion") resuelven al equipo seleccionado globalmente', () => {
    useAppStore.setState((s) => ({ filtro: { ...s.filtro, equipo: 'EX-05' } }))
    const result = resolveFocusReference('como va esa pala')
    expect(result).toEqual({ kind: 'entity', entityType: 'equipment', entityId: 'EX-05', confidence: 'medium', reason: 'selected_entity' })
  })

  it('sin ninguna señal semantica disponible, devuelve null en vez de adivinar', () => {
    const result = resolveFocusReference('cuentame como estuvo el turno')
    expect(result).toBeNull()
  })
})
