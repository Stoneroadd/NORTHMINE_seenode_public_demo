import { recordInteraction } from './focusResolution'

/**
 * Eventos semanticos de interaccion (Etapa 5, seccion 9 del brief). Un
 * bus minimo en memoria: los widgets llaman `emitPerceptionEvent(...)`
 * cuando el usuario hace algo con significado real (enfoca un grafico,
 * selecciona un punto, abre una alerta) - nunca por cada mousemove/scroll.
 * `perceptionManager.ts` se suscribe para alimentar el change detector y
 * `focusResolution.ts` usa esto para saber cual fue la ULTIMA interaccion
 * real del usuario, no la posicion del cursor.
 */

export type PerceptionEventType =
  | 'widget.focused' | 'entity.selected' | 'filter.changed' | 'alert.opened'
  | 'drawer.opened' | 'tab.changed' | 'map.entity.selected'
  | 'chart.point.selected' | 'table.row.selected'

export interface PerceptionEvent {
  type: PerceptionEventType
  widgetId?: string
  entityType?: string
  entityId?: string
  detail?: Record<string, unknown>
  timestamp: number
}

type Handler = (event: PerceptionEvent) => void

const handlers = new Set<Handler>()

export function onPerceptionEvent(handler: Handler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

export function emitPerceptionEvent(event: Omit<PerceptionEvent, 'timestamp'>): void {
  const full: PerceptionEvent = { ...event, timestamp: Date.now() }

  if (event.type === 'widget.focused' && event.widgetId) {
    recordInteraction('widget', event.widgetId)
  } else if ((event.type === 'entity.selected' || event.type === 'map.entity.selected') && event.entityId) {
    recordInteraction('entity', event.entityId)
  } else if (event.type === 'alert.opened' && event.entityId) {
    recordInteraction('alert', event.entityId)
  } else if (event.type === 'chart.point.selected' && event.widgetId) {
    recordInteraction('widget', event.widgetId)
  } else if (event.type === 'table.row.selected' && event.entityId) {
    recordInteraction('entity', event.entityId)
  }

  handlers.forEach((handler) => handler(full))
}
