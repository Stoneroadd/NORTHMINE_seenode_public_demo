import { agentWidgetRegistry } from '../agentRegistry/registry'
import { useAppStore } from '../../store'
import type { AgentWidgetType } from '../agentRegistry/types'

/**
 * Resolucion de referencias naturales (Etapa 5, seccion 8 del brief):
 * "este grafico", "esa pala", "lo que tengo abierto". Se resuelve por
 * SEMANTICA (widget enfocado, entidad seleccionada, interaccion reciente,
 * widgets visibles, drawer/modal activo) - nunca por coordenadas de mouse.
 *
 * `recentInteraction` (seccion 9) se alimenta de los eventos semanticos
 * reales que perceptionEvents.ts registra (widget.focused, entity.selected,
 * chart.point.selected, etc.), con una ventana corta de vigencia para que
 * "eso" deje de referirse a algo que el usuario toco hace 5 minutos.
 */

const RECENT_INTERACTION_TTL_MS = 120_000

interface RecentInteraction {
  kind: 'widget' | 'entity' | 'alert'
  id: string
  timestamp: number
}

let lastInteraction: RecentInteraction | null = null

export function recordInteraction(kind: RecentInteraction['kind'], id: string): void {
  lastInteraction = { kind, id, timestamp: Date.now() }
}

function recentInteractionIfFresh(): RecentInteraction | null {
  if (!lastInteraction) return null
  if (Date.now() - lastInteraction.timestamp > RECENT_INTERACTION_TTL_MS) return null
  return lastInteraction
}

export type FocusReferenceKind = 'chart' | 'widget' | 'entity' | 'alert' | 'table'

export interface ResolvedFocusReference {
  kind: FocusReferenceKind
  widgetId?: string
  entityType?: string
  entityId?: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

const WIDGET_TYPE_HINTS: Record<string, AgentWidgetType[]> = {
  grafico: ['chart'], chart: ['chart'],
  tabla: ['table'], table: ['table'],
  mapa: ['map'], map: ['map'],
  kpi: ['kpi'], indicador: ['kpi'],
}

function inferWidgetTypeHint(text: string): AgentWidgetType[] | null {
  const normalized = text.toLowerCase()
  for (const [keyword, types] of Object.entries(WIDGET_TYPE_HINTS)) {
    if (normalized.includes(keyword)) return types
  }
  return null
}

/**
 * Resuelve "este/esa/lo que tengo abierto" a un widget o entidad concreta.
 * Orden de prioridad: widget enfocado explicitamente > interaccion reciente
 * > drawer/modal activo > entidad seleccionada globalmente > unico widget
 * visible del tipo mencionado.
 */
export function resolveFocusReference(text: string): ResolvedFocusReference | null {
  const normalized = text.toLowerCase()
  const mentionsOpen = /\blo que tengo abierto\b|\bque tengo abierto\b/.test(normalized)
  const typeHint = inferWidgetTypeHint(normalized)

  const focusedWidgetId = agentWidgetRegistry.getFocusedWidget()
  if (focusedWidgetId && (!typeHint || matchesType(focusedWidgetId, typeHint))) {
    return { kind: 'widget', widgetId: focusedWidgetId, confidence: 'high', reason: 'focused_widget' }
  }

  const recent = recentInteractionIfFresh()
  if (recent) {
    if (recent.kind === 'widget' && (!typeHint || matchesType(recent.id, typeHint))) {
      return { kind: 'widget', widgetId: recent.id, confidence: 'high', reason: 'recent_interaction' }
    }
    if (recent.kind === 'entity') {
      return { kind: 'entity', entityId: recent.id, confidence: 'high', reason: 'recent_interaction' }
    }
    if (recent.kind === 'alert') {
      return { kind: 'alert', entityId: recent.id, confidence: 'high', reason: 'recent_interaction' }
    }
  }

  if (mentionsOpen) {
    const drawer = agentWidgetRegistry.getActiveDrawer()
    if (drawer) return { kind: 'entity', entityId: drawer, confidence: 'medium', reason: 'active_drawer' }
    const modal = agentWidgetRegistry.getActiveModal()
    if (modal) return { kind: 'alert', entityId: modal, confidence: 'medium', reason: 'active_modal' }
  }

  const selectedEquipo = useAppStore.getState().filtro.equipo
  if (selectedEquipo && (normalized.includes('pala') || normalized.includes('equipo') || normalized.includes('camion') || normalized.includes('caex'))) {
    return { kind: 'entity', entityType: 'equipment', entityId: selectedEquipo, confidence: 'medium', reason: 'selected_entity' }
  }

  if (typeHint) {
    const candidates = Array.from(document.querySelectorAll('[data-agent-widget-id]'))
      .map((el) => el.getAttribute('data-agent-widget-id'))
      .filter((id): id is string => !!id && matchesType(id, typeHint))
    if (candidates.length === 1) {
      return { kind: 'widget', widgetId: candidates[0], confidence: 'low', reason: 'single_visible_of_type' }
    }
  }

  return null
}

function matchesType(widgetId: string, types: AgentWidgetType[]): boolean {
  const manifest = agentWidgetRegistry.get(widgetId)
  return !!manifest && types.includes(manifest.type)
}
