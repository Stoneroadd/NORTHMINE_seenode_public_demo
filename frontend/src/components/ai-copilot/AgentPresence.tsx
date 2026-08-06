import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useAppStore } from '../../store'
import { AgentWorkspace } from './AgentWorkspace'
import '../../styles/ai-copilot.css'

const APPROVAL_ROLES = new Set(['admin', 'supervisor', 'operador'])
const CHAT_ROLES = new Set(['admin', 'supervisor', 'operador', 'viewer'])

function shiftForAgent(turno: string | undefined): string | null {
  if (!turno) return null
  return turno === 'AMBOS' ? 'TODOS' : turno
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
  const activeSection = useAppStore((state) => state.activeSection)
  const filtro = useAppStore((state) => state.filtro)
  const [open, setOpen] = useState(false)

  if (!usuario || !CHAT_ROLES.has(usuario.rol)) return null

  const context = {
    section: activeSection,
    active_section: activeSection,
    route: window.location.pathname,
    mine: usuario.faena,
    shift: shiftForAgent(filtro.turno),
    selected_date: filtro.fechaHasta || null,
    filters: {},
    selected_equipment_ids: filtro.equipo ? [filtro.equipo] : [],
  }

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
