import { CheckCircle2, CircleDot, DatabaseZap, Wrench } from 'lucide-react'

export type TimelineEntryKind = 'event' | 'action' | 'recovery' | 'system'

export interface TimelineEntry {
  id: string
  time: string
  label: string
  detail?: string
  kind: TimelineEntryKind
}

const ENTRY_ICONS = {
  event: CircleDot,
  action: Wrench,
  recovery: CheckCircle2,
  system: DatabaseZap,
} satisfies Record<TimelineEntryKind, typeof CircleDot>

export function OperationalTimeline({ entries, label = 'Cronología operacional' }: { entries: TimelineEntry[]; label?: string }) {
  return (
    <ol className="mc-timeline" aria-label={label}>
      {entries.map((entry) => {
        const Icon = ENTRY_ICONS[entry.kind]
        return (
          <li key={entry.id} className={`mc-timeline__entry mc-timeline__entry--${entry.kind}`}>
            <time>{entry.time}</time>
            <span className="mc-timeline__marker"><Icon aria-hidden="true" size={15} /></span>
            <div>
              <strong>{entry.label}</strong>
              {entry.detail && <p>{entry.detail}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
