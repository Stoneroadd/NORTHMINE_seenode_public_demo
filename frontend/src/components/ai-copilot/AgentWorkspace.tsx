import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, RotateCcw, X } from 'lucide-react'
import { copilotApi, streamCopilotChat } from '../../lib/aiCopilot'
import type { CopilotContext, CopilotHistoryItem, CopilotResponse, CopilotStatus, CopilotStreamEvent } from '../../lib/aiCopilot'
import { AIContextBar } from './AIContextBar'
import { AIConversation } from './AIConversation'
import { AIComposer } from './AIComposer'
import { AgentLiveTranscript } from './AgentLiveTranscript'
import { AgentVoiceControls } from './AgentVoiceControls'
import { AgentActionOverlay } from './AgentActionOverlay'
import { useVoiceSession } from './useVoiceSession'
import { cancelAgentGuidance, enqueueAgentAction, guideAgentTool } from './agentActionExecutor'
import type { AgentActionResult } from '../../lib/agentRegistry/types'
import type { ChatTurn } from './types'

interface Props {
  open: boolean
  onClose: () => void
  context: CopilotContext
  role: string
  canApprove: boolean
}

function newId(): string {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const MAX_SPOKEN_RESPONSE_CHARS = 240

function conciseSpeech(text: string): string {
  const normalized = text
    .replace(/\s+/g, ' ')
    .replace(/[*_`#]/g, '')
    .trim()
  if (normalized.length <= MAX_SPOKEN_RESPONSE_CHARS) return normalized

  const sentences = normalized.match(/[^.!?]+[.!?]+/g) ?? []
  let spoken = ''
  for (const sentence of sentences) {
    const candidate = `${spoken} ${sentence.trim()}`.trim()
    if (candidate.length > MAX_SPOKEN_RESPONSE_CHARS) break
    spoken = candidate
  }
  if (spoken) return spoken

  const clipped = normalized.slice(0, MAX_SPOKEN_RESPONSE_CHARS - 1)
  const lastSpace = clipped.lastIndexOf(' ')
  return `${clipped.slice(0, Math.max(lastSpace, 1)).trim()}…`
}

function spokenResponse(response: CopilotResponse): string {
  if (response.report_drafts.length > 0) {
    return 'El informe completo está listo. Incluye tablas operacionales y puede descargarlo desde la tarjeta en pantalla.'
  }
  const message = response.message.trim()
  const messageIsGeneric = /^revis[eé] los datos disponibles/i.test(message)
  const priority = response.recommendations.find((item) => /alerta|riesgo|critic/i.test(item))
    ?? response.recommendations[0]
  const productionFact = response.facts.find((item) => /vs meta/i.test(item))
  const complianceMatch = productionFact?.match(/\(([\d.,]+)%\)/)
  const compliance = complianceMatch ? Number(complianceMatch[1].replace(',', '.')) : null
  const position = compliance === null || Number.isNaN(compliance)
    ? ''
    : compliance >= 100 ? 'El turno está sobre la meta.' : 'El turno está bajo la meta.'
  const priorityCopy = priority
    ? priority.replace(/^Priorizar\s+/i, 'La prioridad es ').replace(/^Evaluar\s+/i, 'Conviene evaluar ')
    : ''
  const operationalAnswer = [position, priorityCopy, 'Los valores exactos están resaltados en pantalla.']
    .filter(Boolean)
    .join(' ')
  const selected = messageIsGeneric ? operationalAnswer : message
  return conciseSpeech(selected || 'Respuesta lista en pantalla.')
}

/**
 * Panel principal del NORTHMINE Operational Intelligence Agent: conversacion
 * (texto + voz), estado en vivo (escuchando/analizando/hablando/actuando),
 * plan/evidencia/herramientas de cada respuesta, y ejecucion de acciones
 * semanticas de UI. Se abre desde AgentPresence (el orbe); no es la unica
 * forma de interaccion (la voz funciona en el mismo panel via microfono),
 * pero el chat de texto sigue siempre disponible como respaldo.
 */
export function AgentWorkspace({ open, onClose, context, role, canApprove }: Props) {
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<CopilotStatus | null>(null)
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true)
  const [executedActions, setExecutedActions] = useState<AgentActionResult[]>([])
  const [guidanceText, setGuidanceText] = useState<string | null>(null)
  const conversationIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const guidanceCompletionTimerRef = useRef<number | null>(null)
  const contextRef = useRef(context)
  contextRef.current = context
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const voiceRef = useRef<ReturnType<typeof useVoiceSession> | null>(null)
  const voiceOutputEnabledRef = useRef(voiceOutputEnabled)
  const openRef = useRef(open)
  voiceOutputEnabledRef.current = voiceOutputEnabled
  openRef.current = open

  useEffect(() => {
    if (!open) return
    let cancelled = false
    copilotApi
      .status()
      .then((result) => {
        if (!cancelled) setStatus(result)
      })
      .catch(() => {
        if (!cancelled) setStatus(null)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? [],
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
      previousFocus?.focus()
    }
  }, [open, onClose])

  const updateTurn = (id: string, updater: (turn: ChatTurn) => ChatTurn) => {
    setTurns((current) => current.map((turn) => (turn.id === id ? updater(turn) : turn)))
  }

  const handleSend = async (message: string) => {
    if (sending) return
    const history = turns.slice(-10).reduce<CopilotHistoryItem[]>((items, turn) => {
      if (turn.role === 'user') items.push({ role: 'user', content: turn.text })
      else if (turn.status === 'done') items.push({ role: 'assistant', content: turn.response.message })
      return items
    }, [])
    setSending(true)
    const userTurn: ChatTurn = { id: newId(), role: 'user', text: message }
    const assistantId = newId()
    const assistantTurn: ChatTurn = { id: assistantId, role: 'assistant', status: 'streaming', phase: 'analyzing_intent', toolExecutions: [], text: '' }
    setTurns((current) => [...current, userTurn, assistantTurn])
    setExecutedActions([])

    const controller = new AbortController()
    abortRef.current = controller
    const responseTimer = window.setTimeout(() => controller.abort(), 15_000)

    try {
      await streamCopilotChat(
        { conversation_id: conversationIdRef.current, message, context: contextRef.current, history },
        {
          signal: controller.signal,
          onEvent: (event: CopilotStreamEvent) => {
            if (event.type === 'status') {
              updateTurn(assistantId, (turn) => (turn.role === 'assistant' && turn.status === 'streaming' ? { ...turn, phase: event.phase } : turn))
            } else if (event.type === 'tool_execution') {
              const guidanceCopy = guideAgentTool(event.name, event.summary)
              if (guidanceCopy) setGuidanceText(guidanceCopy)
              updateTurn(assistantId, (turn) =>
                turn.role === 'assistant' && turn.status === 'streaming'
                  ? { ...turn, toolExecutions: [...turn.toolExecutions, { name: event.name, args: {}, status: event.status as 'ok' | 'error' | 'denied', duration_ms: event.duration_ms, summary: event.summary }] }
                  : turn,
              )
            } else if (event.type === 'agent.action.proposed') {
              enqueueAgentAction(event.action, (result) => {
                setExecutedActions((list) => [...list, result].slice(-4))
              })
            } else if (event.type === 'token') {
              updateTurn(assistantId, (turn) => (turn.role === 'assistant' && turn.status === 'streaming' ? { ...turn, text: turn.text + event.text } : turn))
            } else if (event.type === 'final') {
              conversationIdRef.current = event.response.conversation_id
              if (guidanceCompletionTimerRef.current) window.clearTimeout(guidanceCompletionTimerRef.current)
              guidanceCompletionTimerRef.current = window.setTimeout(
                () => setGuidanceText('Lectura completa. Evidencia y recomendación disponibles.'),
                5_400,
              )
              updateTurn(assistantId, () => ({ id: assistantId, role: 'assistant', status: 'done', response: event.response }))
              if (voiceOutputEnabledRef.current) {
                voice.speak(spokenResponse(event.response), () => {
                  if (openRef.current) void voiceRef.current?.startListening()
                })
              } else if (openRef.current) {
                void voiceRef.current?.startListening()
              }
            }
          },
        },
      )
    } catch (error) {
      const errorMessage = error instanceof DOMException && error.name === 'AbortError'
        ? 'JARVIS agotó el tiempo de respuesta. Pulse Reintentar o formule la solicitud nuevamente.'
        : error instanceof Error ? error.message : 'No se pudo obtener respuesta del agente.'
      updateTurn(assistantId, () => ({
        id: assistantId,
        role: 'assistant',
        status: 'error',
        error: errorMessage,
      }))
      if (openRef.current && voiceOutputEnabledRef.current) {
        voice.speak('No pude responder en este momento. Inténtalo nuevamente.', () => {
          if (openRef.current) void voiceRef.current?.startListening()
        })
      } else if (openRef.current) {
        void voiceRef.current?.startListening()
      }
    } finally {
      window.clearTimeout(responseTimer)
      setSending(false)
    }
  }

  const handleTextSend = (message: string) => {
    void handleSend(message)
  }

  const handleVoiceFinal = (message: string) => {
    void handleSend(message)
  }

  const voice = useVoiceSession(handleVoiceFinal)
  voiceRef.current = voice

  useEffect(() => {
    if (!open) return
    const greeting = 'Modo agente activado.'
    const timer = window.setTimeout(() => {
      const currentVoice = voiceRef.current
      if (!currentVoice) return
      if (voiceOutputEnabledRef.current) {
        currentVoice.speak(greeting, () => void voiceRef.current?.startListening())
      } else {
        void currentVoice.startListening()
      }
    }, 120)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort()
      if (guidanceCompletionTimerRef.current) window.clearTimeout(guidanceCompletionTimerRef.current)
      cancelAgentGuidance()
      setGuidanceText(null)
      voice.cancelListening()
      voice.stopSpeaking()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.code === 'Space') {
        event.preventDefault()
        if (voice.listening) voice.stopListening()
        else voice.startListening()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, voice])

  if (!open) return null

  const degraded = status ? !status.available : false
  const localMode = status?.provider === 'local_operational'
  const agentPhase = voice.listening ? 'listening' : voice.speaking ? 'speaking' : sending ? 'analyzing' : 'idle'
  const phaseLabel = agentPhase === 'listening' ? 'ESCUCHANDO' : agentPhase === 'speaking' ? 'RESPONDIENDO' : agentPhase === 'analyzing' ? 'ANALIZANDO' : 'LISTO'

  return (
    <div className="ai-copilot-overlay" role="dialog" aria-modal="true" aria-labelledby="jarvis-title">
      <div className="ai-copilot-backdrop" onClick={onClose} />
      <aside ref={panelRef} className={`ai-copilot-panel is-${agentPhase}`}>
        <header className="ai-copilot-header">
          <div className="ai-copilot-header-identity">
            <span className="ai-copilot-header-index" aria-hidden="true">NM / J-01</span>
            <div>
              <h2 id="jarvis-title">JARVIS</h2>
              <span className="ai-copilot-subtitle">Interfaz de comando operacional</span>
            </div>
          </div>
          <div className="ai-copilot-header-state" role="status">
            <span aria-hidden="true" />
            {phaseLabel}
          </div>
          <button ref={closeButtonRef} type="button" className="ai-copilot-close" onClick={onClose} aria-label="Cerrar JARVIS">
            <X size={18} />
          </button>
        </header>

        <AIContextBar section={context.section} mine={context.mine} shift={context.shift} selectedDate={context.selected_date} role={role} />

        {degraded && (
          <div className="ai-copilot-degraded-banner">
            <AlertTriangle size={14} />
            <span>{status?.message ?? 'El agente no esta disponible temporalmente.'}</span>
            <button type="button" onClick={() => window.location.reload()}><RotateCcw size={13} /> Reintentar</button>
          </div>
        )}

        {!degraded && status && (
          <div className="ai-copilot-engine-status" role="status">
            <CheckCircle2 size={13} />
            <span>{localMode ? 'Motor local · datos demo · sin claves externas' : `Motor conectado · ${status.model ?? status.provider}`}</span>
          </div>
        )}

        <AgentLiveTranscript phase={agentPhase} interimText={voice.interimTranscript} audioLevel={voice.audioLevel} focusText={guidanceText} />
        {voice.micError && (
          <div id="jarvis-mic-feedback" className="ai-agent-mic-error" role="alert">
            <AlertTriangle size={15} aria-hidden="true" />
            <span>{voice.micError}</span>
            <button type="button" disabled={voice.requestingPermission} onClick={() => void voice.startListening()}>
              {voice.requestingPermission ? 'Solicitando…' : 'Reintentar'}
            </button>
          </div>
        )}

        <div className="ai-copilot-body">
          <AIConversation turns={turns} canApprove={canApprove} context={context} />
        </div>

        <AgentActionOverlay actions={executedActions} />

        <AgentVoiceControls
          supported={voice.supported}
          listening={voice.listening}
          speaking={voice.speaking}
          requestingPermission={voice.requestingPermission}
          permissionState={voice.permissionState}
          voiceOutputEnabled={voiceOutputEnabled}
          onToggleListening={() => (voice.listening ? voice.stopListening() : void voice.startListening())}
          onStopSpeaking={voice.stopSpeaking}
          onToggleVoiceOutput={() => setVoiceOutputEnabled((value) => !value)}
        />

        <AIComposer disabled={sending || degraded} onSend={handleTextSend} />

        <footer className="ai-copilot-disclaimer">
          NORTHMINE AI entrega analisis y recomendaciones basadas en los datos disponibles.
          La validacion y decision operacional final corresponde al usuario autorizado.
        </footer>
      </aside>
    </div>
  )
}
