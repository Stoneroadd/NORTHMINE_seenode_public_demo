import type { AgentEntityActionResult, AgentEntityHandler, AgentEntityType } from './types'

/**
 * Entity Navigation Service (Etapa 2.5): reemplaza el setter imperativo
 * improvisado de la Etapa 2 (que solo aplicaba un filtro global y navegaba)
 * por un registro explicito de handlers por tipo de entidad. Cada modulo
 * que tenga un detalle real (drawer, panel) se registra al montar via
 * useAgentEntityHandler y se desregistra al desmontar - el navigator nunca
 * mantiene una referencia a un componente que ya no existe.
 *
 * Si no hay handler (o el handler no implementa `open`), la respuesta es
 * 'unsupported' explicito - nunca se finge que algo se abrio.
 */
class AgentEntityNavigator {
  private handlers = new Map<AgentEntityType, AgentEntityHandler>()

  registerHandler(entityType: AgentEntityType, handler: AgentEntityHandler): () => void {
    this.handlers.set(entityType, handler)
    return () => {
      if (this.handlers.get(entityType) === handler) this.handlers.delete(entityType)
    }
  }

  hasHandler(entityType: AgentEntityType): boolean {
    return this.handlers.has(entityType)
  }

  async selectEntity(entityType: AgentEntityType, entityId: string): Promise<AgentEntityActionResult> {
    const handler = this.handlers.get(entityType)
    if (!handler?.select) {
      return { status: 'unsupported', entityType, entityId, contextUpdated: false, message: `No hay seleccion disponible para "${entityType}" en la vista actual.` }
    }
    try {
      await handler.select(entityId)
    } catch (error) {
      return { status: 'failed', entityType, entityId, contextUpdated: false, message: error instanceof Error ? error.message : 'Error al seleccionar' }
    }
    return { status: 'completed', entityType, entityId, contextUpdated: true }
  }

  async openEntity(entityType: AgentEntityType, entityId: string): Promise<AgentEntityActionResult> {
    const handler = this.handlers.get(entityType)
    if (!handler?.open) {
      return { status: 'unsupported', entityType, entityId, contextUpdated: false, message: `"${entityType}" no tiene un detalle real disponible todavia.` }
    }
    try {
      await handler.open(entityId)
    } catch (error) {
      return { status: 'failed', entityType, entityId, contextUpdated: false, message: error instanceof Error ? error.message : 'Error al abrir' }
    }
    if (handler.isOpen) {
      const confirmed = await waitFor(() => handler.isOpen!(entityId))
      if (!confirmed) {
        return { status: 'failed', entityType, entityId, contextUpdated: false, message: 'No se pudo confirmar que el detalle quedo abierto.' }
      }
    }
    return { status: 'completed', entityType, entityId, contextUpdated: true }
  }
}

function waitFor(check: () => boolean, timeoutMs = 800, intervalMs = 40): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now()
    const tick = () => {
      if (check()) return resolve(true)
      if (Date.now() - start >= timeoutMs) return resolve(false)
      window.setTimeout(tick, intervalMs)
    }
    tick()
  })
}

export const agentEntityNavigator = new AgentEntityNavigator()
