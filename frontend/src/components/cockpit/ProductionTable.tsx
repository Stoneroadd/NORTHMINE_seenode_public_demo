import type { CockpitHourlyPoint } from './cockpitModel'
import { formatNumber, formatTons } from './cockpitModel'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT } from '../../i18n/modules/cockpit'

export function ProductionTable({ data }: { data: CockpitHourlyPoint[] }) {
  const t = useModuleT(cockpitT)
  return (
    <section className="nmcp-panel nmcp-table-panel">
      <div className="nmcp-panel-header">
        <div>
          <span className="nmcp-section-kicker">{t.prod_table_kicker}</span>
          <h2>{t.prod_table_title}</h2>
        </div>
        <span className="nmcp-panel-tag">{t.prod_table_registros(data.length)}</span>
      </div>

      <div className="nmcp-table-wrap">
        <table className="nmcp-table">
          <thead>
            <tr>
              <th>{t.prod_table_col_hora}</th>
              <th>{t.prod_table_col_total}</th>
              <th>{t.prod_table_col_ciclos}</th>
              <th>{t.prod_table_col_t_ciclo}</th>
              <th>{t.prod_table_col_acumulado}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.hour}>
                <td>{row.hour}</td>
                <td>{formatTons(row.tonnes)}</td>
                <td>{row.cycles === null ? t.common_sin_dato : formatNumber(row.cycles)}</td>
                <td>{row.tonnesPerCycle === null ? t.common_sin_dato : formatNumber(row.tonnesPerCycle, 1)}</td>
                <td>{formatTons(row.accumulated)}</td>
              </tr>
            ))}
            {!data.length && (
              <tr>
                <td colSpan={5}>{t.prod_table_empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
