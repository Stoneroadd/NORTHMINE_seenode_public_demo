import { enqueueAgentAction } from '../../components/ai-copilot/agentActionExecutor'
import { actionForCapability } from '../agentRegistry/capabilityActions'
import { speechOutputRouter } from '../agentVoice/SpeechOutputRouter'
import type { AgentSpeechSegment } from '../agentVoice/types'
import { agentSessionClient } from './AgentSessionClient'
import type { AgentEvent, ClientEventType } from './protocol'
import { useAgentRuntimeStore } from './runtimeStore'

/**
 * Controlador de efectos secundarios del Agent Runtime (Etapa 4). El store
 * (runtimeStore.ts) solo refleja estado puro; este modulo es el UNICO lugar
 * que reacciona a eventos del servidor con acciones reales: ejecutar una
 * ui_action (reusando el AgentActionExecutor de Etapa 2), reproducir un
 * segmento de voz (SpeechOutputRouter) y reportar el resultado de vuelta
 * por el WebSocket. Se inicializa una sola vez por pestaña, independiente
 * de si AgentWorkspace esta montado.
 */

let initialized = false

export function initRuntimeController(): void {
  if (initialized) return
  initialized = true

  agentSessionClient.onStatus((status) => useAgentRuntimeStore.getState().setConnectionStatus(status))
  agentSessionClient.on(handleServerEvent)

  speechOutputRouter.onPlaybackResult((result) => {
    const eventType = `speech.playback.${result.result}` as ClientEventType
    agentSessionClient.send(eventType, {
      segmentId: result.segmentId, provider: result.provider, latencyMs: result.latencyMs,
      textLength: result.textLength, priority: result.priority,
    })
  })
}

function handleServerEvent(event: AgentEvent): void {
  useAgentRuntimeStore.getState().applyEvent(event)

  switch (event.event_type) {
    case 'ui_action.requested':
      void handleUiActionRequested(event)
      return
    case 'agent.speech.segment': {
      const segment = event.payload as unknown as AgentSpeechSegment
      speechOutputRouter.enqueue(segment)
      return
    }
    case 'agent.speech.stop':
      speechOutputRouter.stop()
      return
    default:
      return
  }
}

async function handleUiActionRequested(event: AgentEvent): Promise<void> {
  const payload = event.payload as Record<string, unknown>
  const actionId = String(payload.actionId ?? '')
  const capabilityId = String(payload.capabilityId ?? '')
  const requirement = String(payload.requirement ?? 'optional')
  const entityQuery = (payload.entityQuery as string | null) ?? null

  let action = actionForCapability(capabilityId, entityQuery)
  if (!action && capabilityId === 'navigate_direct' && payload.moduleId) {
    action = { action: 'navigate', route: String(payload.moduleId) }
  }

  if (!action) {
    if (requirement === 'required') {
      agentSessionClient.send('ui_action.rejected', {
        actionId, error: 'No se pudo resolver esta accion de interfaz.', contextUpdated: false,
      })
    }
    return
  }

  enqueueAgentAction(action, (result) => {
    useAgentRuntimeStore.getState().recordUiActionResult(result)
    const status: ClientEventType =
      result.status === 'completed' ? 'ui_action.completed'
      : result.status === 'rejected' ? 'ui_action.rejected'
      : 'ui_action.failed'
    agentSessionClient.send(status, {
      actionId,
      contextUpdated: result.status === 'completed',
      error: result.error ?? null,
      selectedEntityIds: result.resolvedEntityId ? [result.resolvedEntityId] : [],
    })
  })
}
