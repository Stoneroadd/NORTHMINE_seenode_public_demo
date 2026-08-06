import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useAppStore } from '../../store'
import { AgentWorkspace } from './AgentWorkspace'
import { buildAgentApplicationContext } from '../../lib/agentRegistry/context'
import { NORTHMINE_MODULES } from '../../lib/agentRegistry/modules'
import type { CopilotContext } from '../../lib/aiCopilot'
import '../../styles/ai-copilot.css'

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

/**
 * Presencia residente del NORTHMINE Operational Intelligence Agent: un
 * indicador discreto (orbe), no un boton flotante generico de soporte.
 * Vive fuera de AppShell (como los demas overlays de App.tsx) para no
 * heredar ningun `filter`/`backdrop-filter` de un contenedor que rompa su
 * `position: fixed`. El estado real del agente (escuchando/hablando/
 * analizando/actuando) se muestra dentro de AgentWorkspace mientras esta
 * abierto; en reposo el orbe solo pulsa, sin microfono activo (seccion 17:
 * nunca se activa el microfono sin una accion explicita del usuario).
 */
export function AgentPresence() {
  const usuario = useAppStore((state) => state.usuario)
  // Suscritos para que AgentPresence re-renderice (y por lo tanto recalcule
  // el contexto) cuando cambian - buildCopilotContext lee el store/registry
  // directo, no estos valores, pero necesitamos el re-render disparado por
  // ellos para mantener contextRef.current al dia dentro de AgentWorkspace.
  useAppStore((state) => state.activeSection)
  useAppStore((state) => state.filtro)
  const [open, setOpen] = useState(false)

  if (!usuario || !CHAT_ROLES.has(usuario.rol)) return null

  const context = buildCopilotContext(usuario.faena)

  return (
    <>
      <button
        type="button"
        className={`ai-agent-orb${open ? ' is-open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label="NORTHMINE AI — Operational Intelligence Agent"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="NORTHMINE AI"
      >
        <span className="ai-agent-orb-ring" aria-hidden="true" />
        <Sparkles size={18} />
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
