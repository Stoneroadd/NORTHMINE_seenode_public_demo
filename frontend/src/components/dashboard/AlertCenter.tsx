import type { OperationalDomain, OperationalInsight } from '../../lib/operationalInsights'
import { ExecutiveInsightCard } from './ExecutiveInsightCard'

const domains: OperationalDomain[] = ['Produccion', 'Operacion', 'Seguridad', 'Mantencion']

interface Props {
  insights: OperationalInsight[]
  loading?: boolean
}

export function AlertCenter({ insights, loading = false }: Props) {
  const visible = insights.slice(0, 10)

  return (
    <section className="alert-center">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Centro de alertas</span>
          <h2>Prioridad ejecutiva consolidada</h2>
        </div>
        <span className="panel-tag">{loading ? 'Sincronizando' : `${visible.length}/10`}</span>
      </div>

      {visible.length ? (
        <div className="alert-domain-grid">
          {domains.map((domain) => {
            const domainInsights = visible.filter((insight) => insight.domain === domain)
            return (
              <div key={domain} className="alert-domain-column">
                <div className="alert-domain-title">
                  <strong>{domain}</strong>
                  <span>{domainInsights.length}</span>
                </div>
                <div className="alert-domain-list">
                  {domainInsights.length ? domainInsights.map((insight) => (
                    <ExecutiveInsightCard key={insight.id} insight={insight} compact />
                  )) : (
                    <div className="executive-empty-state is-small">Sin eventos relevantes.</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="executive-empty-state">Sin alertas ejecutivas para el periodo activo.</div>
      )}
    </section>
  )
}
