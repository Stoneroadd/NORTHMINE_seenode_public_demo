import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { copilotApi, streamCopilotChat } from '../../lib/aiCopilot'
import type { CopilotContext, CopilotStatus, CopilotStreamEvent } from '../../lib/aiCopilot'
import { AIContextBar } from './AIContextBar'
import { AIConversation } from './AIConversation'
import { AIComposer } from './AIComposer'
import { AgentLiveTranscript } from './AgentLiveTranscript'
import { AgentVoiceControls } from './AgentVoiceControls'
import { AgentActionOverlay } from './AgentActionOverlay'
import { useVoiceSession } from './useVoiceSession'
import { applyAgentAction, type ExecutedAction } from './agentActionExecutor'
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
  const [executedActions, setExecutedActions] = useState<ExecutedAction[]>([])
  const conversationIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const contextRef = useRef(context)
  contextRef.current = context
  const viaVoiceRef = useRef(false)

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

  const updateTurn = (id: string, updater: (turn: ChatTurn) => ChatTurn) => {
    setTurns((current) => current.map((turn) => (turn.id === id ? updater(turn) : turn)))
  }

  const handleSend = async (message: string) => {
    if (sending) return
    setSending(true)
    const userTurn: ChatTurn = { id: newId(), role: 'user', text: message }
    const assistantId = newId()
    const assistantTurn: ChatTurn = { id: assistantId, role: 'assistant', status: 'streaming', phase: 'analyzing_intent', toolExecutions: [], text: '' }
    setTurns((current) => [...current, userTurn, assistantTurn])
    setExecutedActions([])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamCopilotChat(
        { conversation_id: conversationIdRef.current, message, context: contextRef.current },
        {
          signal: controller.signal,
          onEvent: (event: CopilotStreamEvent) => {
            if (event.type === 'status') {
              updateTurn(assistantId, (turn) => (turn.role === 'assistant' && turn.status === 'streaming' ? { ...turn, phase: event.phase } : turn))
            } else if (event.type === 'tool_execution') {
              updateTurn(assistantId, (turn) =>
                turn.role === 'assistant' && turn.status === 'streaming'
                  ? { ...turn, toolExecutions: [...turn.toolExecutions, { name: event.name, args: {}, status: event.status as 'ok' | 'error' | 'denied', duration_ms: event.duration_ms, summary: event.summary }] }
                  : turn,
              )
            } else if (event.type === 'agent.action.proposed') {
              const executed = applyAgentAction(event.action)
              setExecutedActions((list) => [...list, executed].slice(-4))
            } else if (event.type === 'token') {
              updateTurn(assistantId, (turn) => (turn.role === 'assistant' && turn.status === 'streaming' ? { ...turn, text: turn.text + event.text } : turn))
            } else if (event.type === 'final') {
              conversationIdRef.current = event.response.conversation_id
              updateTurn(assistantId, () => ({ id: assistantId, role: 'assistant', status: 'done', response: event.response }))
              if (viaVoiceRef.current && voiceOutputEnabled && !event.response.degraded) {
                voice.speak(event.response.message)
              }
            }
          },
        },
      )
    } catch (error) {
      updateTurn(assistantId, () => ({
        id: assistantId,
        role: 'assistant',
        status: 'error',
        error: error instanceof Error ? error.message : 'No se pudo obtener respuesta del agente.',
      }))
    } finally {
      setSending(false)
      viaVoiceRef.current = false
    }
  }

  const handleTextSend = (message: string) => {
    viaVoiceRef.current = false
    void handleSend(message)
  }

  const handleVoiceFinal = (message: string) => {
    viaVoiceRef.current = true
    void handleSend(message)
  }

  const voice = useVoiceSession(handleVoiceFinal)

  useEffect(() => {
    if (!open) {
      voice.stopListening()
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
  const agentPhase = voice.listening ? 'listening' : voice.speaking ? 'speaking' : sending ? 'analyzing' : 'idle'

  return (
    <div className="ai-copilot-overlay" role="dialog" aria-modal="true" aria-label="NORTHMINE AI — Operational Intelligence Agent">
      <div className="ai-copilot-backdrop" onClick={onClose} />
      <aside className={`ai-copilot-panel is-${agentPhase}`}>
        <header className="ai-copilot-header">
          <div>
            <span className="ai-copilot-eyebrow">NORTHMINE Operational Intelligence Agent</span>
            <h2>NORTHMINE AI</h2>
          </div>
          <button type="button" className="ai-copilot-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <AIContextBar section={context.section} mine={context.mine} shift={context.shift} selectedDate={context.selected_date} role={role} />

        {degraded && (
          <div className="ai-copilot-degraded-banner">
            <AlertTriangle size={14} />
            <span>{status?.message ?? 'El agente no esta disponible temporalmente.'}</span>
          </div>
        )}

        <AgentLiveTranscript listening={voice.listening} interimText={voice.interimTranscript} audioLevel={voice.audioLevel} />
        {voice.micError && <p className="ai-agent-mic-error">Microfono: {voice.micError}</p>}

        <div className="ai-copilot-body">
          <AIConversation turns={turns} canApprove={canApprove} />
        </div>

        <AgentActionOverlay actions={executedActions} />

        <AgentVoiceControls
          supported={voice.supported}
          listening={voice.listening}
          speaking={voice.speaking}
          voiceOutputEnabled={voiceOutputEnabled}
          onToggleListening={() => (voice.listening ? voice.stopListening() : voice.startListening())}
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
