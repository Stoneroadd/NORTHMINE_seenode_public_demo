import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Mic, Pause, Sparkles, Volume2 } from 'lucide-react'
import { useAppStore } from '../../store'
import { AgentWorkspace } from './AgentWorkspace'
import { buildAgentApplicationContext } from '../../lib/agentRegistry/context'
import { NORTHMINE_MODULES } from '../../lib/agentRegistry/modules'
import { agentEquipmentCatalog } from '../../lib/agentRegistry/equipmentCatalog'
import { agentSessionClient } from '../../lib/agentRuntime/AgentSessionClient'
import { initRuntimeController } from '../../lib/agentRuntime/runtimeController'
import { useAgentRuntimeStore } from '../../lib/agentRuntime/runtimeStore'
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
  const runtimeState = useAgentRuntimeStore((s) => s.state)
  const connectionStatus = useAgentRuntimeStore((s) => s.connectionStatus)

  useEffect(() => {
    if (usuario) void agentEquipmentCatalog.load()
  }, [usuario])

  useEffect(() => {
    if (!usuario?.token) {
      agentSessionClient.disconnect()
      return
    }
    initRuntimeController()
    agentSessionClient.connect(usuario.token)
  }, [usuario?.token])

  if (!usuario || !CHAT_ROLES.has(usuario.rol)) return null

  const context = buildCopilotContext(usuario.faena)
  const Icon = STATE_ICON[runtimeState] ?? Sparkles
  const isActive = ['listening', 'planning', 'executing', 'verifying', 'speaking'].includes(runtimeState)
  const isDegraded = connectionStatus === 'disconnected' || connectionStatus === 'reconnecting'

  return (
    <>
      <button
        type="button"
        className={`ai-agent-orb${open ? ' is-open' : ''}${isActive ? ' is-active' : ''}${isDegraded ? ' is-degraded' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label="NORTHMINE AI — Operational Intelligence Agent"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={`NORTHMINE AI — ${runtimeState}`}
      >
        <span className="ai-agent-orb-ring" aria-hidden="true" />
        <Icon size={18} className={runtimeState === 'planning' || runtimeState === 'executing' || runtimeState === 'verifying' ? 'ai-copilot-spin' : ''} />
      </button>
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
