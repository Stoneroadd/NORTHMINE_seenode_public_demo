import { AlertTriangle, CheckCircle2, CircleAlert, Info, ShieldAlert } from 'lucide-react'
import type { OperationalInsight } from '../../lib/operationalInsights'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

const severityMeta = {
  critical: { label: 'Critica', icon: ShieldAlert },
  high: { label: 'Alta', icon: CircleAlert },
  medium: { label: 'Media', icon: AlertTriangle },
  low: { label: 'Baja', icon: Info },
} satisfies Record<OperationalInsight['severity'], { label: string; icon: typeof AlertTriangle }>

function formatImpactTons(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} Mt`
  return `${Math.round(value).toLocaleString('es-CL')} t`
}

interface Props {
  insight: OperationalInsight
  compact?: boolean
}

export function ExecutiveInsightCard({ insight, compact = false }: Props) {
  const meta = severityMeta[insight.severity]
  const Icon = meta.icon
  const reducedMotion = usePrefersReducedMotion()
  const animatedImpact = useAnimatedNumber(insight.impactTons ?? 0, {
    enabled: insight.impactTons !== undefined && !reducedMotion,
    initialValue: 0,
    durationMs: 700,
  })

  return (
    <article className={`executive-insight-card insight-severity-${insight.severity} ${compact ? 'is-compact' : ''}`}>
      <div className="insight-card-head">
        <span className="insight-icon"><Icon size={17} /></span>
        <span className="insight-domain">{insight.domain}</span>
        <strong>{meta.label}</strong>
        {insight.impactTons !== undefined && (
          <strong className="insight-impact">{formatImpactTons(animatedImpact)}</strong>
        )}
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
