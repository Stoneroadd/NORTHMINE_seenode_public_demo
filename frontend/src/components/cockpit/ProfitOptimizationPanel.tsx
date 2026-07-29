import { AlertTriangle, CircleDollarSign, RefreshCcw, ShieldCheck, TrendingUp } from 'lucide-react'
import type { ProfitOptimizationResponse, ProfitScenario } from '../../lib/api'
import { formatMoney, formatNumber, formatTons } from './cockpitModel'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT, type CockpitT } from '../../i18n/modules/cockpit'

interface ProfitOptimizationPanelProps {
  data?: ProfitOptimizationResponse
  error?: Error | null
  fetching?: boolean
  loading?: boolean
  onRefresh: () => void
}

function scenarioById(data: ProfitOptimizationResponse, id: string): ProfitScenario | undefined {
  return data.scenarios.find((item) => item.id === id)
}

function deltaLabel(value: number, formatter: (value: number) => string, t: CockpitT): string {
  if (value === 0) return t.profit_base
  return `${value > 0 ? '+' : ''}${formatter(value)}`
}

function riskClass(risk: string): string {
  const normalized = risk.toLowerCase()
  if (normalized.includes('alto')) return 'is-bad'
  if (normalized.includes('medio')) return 'is-warn'
  return 'is-good'
}

function MiniMetric({
  label,
  value,
  subtext,
  tone = 'neutral',
}: {
  label: string
  value: string
  subtext: string
  tone?: 'green' | 'cyan' | 'yellow' | 'purple' | 'neutral'
}) {
  return (
    <article className={`nmcp-profit-metric is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{subtext}</em>
    </article>
  )
}

export function ProfitOptimizationPanel({
  data,
  error,
  fetching = false,
  loading = false,
  onRefresh,
}: ProfitOptimizationPanelProps) {
  const t = useModuleT(cockpitT)
  if (loading) {
    return (
      <section className="nmcp-panel nmcp-profit-panel" aria-label="Profit Optimization">
        <div className="nmcp-panel-header">
          <div>
            <span className="nmcp-section-kicker">{t.profit_kicker}</span>
            <h2>{t.profit_loading_title}</h2>
          </div>
          <span className="nmcp-panel-tag">API v1</span>
        </div>
        <div className="nmcp-profit-empty">{t.profit_loading_body}</div>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="nmcp-panel nmcp-profit-panel" aria-label="Profit Optimization">
        <div className="nmcp-panel-header">
          <div>
            <span className="nmcp-section-kicker">{t.profit_kicker}</span>
            <h2>{t.profit_error_title}</h2>
          </div>
          <button className="nmcp-icon-button" type="button" onClick={onRefresh} aria-label={t.profit_retry_aria}>
            <RefreshCcw size={16} />
          </button>
        </div>
        <div className="nmcp-profit-empty">
          {t.profit_error_body(error?.message ?? t.profit_sin_respuesta)}
        </div>
      </section>
    )
  }

  const best = scenarioById(data, data.best_scenario_id) ?? data.scenarios[0]
  const highestProduction = scenarioById(data, data.best.highest_production)
  const lowestCostPerTonne = scenarioById(data, data.best.lowest_cost_per_tonne)
  const highestMargin = scenarioById(data, data.best.highest_margin)
  const isProductionBest = highestProduction?.id === best.id

  return (
    <section className="nmcp-panel nmcp-profit-panel" aria-label="Profit Optimization">
      <div className="nmcp-panel-header">
        <div>
          <span className="nmcp-section-kicker">{t.profit_kicker}</span>
          <h2>{t.profit_title}</h2>
        </div>
        <div className="nmcp-profit-actions">
          <span className={`nmcp-mode-pill ${data.data_source === 'DEMO' ? 'is-demo' : data.stale ? 'is-stale' : 'is-real'}`}>
            {data.data_source}
          </span>
          <span className="nmcp-panel-tag">API {data.api_version}</span>
          <button className="nmcp-icon-button" type="button" onClick={onRefresh} aria-label={t.profit_refresh_aria}>
            <RefreshCcw size={16} className={fetching ? 'is-spinning' : undefined} />
          </button>
        </div>
      </div>

      <div className="nmcp-profit-hero">
        <div className="nmcp-profit-best">
          <div className="nmcp-profit-best-icon">
            <CircleDollarSign size={22} />
          </div>
          <div>
            <span>{t.profit_recommended_scenario}</span>
            <strong>{best.name}</strong>
            <p>{best.tradeoff}</p>
          </div>
        </div>
        <div className="nmcp-profit-badges">
          <span><ShieldCheck size={14} /> {t.profit_confianza(best.confidence)}</span>
          <span><TrendingUp size={14} /> {t.profit_factibilidad(best.feasibility)}</span>
          {!isProductionBest && <span><AlertTriangle size={14} /> {t.profit_more_tons_not_more_value}</span>}
        </div>
      </div>

      <div className="nmcp-profit-metrics">
        <MiniMetric
          label={t.profit_valor_ajustado}
          value={formatMoney(best.risk_adjusted_value_usd)}
          subtext={deltaLabel(best.value_delta_usd, formatMoney, t)}
          tone="green"
        />
        <MiniMetric
          label={t.profit_costo_tonelada}
          value={`USD ${formatNumber(best.cost_per_tonne_usd, 2)}/t`}
          subtext={t.profit_menor(lowestCostPerTonne?.name ?? t.common_sin_dato)}
          tone="cyan"
        />
        <MiniMetric
          label={t.profit_margen_tonelada}
          value={`USD ${formatNumber(best.margin_per_tonne_usd, 2)}/t`}
          subtext={t.profit_mayor_margen(highestMargin?.name ?? t.common_sin_dato)}
          tone="yellow"
        />
        <MiniMetric
          label={t.profit_riesgo}
          value={`${formatNumber(best.risk * 100, 0)}%`}
          subtext={best.risk_label}
          tone="purple"
        />
      </div>

      <div className="nmcp-profit-grid">
        <div className="nmcp-table-wrap nmcp-profit-table-wrap">
          <table className="nmcp-table nmcp-profit-table">
            <thead>
              <tr>
                <th>{t.profit_col_escenario}</th>
                <th>{t.profit_col_toneladas}</th>
                <th>{t.profit_col_costo}</th>
                <th>{t.profit_col_usd_t}</th>
                <th>{t.profit_col_riesgo}</th>
                <th>{t.profit_col_valor_ajustado}</th>
              </tr>
            </thead>
            <tbody>
              {data.scenarios.map((scenario) => (
                <tr key={scenario.id} className={scenario.id === best.id ? 'is-best' : undefined}>
                  <td>
                    <strong>{scenario.name}</strong>
                    <span>{deltaLabel(scenario.production_delta_tonnes, formatTons, t)}</span>
                  </td>
                  <td>{formatTons(scenario.production_tonnes)}</td>
                  <td>
                    {formatMoney(scenario.total_cost_usd)}
                    <span>{deltaLabel(scenario.cost_delta_usd, formatMoney, t)}</span>
                  </td>
                  <td>USD {formatNumber(scenario.cost_per_tonne_usd, 2)}</td>
                  <td><em className={`nmcp-risk-chip ${riskClass(scenario.risk_label)}`}>{scenario.risk_label}</em></td>
                  <td>
                    {formatMoney(scenario.risk_adjusted_value_usd)}
                    <span>{deltaLabel(scenario.value_delta_usd, formatMoney, t)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="nmcp-profit-insights">
          <span className="nmcp-section-kicker">{t.common_lectura_ejecutiva}</span>
          {data.insights.slice(0, 4).map((item) => (
            <p key={item}>{item}</p>
          ))}
          <div className="nmcp-profit-assumptions">
            <span>{t.profit_valor_supuesto(formatNumber(data.assumptions.value_per_tonne_usd, 2))}</span>
            <span>{t.profit_fuente_costos(data.assumptions.cost_source)}</span>
            <span>{t.profit_actualizado(new Date(data.generated_at).toLocaleTimeString('es-CL'))}</span>
          </div>
        </aside>
      </div>
    </section>
  )
}
