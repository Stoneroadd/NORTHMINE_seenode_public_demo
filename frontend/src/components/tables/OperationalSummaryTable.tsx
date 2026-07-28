import type { RankingItem } from '../../lib/api'
import { useModuleT } from '../../i18n/useModuleT'
import { tablesT } from '../../i18n/modules/tables'

interface Props {
  loaders: RankingItem[]
  trucks: RankingItem[]
  destinations: RankingItem[]
}

function tons(value: number) {
  return `${Math.round(value).toLocaleString('es-CL')} t`
}

export function OperationalSummaryTable({ loaders, trucks, destinations }: Props) {
  const t = useModuleT(tablesT)
  const rows = loaders.slice(0, 5).map((loader, index) => {
    const truck = trucks[index]
    const destination = destinations[index]
    return {
      loader: loader.carguio_id ?? t.notAvailable,
      loaderTons: loader.tonelaje,
      cycles: loader.ciclos,
      truck: truck?.caex_id ?? t.notAvailable,
      destination: destination?.destino ?? t.notAvailable,
    }
  })

  return (
    <section className="panel table-panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">{t.mineOperation}</span>
          <h2>{t.executiveSummaryByFront}</h2>
        </div>
        <span className="panel-tag">{t.top5Units}</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.colLoadingUnit}</th>
              <th>{t.colTonnage}</th>
              <th>{t.colCycles}</th>
              <th>{t.colFeaturedCaex}</th>
              <th>{t.colDominantDestination}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.loader}>
                <td><strong>{row.loader}</strong></td>
                <td>{tons(row.loaderTons)}</td>
                <td>{row.cycles.toLocaleString('es-CL')}</td>
                <td>{row.truck}</td>
                <td>{row.destination}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

