import { Check, Compass, Loader2, X } from 'lucide-react'
import type { AgentActionResult } from '../../lib/agentRegistry/types'

/** "Estado actuando" (seccion 2 y 16 del brief): cada accion queda visible, con su resultado real - nunca se afirma "completed" sin confirmarlo. */
export function AgentActionOverlay({ actions }: { actions: AgentActionResult[] }) {
  if (!actions.length) return null

  return (
    <ul className="ai-agent-action-overlay">
      {actions.map((entry) => (
        <li key={entry.actionId} className={`is-${entry.status}`}>
          {entry.status === 'completed' && <Check size={13} />}
          {entry.status === 'executing' && <Loader2 size={13} className="ai-copilot-spin" />}
          {(entry.status === 'rejected' || entry.status === 'failed') && <X size={13} />}
          <Compass size={13} />
          <span>{entry.label}</span>
        </li>
      ))}
    </ul>
  )
}
