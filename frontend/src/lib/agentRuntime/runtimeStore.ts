import { create } from 'zustand'
import type { AgentEvent, AgentRuntimeState } from './protocol'
import type { ConnectionStatus } from './AgentSessionClient'
import type { AgentSpeechSegment } from '../agentVoice/types'
import type {
  InvestigationConclusion,
  InvestigationPlan,
  OperationalHypothesis,
  PlanStep,
  VerificationResult,
} from '../agentInvestigations'
import type { AgentActionResult } from '../agentRegistry/types'
import type {
  AgentWatch,
  MemoryRecalledPayload,
  ProactiveAgentEvent,
  QuietMode,
  ReportDraft,
  ShiftHandoverDraft,
  TaskDraft,
  WorkProductReadyPayload,
} from '../agentWorkProducts'

/**
 * Estado del Agent Runtime reflejado para React (Etapa 4, seccion 8 del
 * brief: "el frontend puede derivar flags visuales, pero la fuente de
 * verdad debe ser la maquina de estados del Runtime"). Este store NUNCA
 * decide el estado por su cuenta - solo aplica lo que llega en
 * `agent.state.changed` y el resto de eventos del servidor. Los efectos
 * secundarios (ejecutar ui_action, reproducir voz) viven en
 * runtimeController.ts, no aca.
 */

export interface AgentFinding {
  finding_id: string
  investigation_id: string
  label: string
  summary: string
  severity: 'informational' | 'warning' | 'critical'
  evidence_ids: string[]
  created_at: string
  speak: boolean
}

export interface TranscriptEntry {
  id: string
  role: 'user' | 'agent'
  text: string
  timestamp: string
}

export interface PendingUiAction {
  actionId: string
  capabilityId: string
  requirement: 'required' | 'optional' | 'presentation_only'
  moduleId: string | null
  widgetId: string | null
  entityQuery: string | null
  stepId: string | null
}

interface AgentRuntimeStore {
  connectionStatus: ConnectionStatus
  state: AgentRuntimeState
  sessionId: string | null
  activeInvestigationId: string | null
  plan: InvestigationPlan | null
  findings: AgentFinding[]
  hypotheses: OperationalHypothesis[]
  verification: VerificationResult | null
  conclusion: InvestigationConclusion | null
  lastResult: Record<string, unknown> | null
  transcript: TranscriptEntry[]
  pendingUiAction: PendingUiAction | null
  activeSpeechSegment: AgentSpeechSegment | null
  lastError: string | null
  currentActivityLabel: string | null
  uiActionResults: AgentActionResult[]

  // Etapa 6: memoria, proactividad, work products - seccion 28/30 del brief.
  memoryRecall: MemoryRecalledPayload | null
  quietMode: QuietMode
  watches: AgentWatch[]
  proactiveEvents: ProactiveAgentEvent[]
  reports: ReportDraft[]
  handovers: ShiftHandoverDraft[]
  tasks: TaskDraft[]
  lastWorkProduct: WorkProductReadyPayload | null

  setConnectionStatus: (status: ConnectionStatus) => void
  addUserTranscript: (text: string) => void
  recordUiActionResult: (result: AgentActionResult) => void
  applyEvent: (event: AgentEvent) => void
  resetInvestigationView: () => void
}

function stepLabelFor(plan: InvestigationPlan | null, stepId: string | null): string | null {
  if (!plan || !stepId) return null
  const step = plan.steps.find((s) => s.step_id === stepId)
  return step?.description ?? null
}

function patchStep(plan: InvestigationPlan, stepId: string | undefined, patch: Partial<PlanStep>): InvestigationPlan {
  if (!stepId) return plan
  return { ...plan, steps: plan.steps.map((s) => (s.step_id === stepId ? { ...s, ...patch } : s)) }
}

export const useAgentRuntimeStore = create<AgentRuntimeStore>((set, get) => ({
  connectionStatus: 'disconnected',
  state: 'idle',
  sessionId: null,
  activeInvestigationId: null,
  plan: null,
  findings: [],
  hypotheses: [],
  verification: null,
  conclusion: null,
  lastResult: null,
  transcript: [],
  pendingUiAction: null,
  activeSpeechSegment: null,
  lastError: null,
  currentActivityLabel: null,
  uiActionResults: [],

  memoryRecall: null,
  quietMode: 'normal',
  watches: [],
  proactiveEvents: [],
  reports: [],
  handovers: [],
  tasks: [],
  lastWorkProduct: null,

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  addUserTranscript: (text) =>
    set((s) => ({
      transcript: [...s.transcript, { id: `t-${Date.now()}`, role: 'user' as const, text, timestamp: new Date().toISOString() }].slice(-50),
    })),

  recordUiActionResult: (result) => set((s) => ({ uiActionResults: [...s.uiActionResults, result].slice(-4) })),

  resetInvestigationView: () =>
    set({
      plan: null, findings: [], hypotheses: [], verification: null, conclusion: null,
      lastResult: null, pendingUiAction: null, currentActivityLabel: null,
    }),

  applyEvent: (event) => {
    const payload = event.payload as Record<string, any>
    switch (event.event_type) {
      case 'session.ready':
        set({ sessionId: payload.sessionId, state: payload.state, activeInvestigationId: payload.activeInvestigationId ?? null })
        return

      case 'agent.state.changed':
        set({ state: payload.state })
        if (payload.state === 'idle') set({ pendingUiAction: null, currentActivityLabel: null })
        return

      case 'agent.plan.created':
        set({ plan: payload.plan, activeInvestigationId: payload.plan.investigation_id, findings: [], hypotheses: [], conclusion: null, verification: null, lastResult: null })
        return

      case 'agent.plan.updated':
        set((s) => (s.plan ? { plan: { ...s.plan, scope: { ...s.plan.scope, equipment_ids: payload.focus ? [payload.focus] : s.plan.scope.equipment_ids } } } : {}))
        return

      case 'step.started': {
        const plan = get().plan
        if (!plan) return
        const updated = patchStep(plan, event.step_id ?? undefined, { status: 'running' })
        set({ plan: updated, currentActivityLabel: stepLabelFor(updated, event.step_id) })
        return
      }

      case 'tool.completed':
      case 'tool.failed': {
        const plan = get().plan
        if (!plan) return
        set({ plan: patchStep(plan, event.step_id ?? undefined, { duration_ms: payload.durationMs ?? null, error: payload.error ?? null }) })
        return
      }

      case 'step.completed': {
        const plan = get().plan
        if (!plan) return
        set({ plan: patchStep(plan, event.step_id ?? undefined, { status: payload.status ?? 'completed' }) })
        return
      }

      case 'ui_action.requested':
        set({
          pendingUiAction: {
            actionId: payload.actionId, capabilityId: payload.capabilityId, requirement: payload.requirement,
            moduleId: payload.moduleId ?? null, widgetId: payload.widgetId ?? null, entityQuery: payload.entityQuery ?? null,
            stepId: event.step_id ?? null,
          },
        })
        return

      case 'ui_action.completed':
      case 'ui_action.failed':
        set((s) => (s.pendingUiAction?.actionId === payload.actionId ? { pendingUiAction: null } : {}))
        return

      case 'verification.completed':
        set({ verification: payload.verification })
        return

      case 'hypothesis.updated':
        set({ hypotheses: payload.hypotheses })
        return

      case 'finding.created':
        set((s) => ({ findings: [...s.findings, payload as AgentFinding].slice(-30) }))
        return

      case 'agent.text.delta':
        set((s) => ({
          transcript: [...s.transcript, { id: event.event_id, role: 'agent' as const, text: payload.text, timestamp: event.timestamp }].slice(-50),
        }))
        return

      case 'agent.speech.segment':
        set((s) => ({
          activeSpeechSegment: payload as AgentSpeechSegment,
          transcript: [...s.transcript, { id: payload.segmentId, role: 'agent' as const, text: payload.text, timestamp: event.timestamp }].slice(-50),
        }))
        return

      case 'agent.speech.stop':
        set({ activeSpeechSegment: null })
        return

      case 'investigation.completed':
        set({
          lastResult: payload.result, plan: payload.result.plan, verification: payload.result.verification,
          hypotheses: payload.result.hypotheses, conclusion: payload.result.conclusion,
          activeInvestigationId: null, pendingUiAction: null, currentActivityLabel: null,
        })
        return

      case 'investigation.cancelled':
        set({ activeInvestigationId: null, pendingUiAction: null, currentActivityLabel: null })
        return

      case 'investigation.failed':
        set({ lastError: payload.message ?? 'La investigación no pudo completarse.', activeInvestigationId: null })
        return

      case 'agent.error':
        set({ lastError: payload.message ?? 'Error del agente.' })
        return

      // ── Etapa 6: memoria, proactividad, work products ──────────────────
      case 'memory.recalled':
        set({ memoryRecall: payload as MemoryRecalledPayload })
        return

      case 'watch.created':
        set((s) => ({ watches: [payload.watch as AgentWatch, ...s.watches].slice(0, 20) }))
        return

      case 'watch.cancelled':
        set((s) => ({
          watches: s.watches.map((w) => (w.watch_id === (payload.watch as AgentWatch).watch_id ? (payload.watch as AgentWatch) : w)),
        }))
        return

      case 'watch.triggered':
        set((s) => ({
          watches: s.watches.map((w) => (w.watch_id === payload.watchId ? { ...w, status: 'triggered' as const } : w)),
        }))
        return

      case 'proactive.event_emitted':
        set((s) => ({ proactiveEvents: [payload.event as ProactiveAgentEvent, ...s.proactiveEvents].slice(0, 20) }))
        return

      case 'quiet_mode.changed':
        set({ quietMode: payload.mode as QuietMode })
        return

      case 'work_product.ready': {
        const wp = payload as WorkProductReadyPayload
        set((s) => {
          const next: Partial<AgentRuntimeStore> = { lastWorkProduct: wp }
          if (wp.productType === 'report' && wp.report) {
            next.reports = [wp.report, ...s.reports.filter((r) => r.report_id !== wp.report!.report_id)].slice(0, 20)
          }
          if (wp.productType === 'handover' && wp.handover) {
            next.handovers = [wp.handover, ...s.handovers.filter((h) => h.handover_id !== wp.handover!.handover_id)].slice(0, 10)
          }
          if (wp.productType === 'task' && wp.task) {
            next.tasks = [wp.task, ...s.tasks.filter((t) => t.task_id !== wp.task!.task_id)].slice(0, 30)
          }
          if (wp.productType === 'pending_work_summary') {
            if (wp.tasks) next.tasks = wp.tasks
            if (wp.watches) next.watches = wp.watches
          }
          return next
        })
        return
      }

      default:
        return
    }
  },
}))
