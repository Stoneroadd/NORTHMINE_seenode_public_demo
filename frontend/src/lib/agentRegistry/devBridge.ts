import { enqueueAgentAction } from '../../components/ai-copilot/agentActionExecutor'
import { agentEntityNavigator } from './entityNavigator'
import { resolveEquipmentAlias } from './entityResolver'
import { agentEquipmentCatalog } from './equipmentCatalog'
import { buildOperationalInvestigationSnapshot } from './investigationSnapshot'
import { agentWidgetRegistry } from './registry'
import { buildAgentApplicationContext } from './context'
import { agentSessionClient } from '../agentRuntime/AgentSessionClient'
import { conversationTurnManager } from '../agentRealtime/ConversationTurnManager'

/**
 * Puente de depuracion SOLO para desarrollo (import.meta.env.DEV) - permite
 * ejecutar la secuencia deterministica de acciones tipadas (seccion 15 del
 * brief de Etapa 2.5) desde la consola del navegador sin depender de un
 * modelo real, para verificar el pipeline completo: registry -> executor ->
 * entity navigator -> confirmacion de estado real. Nunca se incluye en un
 * build de produccion (Vite elimina el modulo cuando DEV=false via tree-
 * shaking del `if`).
 */
if (import.meta.env.DEV) {
  const w = window as unknown as { __northmineAgent?: Record<string, unknown> }
  w.__northmineAgent = {
    enqueueAgentAction,
    agentEntityNavigator,
    resolveEquipmentAlias,
    buildOperationalInvestigationSnapshot,
    agentWidgetRegistry,
    buildAgentApplicationContext,
    agentEquipmentCatalog,
    // Etapa 6.1, seccion 12: diagnostico de conexion del Agent Runtime -
    // nunca expone el token, solo metadatos de estado (ver getDiagnostics).
    agentRuntimeDiagnostics: () => agentSessionClient.getDiagnostics(),
    // Etapa 7, secciones 43-44: latencias reales del turno activo (o del
    // ultimo turno conocido) - nunca simula datos, solo lee lo que el
    // propio ConversationTurnManager ya midio en vivo.
    agentRealtimeDiagnostics: () => {
      const turn = conversationTurnManager.getCurrentTurn()
      return {
        active: conversationTurnManager.isActive(),
        supported: conversationTurnManager.isSupported(),
        micPermission: conversationTurnManager.getMicPermission(),
        inputLevel: conversationTurnManager.getInputLevel(),
        currentTurn: turn,
        metrics: turn ? conversationTurnManager.getMetrics(turn.turnId) : null,
      }
    },
  }
}
