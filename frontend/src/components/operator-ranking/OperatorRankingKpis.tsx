import { AlertTriangle, Gauge, Timer, TrendingDown, Trophy, Users } from 'lucide-react'
import { ExecutiveKpiCard } from '../kpi/ExecutiveKpiCard'
import type { OperatorRankingSummary } from '../../types/operatorRanking'
import { useModuleT } from '../../i18n/useModuleT'
import { operatorRankingT } from '../../i18n/modules/operatorRanking'

function tons(value: number) {
  return `${Math.round(value).toLocaleString('es-CL')} t`
}

export function OperatorRankingKpis({ summary }: { summary: OperatorRankingSummary }) {
  const t = useModuleT(operatorRankingT)
  return (
    <section className="kpi-grid compact operator-ranking-kpis">
      <ExecutiveKpiCard
        title={t.kpi_mejor_titulo}
        value={`${summary.best_score.toFixed(1)}`}
        subtitle={summary.best_operator}
        trend={t.kpi_mejor_trend}
        tone="green"
        icon={Trophy}
      />
      <ExecutiveKpiCard
        title={t.kpi_promedio_titulo}
        value={`${summary.average_score.toFixed(1)}`}
        subtitle={t.kpi_promedio_subtitulo}
        trend={t.kpi_promedio_trend}
        tone="cyan"
        icon={Gauge}
      />
      <ExecutiveKpiCard
        title={t.kpi_foco_titulo}
        value={`${summary.high_risk_count}`}
        subtitle={t.kpi_foco_subtitulo}
        trend={t.kpi_foco_trend}
        tone={summary.high_risk_count > 0 ? 'amber' : 'green'}
        icon={AlertTriangle}
      />
      <ExecutiveKpiCard
        title={t.kpi_impacto_titulo}
        value={tons(summary.total_lost_tons_estimated)}
        subtitle={t.kpi_impacto_subtitulo}
        trend={t.kpi_impacto_trend}
        tone="slate"
        icon={TrendingDown}
      />
      <ExecutiveKpiCard
        title={t.kpi_demoras_titulo}
        value={`${Math.round(summary.manageable_delay_minutes / 60).toLocaleString('es-CL')} h`}
        subtitle={t.kpi_demoras_subtitulo}
        trend={t.kpi_demoras_trend}
        tone="amber"
        icon={Timer}
      />
      <ExecutiveKpiCard
        title={t.kpi_causa_titulo}
        value={summary.main_loss_cause.replace(/^O\d+\s/, '').replace(/^S\d+\s/, '')}
        subtitle={t.kpi_causa_subtitulo}
        trend={t.kpi_causa_trend}
        tone="slate"
        icon={Users}
      />
    </section>
  )
}
