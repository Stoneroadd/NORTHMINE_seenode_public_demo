import { beforeEach, describe, expect, it } from 'vitest'
import { useAgentRuntimeStore } from './runtimeStore'
import type { AgentEvent } from './protocol'

/**
 * Tests del reductor puro del Runtime (Etapa 4). Nada de red ni WebSocket
 * real aca - solo se verifica que `applyEvent` deriva el estado correcto a
 * partir de la secuencia de eventos que el servidor ya garantiza ordenada
 * (AgentSessionClient.test no se agrega: requeriria mockear WebSocket
 * global, de valor bajo frente al costo - la cobertura real de la
 * conexion/reconexion vive en la validacion E2E contra un servidor real).
 */

function evt(type: AgentEvent['event_type'], payload: Record<string, unknown> = {}, extra: Partial<AgentEvent> = {}): AgentEvent {
  return {
    protocol_version: '1.0', event_id: `evt-${Math.random()}`, session_id: 's1',
    investigation_id: null, step_id: null, correlation_id: 'c1', sequence: 1,
    timestamp: new Date().toISOString(), event_type: type, payload, ...extra,
  }
}

const SAMPLE_PLAN = {
  investigation_id: 'inv-1', type: 'shift_summary', goal: 'Generar resumen de turno', status: 'planned',
  scope: { equipment_ids: [] }, missing_capabilities: [],
  steps: [
    { step_id: 'step-1', kind: 'tool', capability_id: 'get_current_shift_summary', description: 'Obtener resumen', status: 'pending', requirement: 'required', evidence_ids: [] },
    { step_id: 'step-2', kind: 'tool', capability_id: 'get_alerts', description: 'Revisar alertas', status: 'pending', requirement: 'required', evidence_ids: [] },
  ],
}

describe('useAgentRuntimeStore.applyEvent', () => {
  beforeEach(() => {
    useAgentRuntimeStore.setState(useAgentRuntimeStore.getInitialState())
  })

  it('session.ready fija sessionId y el estado inicial', () => {
    useAgentRuntimeStore.getState().applyEvent(evt('session.ready', { sessionId: 'asess-1', state: 'idle', activeInvestigationId: null }))
    const s = useAgentRuntimeStore.getState()
    expect(s.sessionId).toBe('asess-1')
    expect(s.state).toBe('idle')
  })

  it('agent.state.changed actualiza el estado - fuente unica de verdad', () => {
    useAgentRuntimeStore.getState().applyEvent(evt('agent.state.changed', { state: 'executing' }))
    expect(useAgentRuntimeStore.getState().state).toBe('executing')
  })

  it('agent.plan.created reemplaza el plan y limpia resultados previos', () => {
    useAgentRuntimeStore.setState({ conclusion: { summary: 'viejo' } as any, findings: [{ finding_id: 'f-old' } as any] })
    useAgentRuntimeStore.getState().applyEvent(evt('agent.plan.created', { plan: SAMPLE_PLAN }, { investigation_id: 'inv-1' }))
    const s = useAgentRuntimeStore.getState()
    expect(s.plan?.investigation_id).toBe('inv-1')
    expect(s.conclusion).toBeNull()
    expect(s.findings).toEqual([])
  })

  it('step.started marca el paso como running y no toca los demas', () => {
    useAgentRuntimeStore.getState().applyEvent(evt('agent.plan.created', { plan: SAMPLE_PLAN }))
    useAgentRuntimeStore.getState().applyEvent(evt('step.started', {}, { step_id: 'step-1' }))
    const steps = useAgentRuntimeStore.getState().plan!.steps
    expect(steps.find((s) => s.step_id === 'step-1')!.status).toBe('running')
    expect(steps.find((s) => s.step_id === 'step-2')!.status).toBe('pending')
  })

  it('tool.completed y step.completed actualizan solo el paso correspondiente por step_id', () => {
    useAgentRuntimeStore.getState().applyEvent(evt('agent.plan.created', { plan: SAMPLE_PLAN }))
    useAgentRuntimeStore.getState().applyEvent(evt('tool.completed', { durationMs: 42 }, { step_id: 'step-1' }))
    useAgentRuntimeStore.getState().applyEvent(evt('step.completed', { status: 'completed' }, { step_id: 'step-1' }))
    const steps = useAgentRuntimeStore.getState().plan!.steps
    const step1 = steps.find((s) => s.step_id === 'step-1')!
    expect(step1.status).toBe('completed')
    expect(step1.duration_ms).toBe(42)
    expect(steps.find((s) => s.step_id === 'step-2')!.status).toBe('pending')
  })

  it('ui_action.requested fija pendingUiAction y ui_action.completed lo limpia', () => {
    useAgentRuntimeStore.getState().applyEvent(
      evt('ui_action.requested', { actionId: 'action-1', capabilityId: 'select_equipment_entity', requirement: 'required', entityQuery: 'PALA 03' }, { step_id: 'step-0' }),
    )
    expect(useAgentRuntimeStore.getState().pendingUiAction?.actionId).toBe('action-1')

    useAgentRuntimeStore.getState().applyEvent(evt('ui_action.completed', { actionId: 'action-1' }))
    expect(useAgentRuntimeStore.getState().pendingUiAction).toBeNull()
  })

  it('finding.created acumula hallazgos y los limita a 30', () => {
    for (let i = 0; i < 35; i += 1) {
      useAgentRuntimeStore.getState().applyEvent(
        evt('finding.created', { finding_id: `f-${i}`, investigation_id: 'inv-1', label: 'x', summary: `hallazgo ${i}`, severity: 'informational', evidence_ids: [], created_at: '2026-01-01', speak: false }),
      )
    }
    expect(useAgentRuntimeStore.getState().findings).toHaveLength(30)
    expect(useAgentRuntimeStore.getState().findings[29].finding_id).toBe('f-34')
  })

  it('agent.speech.segment fija el segmento activo y lo agrega a la transcripcion; agent.speech.stop lo limpia', () => {
    useAgentRuntimeStore.getState().applyEvent(
      evt('agent.speech.segment', { segmentId: 'seg-1', text: 'La producción está bajo el plan.', priority: 'finding', sequence: 1, interruptible: true }),
    )
    expect(useAgentRuntimeStore.getState().activeSpeechSegment?.segmentId).toBe('seg-1')
    const transcript = useAgentRuntimeStore.getState().transcript
    expect(transcript[transcript.length - 1]?.text).toContain('producción')

    useAgentRuntimeStore.getState().applyEvent(evt('agent.speech.stop', {}))
    expect(useAgentRuntimeStore.getState().activeSpeechSegment).toBeNull()
  })

  it('investigation.completed fija el resultado y libera la investigacion activa', () => {
    const result = { plan: SAMPLE_PLAN, evidence: [], verification: { status: 'verified' }, hypotheses: [], conclusion: { summary: 'listo', decision_authority: 'human', requires_human_approval: true } }
    useAgentRuntimeStore.getState().applyEvent(evt('investigation.completed', { result }))
    const s = useAgentRuntimeStore.getState()
    expect(s.conclusion?.summary).toBe('listo')
    expect(s.activeInvestigationId).toBeNull()
    expect(s.pendingUiAction).toBeNull()
  })

  it('investigation.failed y agent.error dejan un mensaje legible en lastError', () => {
    useAgentRuntimeStore.getState().applyEvent(evt('investigation.failed', { message: 'fuera de alcance' }))
    expect(useAgentRuntimeStore.getState().lastError).toBe('fuera de alcance')
  })

  it('eventos de tipo desconocido no rompen el store (se ignoran)', () => {
    expect(() => useAgentRuntimeStore.getState().applyEvent(evt('algo.inventado' as any, {}))).not.toThrow()
  })
})
