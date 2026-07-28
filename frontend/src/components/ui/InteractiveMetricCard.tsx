import { LucideIcon } from 'lucide-react'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'
import { CommandCard } from './CommandCard'
import { StatusPill, type StatusTone } from './StatusPill'
import { useModuleT } from '../../i18n/useModuleT'
import { uiT } from '../../i18n/modules/ui'

interface Props {
  title: string
  value: number
  suffix?: string
  subtitle?: string
  delta?: string
  tone?: StatusTone
  icon: LucideIcon
  onHover?: () => void
}

export function InteractiveMetricCard({
  title,
  value,
  suffix = '',
  subtitle,
  delta,
  tone = 'info',
  icon: Icon,
  onHover,
}: Props) {
  const t = useModuleT(uiT)
  const animated = useAnimatedNumber(value, { durationMs: 760 })

  return (
    <CommandCard state={tone === 'critical' ? 'critical' : tone === 'warning' ? 'warning' : tone === 'success' ? 'success' : 'normal'} onMouseEnter={onHover}>
      <div className="interactive-metric-top">
        <span className="interactive-metric-icon"><Icon size={18} /></span>
        <StatusPill tone={tone}>{delta ?? t.live}</StatusPill>
      </div>
      <span className="interactive-metric-title">{title}</span>
      <strong className="interactive-metric-value">
        {Math.round(animated).toLocaleString('es-CL')}{suffix}
      </strong>
      {subtitle && <span className="interactive-metric-subtitle">{subtitle}</span>}
    </CommandCard>
  )
}

