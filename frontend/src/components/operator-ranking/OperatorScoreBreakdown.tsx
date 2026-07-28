import type { OperatorScoreBreakdown as Breakdown } from '../../types/operatorRanking'
import { useModuleT } from '../../i18n/useModuleT'
import { operatorRankingT, type OperatorRankingT } from '../../i18n/modules/operatorRanking'

function buildRows(t: OperatorRankingT): Array<{ key: keyof Breakdown; label: string; weight: string }> {
  return [
    { key: 'productividad_score', label: t.score_productividad, weight: '35%' },
    { key: 'disponibilidad_score', label: t.score_disponibilidad, weight: '25%' },
    { key: 'utilizacion_score', label: t.score_utilizacion, weight: '20%' },
    { key: 'control_demoras_score', label: t.score_control_demoras, weight: '15%' },
    { key: 'seguridad_score', label: t.score_seguridad, weight: '5%' },
  ]
}

function tone(value: number) {
  if (value >= 90) return 'excellent'
  if (value >= 80) return 'good'
  if (value >= 70) return 'watch'
  if (value >= 60) return 'risk'
  return 'critical'
}

export function OperatorScoreBreakdown({ breakdown }: { breakdown: Breakdown }) {
  const t = useModuleT(operatorRankingT)
  const rows = buildRows(t)
  return (
    <div className="operator-score-breakdown">
      {rows.map((row) => {
        const value = Number(breakdown[row.key] || 0)
        return (
          <div key={row.key} className="operator-score-row">
            <div>
              <strong>{row.label}</strong>
              <span>{t.score_peso(row.weight)}</span>
            </div>
            <div className="operator-score-track">
              <i className={`tone-${tone(value)}`} style={{ width: `${Math.min(100, value)}%` }} />
            </div>
            <b>{value.toFixed(1)}</b>
          </div>
        )
      })}
    </div>
  )
}
