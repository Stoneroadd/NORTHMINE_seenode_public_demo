import { enqueueAgentAction } from '../../components/ai-copilot/agentActionExecutor'
import { agentEntityNavigator } from './entityNavigator'
import { resolveEquipmentAlias } from './entityResolver'
import { buildOperationalInvestigationSnapshot } from './investigationSnapshot'
import { agentWidgetRegistry } from './registry'
import { buildAgentApplicationContext } from './context'

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
  }
}
