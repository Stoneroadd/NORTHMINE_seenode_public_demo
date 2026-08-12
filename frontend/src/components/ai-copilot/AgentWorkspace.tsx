import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, Bell, Brain, Camera, Check, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Eye, ExternalLink,
  FileText, Loader2, Mic, MicOff, Pause, Play, RefreshCw, Send, ShieldAlert, Square, ThumbsDown, ThumbsUp, Volume2, VolumeX,
  Watch, X,
} from 'lucide-react'
import { agentSessionClient } from '../../lib/agentRuntime/AgentSessionClient'
import { useAgentRuntimeStore } from '../../lib/agentRuntime/runtimeStore'
import { conversationTurnManager } from '../../lib/agentRealtime/ConversationTurnManager'
import type { ConversationTurn } from '../../lib/agentRealtime/contracts'
import { classifyMicRequestError, queryMicPermissionState, requestMicrophoneStream } from '../../lib/agentRealtime/micPermission'
import { speechOutputRouter } from '../../lib/agentVoice/SpeechOutputRouter'
import type { VoiceOutputProviderName } from '../../lib/agentVoice/types'
import type { CopilotContext } from '../../lib/aiCopilot'
import { AgentActionOverlay } from './AgentActionOverlay'
import { AgentLiveTranscript } from './AgentLiveTranscript'
import { MicOnboardingModal } from './MicOnboardingModal'
import { usePerceptionStore } from '../../lib/agentPerception/perceptionStore'
import { performCaptureAndAnalyze } from '../../lib/agentPerception/perceptionManager'
import { buildSemanticPerceptionSnapshot } from '../../lib/agentPerception/semanticPerception'
import { agentWidgetRegistry } from '../../lib/agentRegistry/registry'
import type { SemanticPerceptionSnapshot } from '../../lib/agentPerception/types'
import { workProductsApi } from '../../lib/agentWorkProducts'
import type { MemorySummary, ReportDraft, ShiftHandoverDraft, TaskDraft } from '../../lib/agentWorkProducts'
import { actionsForModule, moduleFromPath } from '../../lib/agentRuntime/quickActions'
import { AGENT_DEMO_WORK_PRODUCT_FOCUS, AGENT_DEMO_WORK_PRODUCT_READY } from '../../lib/agentDemo/events'

interface Props {
  open: boolean
  onClose: () => void
  context: CopilotContext
  role: string
  canApprove: boolean
}

const STATE_LABELS: Record<string, string> = {
  idle: 'Disponible', listening: 'Escuchando', planning: 'Planificando', executing: 'Investigando',
  verifying: 'Validando', speaking: 'Hablando', paused: 'Pausado', interrupted: 'Interrumpido',
  cancelled: 'Disponible', failed: 'Requiere atención',
}

const VOICE_LABELS: Record<VoiceOutputProviderName, string> = {
  elevenlabs: 'Voz NORTHMINE', browser: 'Voz local de respaldo', text_only: 'Solo texto',
}

const STEP_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', running: 'En curso', completed: 'Completado', failed: 'Fallido',
  skipped: 'Omitido', cancelled: 'Cancelado', rejected: 'Rechazado',
}

const CONFIDENCE_LABELS: Record<string, string> = { high: 'alta', medium: 'media', low: 'baja' }

const ENTITY_STATUS_LABELS: Record<string, string> = {
  new: 'nuevo', ongoing: 'en curso', worsening: 'empeorando', improving: 'mejorando', resolved: 'resuelto',
}

const WORK_PRODUCT_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', review: 'En revisión', approved: 'Aprobado', rejected: 'Rechazado',
  pending_approval: 'Pendiente de aprobación', in_progress: 'En curso', completed: 'Completado', cancelled: 'Cancelado',
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  SHIFT_REPORT: 'Informe de turno', INVESTIGATION_REPORT: 'Informe de investigación', PRODUCTION_REPORT: 'Informe de producción',
  FLEET_REPORT: 'Informe de flota', BREAKDOWN_REPORT: 'Informe de averías', EXECUTIVE_SUMMARY: 'Resumen ejecutivo',
}

function relativeFreshness(iso: string): { label: string; status: 'current' | 'stale' | 'unknown' } {
  const ageMs = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ageMs)) return { label: 'desconocida', status: 'unknown' }
  const ageSeconds = Math.round(ageMs / 1000)
  if (ageSeconds < 60) return { label: `hace ${ageSeconds}s`, status: 'current' }
  const ageMinutes = Math.round(ageSeconds / 60)
  if (ageMinutes < 10) return { label: `hace ${ageMinutes} min`, status: 'current' }
  return { label: `hace ${ageMinutes} min`, status: 'stale' }
}

function focusedWidgetLabel(snapshot: SemanticPerceptionSnapshot | null): string {
  if (!snapshot?.focusedWidgetId) return 'Ninguno'
  const widget = snapshot.visibleWidgets.find((w) => w.widgetId === snapshot.focusedWidgetId)
  return widget?.label ?? snapshot.focusedWidgetId
}

/**
 * NORTHMINE Operational Intelligence Agent - superficie de observabilidad,
 * evidencia, auditoria y control del Agent Runtime (Etapa 4). No es un
 * chat: el usuario escribe o dice una instruccion (el Command Router
 * determinista la interpreta), y aca se ve el plan, el progreso, los
 * hallazgos en vivo, las hipotesis y el resultado - la transcripcion queda
 * como bitacora secundaria, colapsada por defecto. El Agent Runtime sigue
 * trabajando aunque este panel este cerrado (AgentPresence posee la
 * conexion WS; este componente solo se suscribe a su estado).
 */
export function AgentWorkspace({ open, onClose, context, role: _role, canApprove }: Props) {
  const runtime = useAgentRuntimeStore()
  const [inputText, setInputText] = useState('')
  const [muted, setMuted] = useState(false)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  // Estados de onboarding del microfono: DESACTIVADO(idle)/SOLICITANDO
  // PERMISO(requesting)/ACTIVO(listening ya cubre esto)/BLOQUEADO(blocked)/
  // SIN DISPOSITIVO(no_device). 'showing_onboarding' es el modal propio de
  // NORTHMINE, antes del dialogo nativo del navegador.
  const [micState, setMicState] = useState<'idle' | 'showing_onboarding' | 'requesting' | 'blocked' | 'no_device'>('idle')
  // Separado de micState: evita que el modal "parpadee" cuando el permiso
  // ya estaba concedido (ese camino pasa por 'requesting' tambien, pero sin
  // haber mostrado nunca la explicacion previa).
  const [micOnboardingOpen, setMicOnboardingOpen] = useState(false)
  const [voiceProvider, setVoiceProvider] = useState<VoiceOutputProviderName | null>(null)
  const [currentTurn, setCurrentTurn] = useState<ConversationTurn | null>(null)
  const [micLevel, setMicLevel] = useState(0)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const transcribedTurnIdsRef = useRef<Set<string>>(new Set())

  const [perceptionSnapshot, setPerceptionSnapshot] = useState<SemanticPerceptionSnapshot | null>(null)
  const [showCapture, setShowCapture] = useState(false)
  const [showPerceptionEvidence, setShowPerceptionEvidence] = useState(false)
  const perception = usePerceptionStore()

  const [memorySummary, setMemorySummary] = useState<MemorySummary | null>(null)
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [workOpen, setWorkOpen] = useState(false)
  const [openReportId, setOpenReportId] = useState<string | null>(null)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const demoReportRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const focusWorkProduct = (event: Event) => {
      const reportId = (event as CustomEvent<{ reportId?: string }>).detail?.reportId
      setWorkOpen(true)
      if (reportId) setOpenReportId(reportId)
    }
    window.addEventListener(AGENT_DEMO_WORK_PRODUCT_FOCUS, focusWorkProduct)
    return () => window.removeEventListener(AGENT_DEMO_WORK_PRODUCT_FOCUS, focusWorkProduct)
  }, [])

  useEffect(() => {
    if (!open || !workOpen || !openReportId) return
    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        demoReportRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' })
        window.dispatchEvent(new CustomEvent(AGENT_DEMO_WORK_PRODUCT_READY, { detail: { reportId: openReportId } }))
      })
    })
    return () => window.cancelAnimationFrame(firstFrame)
  }, [open, workOpen, openReportId])

  useEffect(() => {
    speechOutputRouter.onProviderChanged(setVoiceProvider)
  }, [])

  useEffect(() => {
    // Etapa 7: se suscribe una sola vez, independiente de si el panel esta
    // abierto - conversationTurnManager es un singleton residente (mismo
    // patron que agentSessionClient/speechOutputRouter), asi que un
    // barge-in real detectado por VAD funciona aunque el usuario haya
    // cerrado el workspace despues de activar el microfono.
    const unsubTurn = conversationTurnManager.onTurn((turn) => {
      setCurrentTurn(turn)
      if (turn.finalText && !transcribedTurnIdsRef.current.has(turn.turnId)) {
        // El turn manager ya mando user.speech.final por su cuenta (via
        // ConversationTransport) - esto solo refleja lo dicho en la
        // bitacora visible, no vuelve a enviarlo (evita duplicar el texto
        // que dispara al Command Router).
        transcribedTurnIdsRef.current.add(turn.turnId)
        useAgentRuntimeStore.getState().addUserTranscript(turn.finalText)
      }
      if (turn.status === 'completed' || turn.status === 'cancelled' || turn.status === 'failed') {
        setListening(conversationTurnManager.isActive())
      }
    })
    const unsubLevel = conversationTurnManager.onInputLevel(setMicLevel)
    return () => {
      unsubTurn()
      unsubLevel()
    }
  }, [])

  useEffect(() => {
    if (!open) return
    // Refresco local solo para pintar la seccion Percepcion mientras el
    // panel esta abierto - el envio real al Runtime (context.update) lo
    // hace perceptionManager de forma independiente de este componente.
    setPerceptionSnapshot(buildSemanticPerceptionSnapshot())
    const timer = window.setInterval(() => setPerceptionSnapshot(buildSemanticPerceptionSnapshot()), 800)
    return () => window.clearInterval(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    // El contexto de aplicacion (seccion/turno/fecha) viaja al Runtime en
    // cada apertura del panel para que el Command Router y los pasos de UI
    // tengan la mejor foto disponible del estado actual de NORTHMINE.
    agentSessionClient.send('context.update', { context })
  }, [open, context])

  useEffect(() => {
    if (!open) return
    // Etapa 6: al abrir el panel, se trae lo que ya existia ANTES de esta
    // sesion (informes/tareas/seguimientos pendientes de otras sesiones) -
    // los eventos WS solo cubren lo que se crea mientras el panel esta
    // conectado, no el historial previo.
    workProductsApi.memorySummary().then(setMemorySummary).catch(() => setMemorySummary(null))
    Promise.all([
      workProductsApi.listReports(),
      workProductsApi.listHandovers(),
      workProductsApi.listTasks(true),
      workProductsApi.listWatches(),
    ]).then(([reports, handovers, tasks, watches]) => {
      useAgentRuntimeStore.setState((s) => ({
        reports: [...reports, ...s.reports.filter((r) => !reports.some((x) => x.report_id === r.report_id))],
        handovers: [...handovers, ...s.handovers.filter((h) => !handovers.some((x) => x.handover_id === h.handover_id))],
        tasks: [...tasks, ...s.tasks.filter((t) => !tasks.some((x) => x.task_id === t.task_id))],
        watches: [...watches, ...s.watches.filter((w) => !watches.some((x) => x.watch_id === w.watch_id))],
      }))
    }).catch(() => {})
  }, [open])

  async function approveReport(reportId: string) {
    setPendingActionId(reportId)
    try {
      const updated = await workProductsApi.approveReport(reportId)
      useAgentRuntimeStore.setState((s) => ({ reports: s.reports.map((r) => (r.report_id === reportId ? updated : r)) }))
    } finally {
      setPendingActionId(null)
    }
  }

  async function rejectReport(reportId: string) {
    setPendingActionId(reportId)
    try {
      const updated = await workProductsApi.rejectReport(reportId)
      useAgentRuntimeStore.setState((s) => ({ reports: s.reports.map((r) => (r.report_id === reportId ? updated : r)) }))
    } finally {
      setPendingActionId(null)
    }
  }

  async function approveHandover(handoverId: string) {
    setPendingActionId(handoverId)
    try {
      const updated = await workProductsApi.approveHandover(handoverId)
      useAgentRuntimeStore.setState((s) => ({ handovers: s.handovers.map((h) => (h.handover_id === handoverId ? updated : h)) }))
    } finally {
      setPendingActionId(null)
    }
  }

  async function rejectHandover(handoverId: string) {
    setPendingActionId(handoverId)
    try {
      const updated = await workProductsApi.rejectHandover(handoverId)
      useAgentRuntimeStore.setState((s) => ({ handovers: s.handovers.map((h) => (h.handover_id === handoverId ? updated : h)) }))
    } finally {
      setPendingActionId(null)
    }
  }

  async function approveTask(taskId: string) {
    setPendingActionId(taskId)
    try {
      const updated = await workProductsApi.approveTask(taskId)
      useAgentRuntimeStore.setState((s) => ({ tasks: s.tasks.map((t) => (t.task_id === taskId ? updated : t)) }))
    } finally {
      setPendingActionId(null)
    }
  }

  async function rejectTask(taskId: string) {
    setPendingActionId(taskId)
    try {
      const updated = await workProductsApi.rejectTask(taskId)
      useAgentRuntimeStore.setState((s) => ({ tasks: s.tasks.map((t) => (t.task_id === taskId ? updated : t)) }))
    } finally {
      setPendingActionId(null)
    }
  }

  async function cancelWatch(watchId: string) {
    setPendingActionId(watchId)
    try {
      const updated = await workProductsApi.cancelWatch(watchId)
      useAgentRuntimeStore.setState((s) => ({ watches: s.watches.map((w) => (w.watch_id === watchId ? updated : w)) }))
    } finally {
      setPendingActionId(null)
    }
  }

  function sendCommand(text: string, viaVoice: boolean) {
    const trimmed = text.trim()
    if (!trimmed) return
    useAgentRuntimeStore.getState().addUserTranscript(trimmed)
    agentSessionClient.send(viaVoice ? 'user.speech.final' : 'user.text', { text: trimmed })
    setInputText('')
  }

  function sendQuickAction(intent: string) {
    agentSessionClient.send('user.intent', {
      intent,
      scope: 'current_context',
      module_id: moduleFromPath(window.location.pathname),
      source: 'quick_action',
    })
  }

  function micRequestErrorMessage(kind: 'blocked' | 'no_device' | 'unknown'): string {
    if (kind === 'blocked') return 'El micrófono está bloqueado para NORTHMINE. Habilítalo desde los permisos del sitio.'
    if (kind === 'no_device') return 'No se encontró un micrófono disponible en este dispositivo.'
    return 'No se pudo acceder al micrófono.'
  }

  async function activateWithStream(stream: MediaStream) {
    try {
      await conversationTurnManager.activate(stream)
      setListening(true)
      setMicState('idle')
      setMicError(null)
    } catch {
      setMicError('No se pudo iniciar el reconocimiento de voz.')
      setMicState('idle')
    } finally {
      setMicOnboardingOpen(false)
    }
  }

  // Unico punto que llama a getUserMedia (via requestMicrophoneStream) -
  // se invoca SOLO desde un click real (el boton de abajo si el permiso ya
  // esta concedido, o el boton del modal de onboarding si no) para que el
  // navegador siga considerando la llamada activada por el usuario en
  // cualquier dispositivo (desktop, Android, tablet).
  async function requestMicAndActivate() {
    setMicState('requesting')
    try {
      const stream = await requestMicrophoneStream()
      await activateWithStream(stream)
    } catch (error) {
      const kind = classifyMicRequestError(error)
      setMicState(kind === 'blocked' ? 'blocked' : kind === 'no_device' ? 'no_device' : 'idle')
      setMicError(micRequestErrorMessage(kind))
      setMicOnboardingOpen(false)
    }
  }

  async function toggleMic() {
    if (!conversationTurnManager.isSupported()) {
      setMicError('Reconocimiento de voz no disponible en este navegador.')
      return
    }
    if (listening) {
      conversationTurnManager.deactivate()
      setListening(false)
      setMicState('idle')
      return
    }
    setMicError(null)

    // queryMicPermissionState() es la UNICA consulta previa permitida antes
    // de getUserMedia: no requiere ni consume gesto del usuario (resuelve
    // casi instantaneo, sin red ni backend) - solo decide si hace falta
    // mostrar la explicacion de NORTHMINE antes del dialogo nativo, o si se
    // puede pedir el stream directo porque el permiso ya esta concedido.
    const permission = await queryMicPermissionState()
    if (permission === 'granted') {
      await requestMicAndActivate()
      return
    }
    if (permission === 'denied') {
      // Seccion "no repetir requests infinitamente": no se llama a
      // getUserMedia de nuevo automaticamente - se muestra el estado
      // bloqueado y se espera un nuevo click explicito del usuario (que
      // vuelve a consultar el permiso por si ya lo arreglo el mismo).
      setMicState('blocked')
      setMicError(micRequestErrorMessage('blocked'))
      return
    }
    // 'prompt' o 'unsupported' (Safari no soporta permissions.query para
    // microfono): mostrar la explicacion de NORTHMINE ANTES del dialogo
    // nativo del navegador - el click en el modal es el gesto real que
    // dispara requestMicAndActivate().
    setMicState('showing_onboarding')
    setMicOnboardingOpen(true)
  }

  function dismissMicOnboarding() {
    setMicState('idle')
    setMicOnboardingOpen(false)
  }

  function toggleMute() {
    const next = !muted
    setMuted(next)
    speechOutputRouter.setMuted(next)
  }

  function bargeIn() {
    speechOutputRouter.stop()
    agentSessionClient.send('agent.interrupt', {})
  }

  function openFocusedWidget() {
    const widgetId = perceptionSnapshot?.focusedWidgetId
    if (!widgetId) return
    agentWidgetRegistry.getElement(widgetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function analyzeAgain() {
    const widgetId = perceptionSnapshot?.focusedWidgetId ?? undefined
    void performCaptureAndAnalyze(widgetId ? 'widget' : 'viewport', widgetId)
  }

  if (!open) return null

  const plan = runtime.plan
  const toolSteps = plan?.steps.filter((s) => s.kind === 'tool') ?? []
  const uiSteps = plan?.steps.filter((s) => s.kind === 'ui_action') ?? []
  const completedSteps = toolSteps.filter((s) => s.status === 'completed').length
  const isBusy = ['planning', 'executing', 'verifying'].includes(runtime.state)
  const isPaused = runtime.state === 'paused'
  const isSpeaking = runtime.state === 'speaking'
  const conclusion = runtime.conclusion

  return (
    <div className="ai-copilot-overlay" role="dialog" aria-modal="true" aria-label="NORTHMINE AI — Operational Intelligence Agent">
      <div className="ai-copilot-backdrop" onClick={onClose} />
      <aside className={`ai-copilot-panel is-${runtime.state}`}>
        <header className="ai-copilot-header">
          <div>
            <span className="ai-copilot-eyebrow">NORTHMINE OPERATIONAL INTELLIGENCE AGENT</span>
            <h2>{STATE_LABELS[runtime.state] ?? runtime.state}</h2>
          </div>
          <button type="button" className="ai-copilot-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="ai-rt-status-bar">
          <span className={`ai-rt-connection is-${runtime.connectionStatus}`}>
            {runtime.connectionStatus === 'connected' ? 'Conectado'
              : runtime.connectionStatus === 'authenticating' ? 'Autenticando…'
              : runtime.connectionStatus === 'reconnecting' ? 'Reconectando…'
              : runtime.connectionStatus === 'connecting' ? 'Conectando…' : 'Desconectado'}
          </span>
          {voiceProvider && !muted && <span className="ai-rt-voice-badge">{VOICE_LABELS[voiceProvider]}</span>}
          {muted && <span className="ai-rt-voice-badge is-muted">Audio silenciado</span>}
        </div>

        <div className="ai-copilot-body" ref={bodyRef}>
          {runtime.lastError && (
            <p className="ai-inv-warning"><AlertTriangle size={12} /> {runtime.lastError}</p>
          )}

          {!plan && (
            <div className="ai-rt-empty">
              <p className="ai-inv-intro">
                Escribe o di lo que necesitas investigar. El agente construye un plan auditable, consulta
                herramientas de solo lectura y explica lo que encuentra a medida que avanza.
              </p>
              <div className="ai-copilot-quick-actions">
                {actionsForModule(moduleFromPath(window.location.pathname), 5).map((action) => (
                  <button key={action.id} type="button" onClick={() => sendQuickAction(action.intent)}>{action.label}</button>
                ))}
              </div>
            </div>
          )}

          {plan && (
            <div className="ai-inv-plan">
              <header>
                <strong>{plan.goal}</strong>
                <span className="ai-copilot-badge">{completedSteps}/{toolSteps.length} pasos</span>
              </header>
              {runtime.currentActivityLabel && isBusy && (
                <p className="ai-rt-activity"><Loader2 size={13} className="ai-copilot-spin" /> {runtime.currentActivityLabel}</p>
              )}
              <ul className="ai-inv-step-list">
                {toolSteps.map((step) => (
                  <li key={step.step_id} className={`ai-inv-step is-${step.status}`}>
                    {step.status === 'completed' ? <Check size={13} /> : step.status === 'running' ? <Loader2 size={13} className="ai-copilot-spin" /> : step.status === 'failed' ? <X size={13} /> : <span className="ai-inv-step-dot" />}
                    <span className="ai-inv-step-desc">{step.description}</span>
                    <span className="ai-inv-step-meta">{STEP_STATUS_LABELS[step.status] ?? step.status}{step.duration_ms != null ? ` · ${step.duration_ms}ms` : ''}</span>
                  </li>
                ))}
              </ul>
              {uiSteps.length > 0 && (
                <p className="ai-inv-ui-steps-note">+ {uiSteps.length} acciones de visibilidad en UI.</p>
              )}
              {runtime.pendingUiAction?.requirement === 'required' && (
                <p className="ai-rt-activity"><Loader2 size={13} className="ai-copilot-spin" /> Esperando confirmación de interfaz…</p>
              )}
            </div>
          )}

          {runtime.findings.length > 0 && (
            <div className="ai-rt-findings">
              <p className="ai-copilot-block-title">Hallazgos</p>
              <ul>
                {runtime.findings.map((f) => (
                  <li key={f.finding_id} className={`ai-rt-finding is-${f.severity}`}>{f.summary}</li>
                ))}
              </ul>
            </div>
          )}

          {plan && (
            <div className="ai-inv-evidence-toggle">
              <button type="button" onClick={() => setEvidenceOpen((v) => !v)}>
                {evidenceOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Ver evidencia
              </button>
            </div>
          )}
          {evidenceOpen && runtime.lastResult && (
            <ul className="ai-copilot-evidence-list">
              {((runtime.lastResult.evidence as any[]) ?? []).map((item) => (
                <li key={item.evidence_id}>
                  <span className="ai-copilot-evidence-source">{item.capability_id}</span>
                  <span className={`ai-copilot-badge ai-copilot-badge--freshness is-${item.freshness_status}`}>{item.freshness_status}</span>
                  <span className="ai-copilot-badge">calidad {item.quality_status}</span>
                </li>
              ))}
            </ul>
          )}

          {runtime.hypotheses.length > 0 && (
            <div className="ai-inv-hypotheses">
              <p className="ai-copilot-block-title">Hipótesis operacionales</p>
              {(['probable', 'possible', 'unsupported', 'insufficient_data'] as const).map((status) => {
                const items = runtime.hypotheses.filter((h) => h.status === status)
                if (!items.length) return null
                const label = { probable: 'Probables', possible: 'Posibles', unsupported: 'Descartadas', insufficient_data: 'Datos insuficientes' }[status]
                return (
                  <div key={status} className="ai-inv-hypothesis-group">
                    <span className="ai-inv-hypothesis-group-label">{label}</span>
                    <ul>
                      {items.map((h) => (
                        <li key={h.hypothesis_id}>{h.label}{h.score != null && <span className="ai-inv-hypothesis-score">{Math.round(h.score * 100)}%</span>}</li>
                      ))}
                    </ul>
                  </div>
                )
              })}
              <p className="ai-inv-hypothesis-caption">Puntaje heurístico interno, no es una probabilidad estadística.</p>
            </div>
          )}

          {conclusion && (
            <div className="ai-inv-conclusion">
              <p className="ai-copilot-block-title">Resultado</p>
              <p className="ai-inv-summary">{conclusion.summary}</p>
              {conclusion.probable_causes.length > 0 && (
                <div className="ai-copilot-block">
                  <span className="ai-copilot-block-title">Causas probables</span>
                  <ul>{conclusion.probable_causes.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </div>
              )}
              {conclusion.recommendations.length > 0 && (
                <div className="ai-copilot-block">
                  <span className="ai-copilot-block-title">Recomendaciones</span>
                  <ul>{conclusion.recommendations.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </div>
              )}
              {conclusion.limitations.length > 0 && (
                <div className="ai-copilot-block ai-copilot-block--limitations">
                  <span className="ai-copilot-block-title">Limitaciones</span>
                  <ul>{conclusion.limitations.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </div>
              )}
              <p className="ai-inv-approval"><ShieldAlert size={13} /> Requiere validación humana antes de tomar acción operacional.</p>
            </div>
          )}

          <div className="ai-perception-section">
            <p className="ai-copilot-block-title"><Eye size={11} /> Percepción</p>

            <dl className="ai-perception-facts">
              <div>
                <dt>Pantalla actual</dt>
                <dd>{perceptionSnapshot?.moduleId ?? perceptionSnapshot?.route ?? '—'}</dd>
              </div>
              <div>
                <dt>Widget enfocado</dt>
                <dd>
                  {focusedWidgetLabel(perceptionSnapshot)}
                  {perceptionSnapshot?.focusedWidgetId && (
                    <button type="button" className="ai-perception-inline-action" onClick={openFocusedWidget} aria-label="Abrir widget">
                      <ExternalLink size={11} /> Abrir
                    </button>
                  )}
                </dd>
              </div>
              <div>
                <dt>Entidades visibles</dt>
                <dd>{perceptionSnapshot?.selectedEntities.length ? perceptionSnapshot.selectedEntities.map((e) => e.id).join(', ') : 'Ninguna'}</dd>
              </div>
              <div>
                <dt>Filtros</dt>
                <dd>{Object.keys(perceptionSnapshot?.activeFilters ?? {}).length ? Object.entries(perceptionSnapshot!.activeFilters).map(([k, v]) => `${k}: ${v}`).join(' · ') : 'Sin filtros activos'}</dd>
              </div>
            </dl>

            <div className="ai-perception-visual">
              <p className="ai-copilot-block-title">Última percepción visual</p>
              {perception.isCapturing || perception.isAnalyzing ? (
                <p className="ai-copilot-thinking"><Loader2 size={13} className="ai-copilot-spin" /> {perception.isCapturing ? 'Capturando…' : 'Analizando…'}</p>
              ) : perception.lastObservation ? (
                <>
                  <p className="ai-perception-summary">{perception.lastObservation.summary}</p>
                  <div className="ai-perception-badges">
                    <span className="ai-copilot-badge ai-copilot-badge--type">{perception.lastObservation.targetType === 'widget' ? 'Widget' : 'Vista completa'}</span>
                    <span className={`ai-copilot-badge ai-copilot-badge--freshness is-${relativeFreshness(perception.lastObservation.createdAt).status}`}>
                      {relativeFreshness(perception.lastObservation.createdAt).label}
                    </span>
                    <span className={`ai-copilot-badge ai-copilot-badge--confidence is-${perception.lastObservation.confidence}`}>
                      confianza {CONFIDENCE_LABELS[perception.lastObservation.confidence] ?? perception.lastObservation.confidence}
                    </span>
                  </div>
                  {perception.lastConflict && (
                    <p className="ai-inv-warning"><AlertTriangle size={12} /> {perception.lastConflict.description}</p>
                  )}
                  <div className="ai-perception-actions">
                    {perception.lastCaptureUrl && (
                      <button type="button" onClick={() => setShowCapture((v) => !v)}>
                        <Camera size={12} /> {showCapture ? 'Ocultar captura' : 'Ver captura'}
                      </button>
                    )}
                    <button type="button" onClick={analyzeAgain} disabled={perception.isCapturing || perception.isAnalyzing}>
                      <RefreshCw size={12} /> Analizar de nuevo
                    </button>
                    <button type="button" onClick={() => setShowPerceptionEvidence((v) => !v)}>
                      {showPerceptionEvidence ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Mostrar evidencia
                    </button>
                  </div>
                  {showCapture && perception.lastCaptureUrl && (
                    <img className="ai-perception-capture-preview" src={perception.lastCaptureUrl} alt="Última captura analizada" />
                  )}
                  {showPerceptionEvidence && (
                    <div className="ai-copilot-evidence-list ai-perception-evidence">
                      {perception.lastObservation.detectedElements.length > 0 && (
                        <div><span className="ai-copilot-block-title">Elementos detectados</span><ul>{perception.lastObservation.detectedElements.map((el, i) => <li key={i}>{el}</li>)}</ul></div>
                      )}
                      {perception.lastObservation.possibleAnomalies.length > 0 && (
                        <div><span className="ai-copilot-block-title">Posibles anomalías</span><ul>{perception.lastObservation.possibleAnomalies.map((a, i) => <li key={i}>{a}</li>)}</ul></div>
                      )}
                      {perception.lastObservation.uncertainty.length > 0 && (
                        <div><span className="ai-copilot-block-title">Incertidumbre</span><ul>{perception.lastObservation.uncertainty.map((u, i) => <li key={i}>{u}</li>)}</ul></div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="ai-perception-actions">
                  <p className="ai-perception-empty">Sin percepción visual aún en esta sesión.</p>
                  {perception.mode !== 'visual_disabled' && (
                    <button type="button" onClick={analyzeAgain}>
                      <Camera size={12} /> Analizar vista actual
                    </button>
                  )}
                </div>
              )}
              {perception.lastCaptureError && (
                <p className="ai-inv-warning"><AlertTriangle size={12} /> {perception.lastCaptureError.message}</p>
              )}
              {perception.mode === 'visual_disabled' && (
                <p className="ai-perception-empty">Percepción visual desactivada por el usuario.</p>
              )}
            </div>
          </div>

          <div className="ai-memory-section">
            <button type="button" className="ai-copilot-block-title ai-section-toggle" onClick={() => setMemoryOpen((v) => !v)}>
              {memoryOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />} <Brain size={11} /> Memoria
            </button>
            {memoryOpen && (
              <div className="ai-memory-body">
                {runtime.memoryRecall && (
                  <div className="ai-memory-recall">
                    <span className="ai-copilot-block-title">Última consulta: {runtime.memoryRecall.queryEntity ?? '—'}</span>
                    <ul>
                      {runtime.memoryRecall.items.map((item) => (
                        <li key={item.ref_id}>
                          <span>{item.label}</span>
                          <span className="ai-copilot-badge">{item.status}</span>
                          <span className="ai-memory-item-date">{item.occurred_at}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="ai-memory-block">
                  <span className="ai-copilot-block-title">Investigaciones recientes</span>
                  {memorySummary?.recent_investigations.length ? (
                    <ul>
                      {memorySummary.recent_investigations.map((ep) => (
                        <li key={ep.episode_id}>
                          <strong>{ep.title}</strong>
                          <span className="ai-memory-item-date">{ep.outcome ?? 'sin resultado registrado'}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="ai-perception-empty">Sin investigaciones recientes registradas.</p>}
                </div>

                <div className="ai-memory-block">
                  <span className="ai-copilot-block-title">Equipos en seguimiento</span>
                  {memorySummary?.active_entities.length ? (
                    <ul>
                      {memorySummary.active_entities.map((entity) => (
                        <li key={entity.entity_id}>
                          <strong>{entity.entity}</strong> {entity.current_issue}
                          <span className={`ai-copilot-badge is-${entity.status}`}>{ENTITY_STATUS_LABELS[entity.status] ?? entity.status}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="ai-perception-empty">Sin equipos en seguimiento activo.</p>}
                </div>

                {runtime.proactiveEvents.length > 0 && (
                  <div className="ai-memory-block">
                    <span className="ai-copilot-block-title">Eventos relacionados</span>
                    <ul>
                      {runtime.proactiveEvents.slice(0, 5).map((ev) => (
                        <li key={ev.proactive_event_id}>
                          <span className={`ai-copilot-badge is-${ev.severity}`}>{ev.severity}</span> {ev.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="ai-memory-counts">
                  {runtime.reports.length} informe(s) · {runtime.tasks.length} tarea(s) · {runtime.watches.filter((w) => w.status === 'active').length} seguimiento(s) activo(s)
                </p>
              </div>
            )}
          </div>

          <div className="ai-work-section">
            <button type="button" className="ai-copilot-block-title ai-section-toggle" onClick={() => setWorkOpen((v) => !v)}>
              {workOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />} <ClipboardList size={11} /> Trabajo
            </button>
            {workOpen && (
              <div className="ai-work-body">
                <div className="ai-work-block">
                  <span className="ai-copilot-block-title"><FileText size={11} /> Informes</span>
                  {runtime.reports.length ? runtime.reports.map((report: ReportDraft) => (
                    <div key={report.report_id} className="ai-work-item" ref={openReportId === report.report_id ? demoReportRef : undefined}>
                      <div className="ai-work-item-header">
                        <button type="button" className="ai-work-item-title" onClick={() => setOpenReportId((id) => (id === report.report_id ? null : report.report_id))}>
                          {report.title || REPORT_TYPE_LABELS[report.report_type] || report.report_type} · v{report.version}
                        </button>
                        <span className={`ai-copilot-badge is-${report.status}`}>{WORK_PRODUCT_STATUS_LABELS[report.status] ?? report.status}</span>
                      </div>
                      <p className="ai-work-item-meta">Estado: {report.status === 'draft' ? 'Pendiente de validación' : WORK_PRODUCT_STATUS_LABELS[report.status] ?? report.status} · {report.generated_at} · {report.scope.audience}</p>
                      <p className={`ai-work-quality is-${report.quality_gate?.passed ? 'passed' : 'failed'}`}>
                        Verificación {report.quality_gate?.passed ? 'aprobada' : 'pendiente'} · {report.quality_gate?.total_score ?? 0}/100
                      </p>
                      {openReportId === report.report_id && (
                        <div className="ai-work-item-detail">
                          {report.sections.map((s) => (
                            <div key={s.section_id} className="ai-work-report-section">
                              <strong>{s.title}</strong>
                              <p>{s.content}</p>
                            </div>
                          ))}
                          {report.tables?.map((table) => (
                            <div key={table.table_id} className="ai-work-report-table">
                              <strong>{table.title}</strong><small>{table.question}</small>
                              <div className="ai-work-report-table-scroll"><table><thead><tr>{table.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
                                <tbody>{table.rows.map((row, index) => <tr key={index}>{table.columns.map((column) => <td key={column}>{row[column] ?? '—'}</td>)}</tr>)}</tbody></table></div>
                            </div>
                          ))}
                          {report.charts?.map((chart) => (
                            <div key={chart.chart_id} className="ai-work-report-chart">
                              <strong>{chart.title}</strong><small>{chart.question}</small>
                              <p>{chart.data.length} puntos verificados · series: {chart.y_fields.join(', ')}</p>
                            </div>
                          ))}
                          {report.conceptual_diff?.length > 0 && <div className="ai-work-report-diff"><strong>Cambios v{report.version}</strong><ul>{report.conceptual_diff.map((item) => <li key={item}>{item}</li>)}</ul></div>}
                        </div>
                      )}
                      {canApprove && report.status === 'draft' && report.quality_gate?.passed && (
                        <div className="ai-work-item-actions">
                          <button type="button" disabled={pendingActionId === report.report_id} onClick={() => approveReport(report.report_id)}><ThumbsUp size={12} /> Aprobar</button>
                          <button type="button" disabled={pendingActionId === report.report_id} onClick={() => rejectReport(report.report_id)}><ThumbsDown size={12} /> Rechazar</button>
                        </div>
                      )}
                    </div>
                  )) : <p className="ai-perception-empty">Sin informes generados en esta sesión.</p>}
                </div>

                <div className="ai-work-block">
                  <span className="ai-copilot-block-title"><FileText size={11} /> Cambios de turno</span>
                  {runtime.handovers.length ? runtime.handovers.map((handover: ShiftHandoverDraft) => (
                    <div key={handover.handover_id} className="ai-work-item">
                      <div className="ai-work-item-header">
                        <span className="ai-work-item-title">{handover.title}</span>
                        <span className={`ai-copilot-badge is-${handover.status}`}>{WORK_PRODUCT_STATUS_LABELS[handover.status] ?? handover.status}</span>
                      </div>
                      <p className="ai-work-item-meta">{handover.generated_by} · {handover.generated_at}</p>
                      <p className="ai-work-item-meta">{handover.pending_for_next_shift.length} pendiente(s) para el próximo turno</p>
                      {canApprove && handover.status === 'draft' && (
                        <div className="ai-work-item-actions">
                          <button type="button" disabled={pendingActionId === handover.handover_id} onClick={() => approveHandover(handover.handover_id)}><ThumbsUp size={12} /> Aprobar</button>
                          <button type="button" disabled={pendingActionId === handover.handover_id} onClick={() => rejectHandover(handover.handover_id)}><ThumbsDown size={12} /> Rechazar</button>
                        </div>
                      )}
                    </div>
                  )) : <p className="ai-perception-empty">Sin cambios de turno generados en esta sesión.</p>}
                </div>

                <div className="ai-work-block">
                  <span className="ai-copilot-block-title"><CheckCircle2 size={11} /> Tareas</span>
                  {runtime.tasks.length ? runtime.tasks.map((task: TaskDraft) => (
                    <div key={task.task_id} className="ai-work-item">
                      <div className="ai-work-item-header">
                        <span className="ai-work-item-title">{task.title}</span>
                        <span className={`ai-copilot-badge is-${task.status}`}>{WORK_PRODUCT_STATUS_LABELS[task.status] ?? task.status}</span>
                      </div>
                      <p className="ai-work-item-meta">{task.reason}</p>
                      {canApprove && task.status === 'pending_approval' && (
                        <div className="ai-work-item-actions">
                          <button type="button" disabled={pendingActionId === task.task_id} onClick={() => approveTask(task.task_id)}><ThumbsUp size={12} /> Aprobar</button>
                          <button type="button" disabled={pendingActionId === task.task_id} onClick={() => rejectTask(task.task_id)}><ThumbsDown size={12} /> Rechazar</button>
                        </div>
                      )}
                    </div>
                  )) : <p className="ai-perception-empty">Sin tareas pendientes.</p>}
                </div>

                <div className="ai-work-block">
                  <span className="ai-copilot-block-title"><Watch size={11} /> Seguimientos</span>
                  {runtime.watches.length ? runtime.watches.map((watch) => (
                    <div key={watch.watch_id} className="ai-work-item">
                      <div className="ai-work-item-header">
                        <span className="ai-work-item-title">{watch.entity_label ?? watch.entity_ids.join(', ')}</span>
                        <span className={`ai-copilot-badge is-${watch.status}`}>{watch.status}</span>
                      </div>
                      <p className="ai-work-item-meta">{watch.metric} {watch.condition} {watch.threshold ?? '—'} · expira {watch.expires_at ?? 'sin vencimiento'}</p>
                      {watch.status === 'active' && (
                        <div className="ai-work-item-actions">
                          <button type="button" disabled={pendingActionId === watch.watch_id} onClick={() => cancelWatch(watch.watch_id)}><X size={12} /> Cancelar</button>
                        </div>
                      )}
                    </div>
                  )) : <p className="ai-perception-empty">Sin seguimientos activos.</p>}
                </div>
              </div>
            )}
          </div>

          {runtime.proactiveEvents[0] && (
            <div className="ai-proactive-banner">
              <Bell size={13} />
              <span>{runtime.proactiveEvents[0].summary}</span>
            </div>
          )}

          <div className="ai-rt-transcript-toggle">
            <button type="button" onClick={() => setTranscriptOpen((v) => !v)}>
              {transcriptOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Transcripción ({runtime.transcript.length})
            </button>
          </div>
          {transcriptOpen && (
            <ul className="ai-rt-transcript-list">
              {runtime.transcript.map((entry) => (
                <li key={entry.id} className={`is-${entry.role}`}>{entry.text}</li>
              ))}
            </ul>
          )}

          <AgentActionOverlay actions={runtime.uiActionResults} />
        </div>

        <div className="ai-rt-controls">
          {isSpeaking && (
            <button type="button" className="ai-agent-interrupt-button" onClick={bargeIn}>
              <Square size={12} /> Interrumpir
            </button>
          )}
          {isBusy && !isPaused && (
            <button type="button" className="ai-inv-secondary" onClick={() => agentSessionClient.send('agent.pause', {})}>
              <Pause size={13} /> Pausar
            </button>
          )}
          {isPaused && (
            <button type="button" className="ai-inv-secondary" onClick={() => agentSessionClient.send('agent.resume', {})}>
              <Play size={13} /> Continuar
            </button>
          )}
          {(isBusy || isPaused) && (
            <button type="button" className="ai-inv-secondary" onClick={() => agentSessionClient.send('agent.cancel', {})}>
              <X size={13} /> Cancelar
            </button>
          )}
        </div>

        <AgentLiveTranscript listening={listening} interimText={currentTurn?.partialText ?? ''} audioLevel={micLevel} />

        <form
          className="ai-copilot-composer"
          onSubmit={(e) => {
            e.preventDefault()
            sendCommand(inputText, false)
          }}
        >
          {micError && <p className="ai-agent-mic-error">{micError}</p>}
          <div className="ai-copilot-composer-input">
            <button
              type="button"
              className={`ai-agent-mic-button${listening ? ' is-listening' : ''}${micState === 'requesting' ? ' is-requesting' : ''}`}
              onClick={toggleMic}
              aria-label={listening ? 'Detener escucha' : micState === 'requesting' ? 'Solicitando permiso de micrófono' : 'Hablar'}
              title={
                listening ? 'Micrófono activo'
                : micState === 'requesting' ? 'Solicitando permiso…'
                : micState === 'blocked' ? 'Micrófono bloqueado'
                : micState === 'no_device' ? 'Sin dispositivo de micrófono'
                : 'Micrófono desactivado'
              }
            >
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Investiga, pausa, cancela, o pide un resumen…"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendCommand(inputText, false)
                }
              }}
            />
            <button type="button" className="ai-agent-mute-button" onClick={toggleMute} aria-label={muted ? 'Activar voz' : 'Silenciar voz'}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button type="submit" disabled={!inputText.trim()} aria-label="Enviar">
              <Send size={16} />
            </button>
          </div>
        </form>

        <footer className="ai-copilot-disclaimer">
          NORTHMINE AI entrega analisis y recomendaciones basadas en los datos disponibles.
          La validacion y decision operacional final corresponde al usuario autorizado.
        </footer>
      </aside>

      {micOnboardingOpen && (
        <MicOnboardingModal
          requesting={micState === 'requesting'}
          onActivate={() => void requestMicAndActivate()}
          onDismiss={dismissMicOnboarding}
        />
      )}
    </div>
  )
}
