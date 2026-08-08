import { useEffect, useState } from 'react'
import { AlertTriangle, Bell, BellOff, Eye, Loader2, Mic, Pause, Search, Sparkles, Volume2, Watch, X } from 'lucide-react'
import { useAppStore } from '../../store'
import { AgentWorkspace } from './AgentWorkspace'
import { buildAgentApplicationContext } from '../../lib/agentRegistry/context'
import { NORTHMINE_MODULES } from '../../lib/agentRegistry/modules'
import { agentEquipmentCatalog } from '../../lib/agentRegistry/equipmentCatalog'
import { agentSessionClient } from '../../lib/agentRuntime/AgentSessionClient'
import { initRuntimeController } from '../../lib/agentRuntime/runtimeController'
import { useAgentRuntimeStore } from '../../lib/agentRuntime/runtimeStore'
import { conversationTurnManager } from '../../lib/agentRealtime/ConversationTurnManager'
import { initPerceptionManager } from '../../lib/agentPerception/perceptionManager'
import { usePerceptionStore } from '../../lib/agentPerception/perceptionStore'
import { workProductsApi } from '../../lib/agentWorkProducts'
import type { CopilotContext } from '../../lib/aiCopilot'
import '../../styles/ai-copilot.css'
import '../../lib/agentRegistry/devBridge'

const APPROVAL_ROLES = new Set(['admin', 'supervisor', 'operador'])
const CHAT_ROLES = new Set(['admin', 'supervisor', 'operador', 'viewer'])

function shiftForAgent(shift: string | null): string | null {
  if (!shift) return null
  return shift === 'AMBOS' ? 'TODOS' : shift
}

function buildCopilotContext(mine: string): CopilotContext {
  const agentContext = buildAgentApplicationContext()
  const module = agentContext.moduleId ? NORTHMINE_MODULES[agentContext.moduleId] : null
  return {
    section: agentContext.moduleId,
    active_section: agentContext.moduleId,
    route: agentContext.route,
    mine,
    shift: shiftForAgent(agentContext.shift),
    selected_date: agentContext.dateRange?.to ?? null,
    filters: {},
    selected_equipment_ids: agentContext.selectedEntities.map((entity) => entity.id),
    focused_widget: agentContext.focusedWidgetId,
    visible_kpis: agentContext.visibleKpis.map(
      (kpi) => `${kpi.label}: ${kpi.value}${kpi.unit ? ` ${kpi.unit}` : ''}${kpi.status ? ` (${kpi.status})` : ''}`,
    ),
    visible_alerts: [],
    permissions: module ? [`${module.id}:${module.agentAccess}`] : [],
  }
}

const STATE_ICON: Record<string, typeof Sparkles> = {
  listening: Mic, planning: Loader2, executing: Loader2, verifying: Loader2,
  speaking: Volume2, paused: Pause, failed: AlertTriangle,
}

/**
 * Presencia residente del NORTHMINE Operational Intelligence Agent (Etapa
 * 4): posee la UNICA conexion WebSocket del Agent Runtime para esta
 * pestaña (AgentSessionClient) y la mantiene viva independiente de si
 * AgentWorkspace esta abierto - "el agente debe poder trabajar aunque el
 * workspace este cerrado". El orbe refleja el estado REAL de la maquina de
 * estados del servidor (nunca flags locales sueltos).
 */
export function AgentPresence() {
  const usuario = useAppStore((state) => state.usuario)
  useAppStore((state) => state.activeSection)
  useAppStore((state) => state.filtro)
  const [open, setOpen] = useState(false)
  const [dismissedEventIds, setDismissedEventIds] = useState<string[]>([])
  const runtimeState = useAgentRuntimeStore((s) => s.state)
  const connectionStatus = useAgentRuntimeStore((s) => s.connectionStatus)
  const proactiveEvents = useAgentRuntimeStore((s) => s.proactiveEvents)

  useEffect(() => {
    if (usuario) void agentEquipmentCatalog.load()
  }, [usuario])

  const isCapturing = usePerceptionStore((s) => s.isCapturing)
  const isAnalyzing = usePerceptionStore((s) => s.isAnalyzing)

  // Etapa 7, seccion 25: "user_speaking" es un estado LOCAL (el servidor
  // todavia no sabe que el usuario esta hablando hasta que llega el
  // transcript final) - toma precedencia visual sobre el estado del
  // servidor mientras dura, sin reemplazarlo como fuente de verdad para
  // nada mas.
  const [userSpeaking, setUserSpeaking] = useState(false)
  useEffect(() => {
    return conversationTurnManager.onTurn((turn) => {
      setUserSpeaking(turn.status === 'listening' || turn.status === 'transcribing')
    })
  }, [])

  useEffect(() => {
    if (!usuario?.token) {
      agentSessionClient.disconnect()
      return
    }
    initRuntimeController()
    initPerceptionManager()
    agentSessionClient.connect(usuario.token)
  }, [usuario?.token])

  if (!usuario || !CHAT_ROLES.has(usuario.rol)) return null

  const context = buildCopilotContext(usuario.faena)
  const Icon = userSpeaking ? Mic : STATE_ICON[runtimeState] ?? Sparkles
  const isActive = userSpeaking || ['listening', 'planning', 'executing', 'verifying', 'speaking'].includes(runtimeState)
  const isDegraded = connectionStatus === 'disconnected' || connectionStatus === 'reconnecting'
  // Seccion 36 del brief: indicador discreto y SEPARADO del estado
  // conversacional - la percepcion visual (Nivel 3) puede ocurrir con el
  // Runtime en 'idle', y nunca debe reescribir el texto/estado del orbe.
  const perceptionLabel = isAnalyzing ? 'Analizando vista' : isCapturing ? 'Observando' : null
  const presenceLabel = userSpeaking ? 'Escuchando' : runtimeState

  // Etapa 6, seccion 14: pulso discreto + mensaje corto - NUNCA abre el
  // workspace automaticamente, solo pulsa el orbe y muestra una tarjeta
  // pequeña con acciones. Solo el evento 'new' mas reciente que el usuario
  // no descarto ya.
  const activeProactiveEvent = proactiveEvents.find((ev) => ev.status === 'new' && !dismissedEventIds.includes(ev.proactive_event_id)) ?? null

  function dismissProactive(id: string) {
    setDismissedEventIds((ids) => [...ids, id])
  }

  function investigateProactive() {
    if (!activeProactiveEvent) return
    agentSessionClient.send('user.text', { text: `¿Sigue ocurriendo lo de ${activeProactiveEvent.title}?` })
    dismissProactive(activeProactiveEvent.proactive_event_id)
    setOpen(true)
  }

  function viewEvidenceProactive() {
    if (!activeProactiveEvent) return
    dismissProactive(activeProactiveEvent.proactive_event_id)
    setOpen(true)
  }

  function ignoreProactive() {
    if (!activeProactiveEvent) return
    void workProductsApi.dismissProactiveEvent(activeProactiveEvent.proactive_event_id).catch(() => {})
    dismissProactive(activeProactiveEvent.proactive_event_id)
  }

  function silenceProactive() {
    if (!activeProactiveEvent) return
    agentSessionClient.send('user.text', { text: 'silencio una hora' })
    dismissProactive(activeProactiveEvent.proactive_event_id)
  }

  function createWatchProactive() {
    if (!activeProactiveEvent) return
    agentSessionClient.send('user.text', { text: 'avísame si vuelve a empeorar' })
    dismissProactive(activeProactiveEvent.proactive_event_id)
  }

  return (
    <>
      <button
        type="button"
        className={`ai-agent-orb${open ? ' is-open' : ''}${isActive ? ' is-active' : ''}${isDegraded ? ' is-degraded' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label="NORTHMINE AI — Operational Intelligence Agent"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={perceptionLabel ? `NORTHMINE AI — ${perceptionLabel}` : `NORTHMINE AI — ${presenceLabel}`}
      >
        <span className="ai-agent-orb-ring" aria-hidden="true" />
        <Icon size={18} className={!userSpeaking && (runtimeState === 'planning' || runtimeState === 'executing' || runtimeState === 'verifying') ? 'ai-copilot-spin' : ''} />
        {perceptionLabel && (
          <span className="ai-agent-orb-perception-badge" aria-label={perceptionLabel} title={perceptionLabel}>
            <Eye size={11} />
          </span>
        )}
        {activeProactiveEvent && !open && (
          <span className={`ai-agent-orb-proactive-badge is-${activeProactiveEvent.severity}`} aria-label="Aviso del agente" title={activeProactiveEvent.title}>
            <Bell size={11} />
          </span>
        )}
      </button>

      {activeProactiveEvent && !open && (
        <div className="ai-proactive-card" role="status">
          <div className="ai-proactive-card-header">
            <Bell size={14} />
            <span>{activeProactiveEvent.summary}</span>
          </div>
          <div className="ai-proactive-card-actions">
            <button type="button" onClick={investigateProactive}><Search size={12} /> Investigar</button>
            <button type="button" onClick={viewEvidenceProactive}><Eye size={12} /> Ver evidencia</button>
            <button type="button" onClick={createWatchProactive}><Watch size={12} /> Crear seguimiento</button>
            <button type="button" onClick={silenceProactive}><BellOff size={12} /> Silenciar</button>
            <button type="button" className="ai-proactive-card-dismiss" onClick={ignoreProactive} aria-label="Ignorar"><X size={12} /></button>
          </div>
        </div>
      )}

      <AgentWorkspace
        open={open}
        onClose={() => setOpen(false)}
        context={context}
        role={usuario.rol}
        canApprove={APPROVAL_ROLES.has(usuario.rol)}
      />
    </>
  )
}
