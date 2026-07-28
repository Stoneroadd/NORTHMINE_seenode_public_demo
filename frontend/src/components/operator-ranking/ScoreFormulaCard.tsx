import type { OperatorRankingMethodology } from '../../types/operatorRanking'
import { ScoreWeightBar } from './ScoreWeightBar'
import { useModuleT } from '../../i18n/useModuleT'
import { operatorRankingT } from '../../i18n/modules/operatorRanking'

export function ScoreFormulaCard({ methodology }: { methodology: OperatorRankingMethodology }) {
  const t = useModuleT(operatorRankingT)
  return (
    <section className="operator-method-card">
      <span className="panel-kicker">{t.formula_kicker}</span>
      <h3>{t.formula_titulo}</h3>
      <code>{methodology.score_formula.text}</code>
      <div className="operator-formula-components">
        {Object.entries(methodology.score_formula.components).map(([key, formula]) => (
          <div key={key}>
            <strong>{key.replace(/_/g, ' ')}</strong>
            <span>{formula}</span>
          </div>
        ))}
      </div>
      <ScoreWeightBar weights={methodology.weights} />
    </section>
  )
}
