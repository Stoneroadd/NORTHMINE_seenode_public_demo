import { agentSessionClient } from '../agentRuntime/AgentSessionClient'
import type { ConversationTransport } from './contracts'

/**
 * Unica implementacion real de ConversationTransport (Etapa 7, seccion 3):
 * envuelve AgentSessionClient para que ConversationTurnManager nunca
 * importe el WebSocket directamente - eso permite testear el turn manager
 * con un doble de prueba (ver ConversationTurnManager.test.ts) sin tocar
 * WebSocket/sessionStorage reales.
 *
 * No se agregan tipos de evento nuevos al protocolo (seccion 34): se
 * reusan user.speech.partial/user.speech.final/agent.interrupt/agent.cancel
 * ya existentes, con `turnId` como campo adicional del payload (el backend
 * ya acepta payload arbitrario - ver ws_router.py _dispatch_client_event).
 */
export class RuntimeConversationTransport implements ConversationTransport {
  sendUserSpeechPartial(turnId: string, text: string): void {
    agentSessionClient.send('user.speech.partial', { turnId, text })
  }

  sendUserSpeechFinal(turnId: string, text: string, meta: { language: string; confidence: number | null; durationMs: number; provider: string }): void {
    agentSessionClient.send('user.speech.final', { turnId, text, ...meta })
  }

  sendInterrupt(newTurnId: string): void {
    agentSessionClient.send('agent.interrupt', { turnId: newTurnId })
  }

  sendCancel(): void {
    agentSessionClient.send('agent.cancel', {})
  }
}

export const runtimeConversationTransport = new RuntimeConversationTransport()
