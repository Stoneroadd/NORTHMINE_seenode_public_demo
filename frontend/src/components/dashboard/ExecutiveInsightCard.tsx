import { AlertTriangle, CheckCircle2, CircleAlert, Info, ShieldAlert } from 'lucide-react'
import type { OperationalInsight } from '../../lib/operationalInsights'

const severityMeta = {
  critical: { label: 'Critica', icon: ShieldAlert },
  high: { label: 'Alta', icon: CircleAlert },
  medium: { label: 'Media', icon: AlertTriangle },
  low: { label: 'Baja', icon: Info },
} satisfies Record<OperationalInsight['severity'], { label: string; icon: typeof AlertTriangle }>

interface Props {
  insight: OperationalInsight
  compact?: boolean
}

export function ExecutiveInsightCard({ insight, compact = false }: Props) {
  const meta = severityMeta[insight.severity]
  const Icon = meta.icon

  return (
    <article className={`executive-insight-card insight-severity-${insight.severity} ${compact ? 'is-compact' : ''}`}>
      <div className="insight-card-head">
        <span className="insight-icon"><Icon size={17} /></span>
        <span className="insight-domain">{insight.domain}</span>
        <strong>{meta.label}</strong>
      </div>
      <h3>{insight.title}</h3>
      <p>{insight.explanation}</p>
      <div className="insight-action">
        <CheckCircle2 size={15} />
        <span>{insight.recommendedAction}</span>
      </div>
    </article>
  )
}
