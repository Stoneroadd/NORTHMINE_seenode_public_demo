/**
 * Espejo TypeScript de backend/app/ai/runtime/protocol.py (Etapa 4, seccion 6).
 * Mismos nombres de evento en ambos lados - si el backend agrega o quita un
 * tipo, este archivo debe actualizarse junto con el (no hay generacion
 * automatica de tipos entre Python y TS en este proyecto).
 */

export const PROTOCOL_VERSION = '1.0'

export type ClientEventType =
  | 'session.start' | 'session.resume' | 'session.heartbeat' | 'context.update' | 'demo.start'
  | 'user.text' | 'user.intent' | 'user.speech.partial' | 'user.speech.final'
  | 'agent.pause' | 'agent.resume' | 'agent.cancel' | 'agent.interrupt'
  | 'ui_action.completed' | 'ui_action.failed' | 'ui_action.rejected' | 'ui_action.cancelled'
  | 'approval.confirmed' | 'approval.rejected'
  | 'speech.playback.started' | 'speech.playback.completed' | 'speech.playback.failed' | 'speech.playback.interrupted'
  // Etapa 5: percepcion
  | 'perception.observation_reported' | 'perception.capture_unavailable'

export type ServerEventType =
  | 'session.ready' | 'demo.ready'
  | 'agent.state.changed'
  | 'agent.plan.created' | 'agent.plan.updated'
  | 'step.started' | 'step.completed'
  | 'tool.started' | 'tool.completed' | 'tool.failed'
  | 'ui_action.requested' | 'ui_action.waiting' | 'ui_action.completed' | 'ui_action.failed'
  | 'verification.started' | 'verification.completed'
  | 'hypothesis.updated'
  | 'finding.created'
  | 'agent.text.delta'
  | 'agent.speech.segment' | 'agent.speech.stop'
  | 'investigation.completed' | 'investigation.failed' | 'investigation.cancelled'
  | 'agent.error'
  // Etapa 5: percepcion
  | 'perception.capture_requested' | 'perception.snapshot_updated' | 'perception.conflict_detected'
  // Etapa 6: memoria, proactividad, work products
  | 'memory.recalled' | 'watch.created' | 'watch.cancelled' | 'watch.triggered'
  | 'proactive.event_emitted' | 'quiet_mode.changed' | 'work_product.ready'

export interface AgentEvent<TPayload = Record<string, unknown>> {
  protocol_version: string
  event_id: string
  session_id: string
  investigation_id: string | null
  step_id: string | null
  correlation_id: string
  sequence: number
  timestamp: string
  event_type: ServerEventType | ClientEventType
  payload: TPayload
}

export type AgentRuntimeState =
  | 'idle' | 'listening' | 'planning' | 'executing' | 'verifying'
  | 'speaking' | 'paused' | 'interrupted' | 'cancelled' | 'failed'

let counter = 0
export function newEventId(): string {
  counter += 1
  return `evt-${Date.now().toString(36)}-${counter}`
}

export function newCorrelationId(): string {
  return `corr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function buildClientEvent(eventType: ClientEventType, payload: Record<string, unknown> = {}, correlationId?: string): Partial<AgentEvent> {
  return {
    protocol_version: PROTOCOL_VERSION,
    event_id: newEventId(),
    correlation_id: correlationId ?? newCorrelationId(),
    event_type: eventType,
    payload,
  }
}
