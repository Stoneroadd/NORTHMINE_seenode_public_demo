import type { CalculationTraceStep } from '../../types/operatorRanking'
import { useModuleT } from '../../i18n/useModuleT'
import { operatorRankingT } from '../../i18n/modules/operatorRanking'

export function CalculationTraceTable({ trace }: { trace: CalculationTraceStep[] }) {
  const t = useModuleT(operatorRankingT)
  return (
    <div className="calculation-trace-table">
      <table>
        <thead>
          <tr>
            <th>{t.trace_col_componente}</th>
            <th>{t.trace_col_formula}</th>
            <th>{t.trace_col_valor}</th>
            <th>{t.trace_col_score}</th>
            <th>{t.trace_col_peso}</th>
            <th>{t.trace_col_puntos}</th>
          </tr>
        </thead>
        <tbody>
          {trace.map((step) => (
            <tr key={step.component}>
              <td><strong>{step.component}</strong></td>
              <td>{step.formula}</td>
              <td>{step.raw_value.toFixed(1)}</td>
              <td>{step.normalized_score.toFixed(1)}</td>
              <td>{Math.round(step.weight * 100)}%</td>
              <td>{step.weighted_points.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
