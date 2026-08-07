import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, Camera, Check, ChevronDown, ChevronUp, Eye, ExternalLink, Loader2, Mic, MicOff,
  Pause, Play, RefreshCw, Send, ShieldAlert, Square, Volume2, VolumeX, X,
} from 'lucide-react'
import { agentSessionClient } from '../../lib/agentRuntime/AgentSessionClient'
import { useAgentRuntimeStore } from '../../lib/agentRuntime/runtimeStore'
import { BrowserSpeechInput } from '../../lib/agentVoice/BrowserSpeechInput'
import { speechOutputRouter } from '../../lib/agentVoice/SpeechOutputRouter'
import type { VoiceOutputProviderName } from '../../lib/agentVoice/types'
import type { CopilotContext } from '../../lib/aiCopilot'
import { AgentActionOverlay } from './AgentActionOverlay'
import { usePerceptionStore } from '../../lib/agentPerception/perceptionStore'
import { performCaptureAndAnalyze } from '../../lib/agentPerception/perceptionManager'
import { buildSemanticPerceptionSnapshot } from '../../lib/agentPerception/semanticPerception'
import { agentWidgetRegistry } from '../../lib/agentRegistry/registry'
import type { SemanticPerceptionSnapshot } from '../../lib/agentPerception/types'

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

const QUICK_COMMANDS = [
  'Investiga por qué bajó producción',
  'Revisa el tiempo de ciclo',
  'Dame el resumen del turno',
]

const STEP_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', running: 'En curso', completed: 'Completado', failed: 'Fallido',
  skipped: 'Omitido', cancelled: 'Cancelado', rejected: 'Rechazado',
}

const CONFIDENCE_LABELS: Record<string, string> = { high: 'alta', medium: 'media', low: 'baja' }

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
export function AgentWorkspace({ open, onClose, context, role: _role, canApprove: _canApprove }: Props) {
  const runtime = useAgentRuntimeStore()
  const [inputText, setInputText] = useState('')
  const [muted, setMuted] = useState(false)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const [voiceProvider, setVoiceProvider] = useState<VoiceOutputProviderName | null>(null)
  const speechInputRef = useRef<BrowserSpeechInput | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  const [perceptionSnapshot, setPerceptionSnapshot] = useState<SemanticPerceptionSnapshot | null>(null)
  const [showCapture, setShowCapture] = useState(false)
  const [showPerceptionEvidence, setShowPerceptionEvidence] = useState(false)
  const perception = usePerceptionStore()

  useEffect(() => {
    speechInputRef.current = new BrowserSpeechInput()
    speechOutputRouter.onProviderChanged(setVoiceProvider)
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

  function sendCommand(text: string, viaVoice: boolean) {
    const trimmed = text.trim()
    if (!trimmed) return
    useAgentRuntimeStore.getState().addUserTranscript(trimmed)
    agentSessionClient.send(viaVoice ? 'user.speech.final' : 'user.text', { text: trimmed })
    setInputText('')
  }

  function toggleMic() {
    const input = speechInputRef.current
    if (!input?.isSupported()) {
      setMicError('Reconocimiento de voz no disponible en este navegador.')
      return
    }
    if (listening) {
      void input.stop()
      setListening(false)
      return
    }
    setMicError(null)
    input.onFinal((text) => {
      setListening(false)
      sendCommand(text, true)
    })
    void input.start()
    setListening(true)
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
            {runtime.connectionStatus === 'connected' ? 'Conectado' : runtime.connectionStatus === 'reconnecting' ? 'Reconectando…' : runtime.connectionStatus === 'connecting' ? 'Conectando…' : 'Desconectado'}
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
                {QUICK_COMMANDS.map((cmd) => (
                  <button key={cmd} type="button" onClick={() => sendCommand(cmd, false)}>{cmd}</button>
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

        <form
          className="ai-copilot-composer"
          onSubmit={(e) => {
            e.preventDefault()
            sendCommand(inputText, false)
          }}
        >
          {micError && <p className="ai-agent-mic-error">{micError}</p>}
          <div className="ai-copilot-composer-input">
            <button type="button" className={`ai-agent-mic-button${listening ? ' is-listening' : ''}`} onClick={toggleMic} aria-label={listening ? 'Detener escucha' : 'Hablar'}>
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
    </div>
  )
}
