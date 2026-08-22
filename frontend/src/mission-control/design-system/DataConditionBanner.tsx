import { AlertTriangle, CircleX, DatabaseZap, RefreshCcw, ShieldQuestion } from 'lucide-react'
import type { DataCondition } from './semantics'
import { dataConditionMeta } from './semantics'

const CONDITION_ICONS = {
  fresh: DatabaseZap,
  delayed: RefreshCcw,
  incomplete: ShieldQuestion,
  conflicting: AlertTriangle,
  unavailable: CircleX,
} satisfies Record<DataCondition, typeof DatabaseZap>

interface DataConditionBannerProps {
  condition: DataCondition
  detail?: string
  lastSuccessfulSync?: string
}

export function DataConditionBanner({ condition, detail, lastSuccessfulSync }: DataConditionBannerProps) {
  const Icon = CONDITION_ICONS[condition]
  const meta = dataConditionMeta(condition)
  const urgent = condition === 'unavailable' || condition === 'conflicting'

  return (
    <section
      className={`mc-data-condition mc-data-condition--${condition}`}
      aria-live={urgent ? 'assertive' : 'polite'}
      aria-label={meta.label}
    >
      <Icon aria-hidden="true" size={20} />
      <div>
        <strong>{meta.label}</strong>
        {detail && <p>{detail}</p>}
      </div>
      {lastSuccessfulSync && <time>{lastSuccessfulSync}</time>}
    </section>
  )
}
