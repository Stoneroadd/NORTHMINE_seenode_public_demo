import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Info,
  LoaderCircle,
  OctagonAlert,
} from 'lucide-react'
import type { OperationalTone } from './semantics'
import { operationalToneMeta } from './semantics'

const STATUS_ICONS = {
  normal: CheckCircle2,
  attention: AlertTriangle,
  critical: OctagonAlert,
  informational: Info,
  unknown: CircleHelp,
  recovering: LoaderCircle,
} satisfies Record<OperationalTone, typeof CheckCircle2>

interface StatusIndicatorProps {
  tone: OperationalTone
  label?: string
  compact?: boolean
  className?: string
}

export function StatusIndicator({ tone, label, compact = false, className = '' }: StatusIndicatorProps) {
  const Icon = STATUS_ICONS[tone]
  const resolvedLabel = label ?? operationalToneMeta(tone).label

  return (
    <span className={`mc-status mc-status--${tone} ${compact ? 'mc-status--compact' : ''} ${className}`.trim()}>
      <Icon aria-hidden="true" size={compact ? 14 : 16} strokeWidth={2} />
      <span>{resolvedLabel}</span>
    </span>
  )
}
