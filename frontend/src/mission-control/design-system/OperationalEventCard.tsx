import { ArrowRight, Clock3 } from 'lucide-react'
import { StatusIndicator } from './StatusIndicator'
import type { OperationalTone } from './semantics'

interface OperationalEventCardProps {
  title: string
  impact: string
  elapsed: string
  tone: Exclude<OperationalTone, 'normal' | 'informational' | 'unknown'>
  lifecycle?: string
  onInspect?: () => void
  expanded?: boolean
  controlsId?: string
}

export function OperationalEventCard({
  title,
  impact,
  elapsed,
  tone,
  lifecycle,
  onInspect,
  expanded = false,
  controlsId,
}: OperationalEventCardProps) {
  return (
    <article className={`mc-event mc-event--${tone}`}>
      <div className="mc-event__status">
        <StatusIndicator tone={tone} />
        {lifecycle && <span className="mc-event__lifecycle">{lifecycle}</span>}
      </div>
      <div className="mc-event__body">
        <div>
          <h3>{title}</h3>
          <p>{impact}</p>
        </div>
        <span className="mc-event__elapsed"><Clock3 aria-hidden="true" size={15} />{elapsed}</span>
      </div>
      {onInspect && (
        <button
          type="button"
          className="mc-action"
          aria-expanded={expanded}
          aria-controls={controlsId}
          onClick={onInspect}
        >
          {expanded ? 'Ocultar detalle' : 'Inspeccionar'} <ArrowRight aria-hidden="true" size={16} />
        </button>
      )}
    </article>
  )
}
