import { Check, Compass, X } from 'lucide-react'
import type { ExecutedAction } from './agentActionExecutor'

/** "Estado actuando" (seccion 2): cada accion de UI ejecutada queda visible aca, nunca oculta. */
export function AgentActionOverlay({ actions }: { actions: ExecutedAction[] }) {
  if (!actions.length) return null

  return (
    <ul className="ai-agent-action-overlay">
      {actions.map((entry, index) => (
        <li key={index} className={entry.applied ? 'is-applied' : 'is-skipped'}>
          {entry.applied ? <Check size={13} /> : <X size={13} />}
          <Compass size={13} />
          <span>{entry.label}</span>
        </li>
      ))}
    </ul>
  )
}
