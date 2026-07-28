import { useModuleT } from '../../i18n/useModuleT'
import { operatorRankingT } from '../../i18n/modules/operatorRanking'

export function ScoreWeightBar({ weights }: { weights: Record<string, number> }) {
  const t = useModuleT(operatorRankingT)
  const LABELS: Record<string, string> = {
    productividad: t.score_productividad,
    disponibilidad: t.score_disponibilidad,
    utilizacion: t.score_utilizacion,
    control_demoras: t.score_control_demoras,
    seguridad: t.score_seguridad,
  }
  return (
    <div className="score-weight-grid">
      {Object.entries(weights).map(([key, value]) => (
        <div key={key} className="score-weight-row">
          <div>
            <strong>{LABELS[key] ?? key}</strong>
            <span>{t.score_peso_pct(Math.round(value * 100))}</span>
          </div>
          <div className="score-weight-track">
            <i style={{ width: `${Math.round(value * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
