import type { OperatorRankingMethodology } from '../../types/operatorRanking'
import { ScoreWeightBar } from './ScoreWeightBar'
import { useModuleT } from '../../i18n/useModuleT'
import { operatorRankingT } from '../../i18n/modules/operatorRanking'
import { humanizeIdentifier } from '../../lib/presentationSafety'

export function ScoreFormulaCard({ methodology }: { methodology: OperatorRankingMethodology }) {
  const t = useModuleT(operatorRankingT)
  return (
    <section className="operator-method-card">
      <span className="panel-kicker">{t.formula_kicker}</span>
      <h3>{t.formula_titulo}</h3>
      <p>El resultado combina indicadores normalizados con ponderaciones auditables.</p>
      <div className="operator-formula-components">
        {Object.keys(methodology.score_formula.components).map((key) => (
          <div key={key}>
            <strong>{humanizeIdentifier(key)}</strong>
            <span>Incluido en la ponderación</span>
          </div>
        ))}
      </div>
      <ScoreWeightBar weights={methodology.weights} />
    </section>
  )
}
