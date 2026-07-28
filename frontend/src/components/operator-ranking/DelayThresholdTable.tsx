import type { OperatorRankingMethodology } from '../../types/operatorRanking'
import { useModuleT } from '../../i18n/useModuleT'
import { operatorRankingT } from '../../i18n/modules/operatorRanking'

function thresholdFor(methodology: OperatorRankingMethodology, category: string) {
  const thresholds = methodology.thresholds.manageable_delays as Record<string, { expected?: [number, number]; alert?: number; critical?: number }> | undefined
  return thresholds?.[category]
}

function expectedLabel(value?: [number, number]) {
  if (!value) return '-'
  return `${value[0]}-${value[1]} min`
}

export function DelayThresholdTable({ methodology }: { methodology: OperatorRankingMethodology }) {
  const t = useModuleT(operatorRankingT)
  return (
    <div className="delay-threshold-table">
      <table>
        <thead>
          <tr>
            <th>{t.delay_col_categoria}</th>
            <th>{t.delay_col_tipo}</th>
            <th>{t.delay_col_esperado}</th>
            <th>{t.delay_col_alerta}</th>
            <th>{t.delay_col_critico}</th>
            <th>{t.delay_col_criterio}</th>
          </tr>
        </thead>
        <tbody>
          {methodology.manageable_delays.map((delay) => {
            const threshold = thresholdFor(methodology, delay.category)
            return (
              <tr key={delay.category}>
                <td>{delay.category}</td>
                <td>{t.delay_tipo_gestionable}</td>
                <td>{expectedLabel(threshold?.expected)}</td>
                <td>{threshold?.alert ? `${threshold.alert} min` : '-'}</td>
                <td>{threshold?.critical ? `${threshold.critical} min` : '-'}</td>
                <td>{delay.rule}</td>
              </tr>
            )
          })}
          {methodology.system_delays.map((delay) => (
            <tr key={delay.category}>
              <td>{delay.category}</td>
              <td>{t.delay_tipo_sistemica}</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>{delay.rule}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
