import { AlertTriangle, Clock3, Fuel, RefreshCcw, Search, ShieldAlert, Wrench } from 'lucide-react'
import type { HiddenLossesResponse } from '../../lib/api'
import { formatMoney, formatNumber, formatTons } from './cockpitModel'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT } from '../../i18n/modules/cockpit'

interface HiddenLossPanelProps {
  data?: HiddenLossesResponse
  error?: Error | null
  fetching?: boolean
  loading?: boolean
  onRefresh: () => void
}

function severityClass(severity: string): string {
  const normalized = severity.toLowerCase()
  if (normalized.includes('crit') || normalized.includes('alta')) return 'is-bad'
  if (normalized.includes('media')) return 'is-warn'
  return 'is-good'
}

function categoryLabel(category: string): string {
  return category.replace(/_/g, ' ').toLowerCase()
}

export function HiddenLossPanel({
  data,
  error,
  fetching = false,
  loading = false,
  onRefresh,
}: HiddenLossPanelProps) {
  const t = useModuleT(cockpitT)
  if (loading) {
    return (
      <section className="nmcp-panel nmcp-hidden-panel" aria-label="Hidden Loss Detector">
        <div className="nmcp-panel-header">
          <div>
            <span className="nmcp-section-kicker">{t.hidden_loss_title}</span>
            <h2>{t.hidden_loss_loading_title}</h2>
          </div>
          <span className="nmcp-panel-tag">API v1</span>
        </div>
        <div className="nmcp-hidden-empty">{t.hidden_loss_loading_body}</div>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="nmcp-panel nmcp-hidden-panel" aria-label="Hidden Loss Detector">
        <div className="nmcp-panel-header">
          <div>
            <span className="nmcp-section-kicker">{t.hidden_loss_title}</span>
            <h2>{t.hidden_loss_error_title}</h2>
          </div>
          <button className="nmcp-icon-button" type="button" onClick={onRefresh} aria-label={t.hidden_loss_retry_aria}>
            <RefreshCcw size={16} />
          </button>
        </div>
        <div className="nmcp-hidden-empty">
          {t.hidden_loss_error_body(error?.message ?? t.hidden_loss_sin_respuesta)}
        </div>
      </section>
    )
  }

  const primary = data.primary_source
  const topEquipment = data.by_equipment.slice(0, 5)

  return (
    <section className="nmcp-panel nmcp-hidden-panel" aria-label="Hidden Loss Detector">
      <div className="nmcp-panel-header">
        <div>
          <span className="nmcp-section-kicker">{t.hidden_loss_kicker}</span>
          <h2>{t.hidden_loss_subtitle}</h2>
        </div>
        <div className="nmcp-hidden-actions">
          <span className={`nmcp-mode-pill ${data.data_source === 'DEMO' ? 'is-demo' : data.stale ? 'is-stale' : 'is-real'}`}>
            {data.data_source}
          </span>
          <span className="nmcp-panel-tag">{t.hidden_loss_confianza(data.summary.confidence)}</span>
          <button className="nmcp-icon-button" type="button" onClick={onRefresh} aria-label={t.hidden_loss_refresh_aria}>
            <RefreshCcw size={16} className={fetching ? 'is-spinning' : undefined} />
          </button>
        </div>
      </div>

      <div className="nmcp-hidden-summary">
        <article>
          <span><Search size={14} /> {t.hidden_loss_valor_recuperable}</span>
          <strong>{formatMoney(data.summary.recoverable_value_usd)}</strong>
          <em>{t.hidden_loss_perdida_estimada(formatMoney(data.summary.hidden_loss_usd))}</em>
        </article>
        <article>
          <span><ShieldAlert size={14} /> {t.hidden_loss_causa_principal}</span>
          <strong>{primary.title}</strong>
          <em>{t.hidden_loss_category_severity(categoryLabel(primary.category), primary.severity)}</em>
        </article>
        <article>
          <span><Clock3 size={14} /> {t.hidden_loss_tiempo_capacidad}</span>
          <strong>{formatNumber(data.summary.lost_hours, 1)} h</strong>
          <em>{t.hidden_loss_potenciales(formatTons(data.summary.potential_tonnes))}</em>
        </article>
      </div>

      <div className="nmcp-hidden-primary">
        <div>
          <span className={`nmcp-risk-chip ${severityClass(primary.severity)}`}>{primary.severity}</span>
          <h3>{t.hidden_loss_que_lo_explica}</h3>
          <strong className="nmcp-hidden-cause">{primary.title}</strong>
          <p>{primary.recommendation}</p>
          <div className="nmcp-hidden-evidence">
            {primary.evidence.slice(0, 3).map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
        <div className="nmcp-hidden-impact">
          <span><AlertTriangle size={14} /> {t.hidden_loss_no_capturadas(formatTons(primary.lost_tonnes))}</span>
          <span><Fuel size={14} /> {t.hidden_loss_combustible(formatNumber(primary.impact.fuel_liters))}</span>
          <span><Wrench size={14} /> {t.hidden_loss_desgaste(formatMoney(primary.impact.wear_cost_usd))}</span>
        </div>
      </div>

      <div className="nmcp-hidden-grid">
        <div className="nmcp-hidden-loss-list">
          <div className="nmcp-mini-section-title">
            <span>{t.hidden_loss_fuentes}</span>
            <strong>{data.losses.length}</strong>
          </div>
          {data.losses.slice(0, 4).map((loss) => (
            <article key={loss.id}>
              <div>
                <strong>{loss.title}</strong>
                <span>{t.hidden_loss_category_confianza(categoryLabel(loss.category), loss.confidence)}</span>
              </div>
              <div>
                <strong>{formatMoney(loss.loss_usd)}</strong>
                <span>{t.hidden_loss_recuperable(formatMoney(loss.recoverable_usd))}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="nmcp-table-wrap nmcp-hidden-table-wrap">
          <div className="nmcp-mini-section-title">
            <span>{t.hidden_loss_equipos_afectados}</span>
            <strong>{t.common_top(topEquipment.length)}</strong>
          </div>
          <table className="nmcp-table nmcp-hidden-table">
            <thead>
              <tr>
                <th>{t.hidden_loss_col_equipo}</th>
                <th>{t.hidden_loss_col_perdida}</th>
                <th>{t.hidden_loss_col_horas}</th>
                <th>{t.hidden_loss_col_fuente}</th>
              </tr>
            </thead>
            <tbody>
              {topEquipment.map((item) => (
                <tr key={item.equipment_id}>
                  <td><strong>{item.equipment_id}</strong></td>
                  <td>{formatMoney(item.loss_usd)}</td>
                  <td>{formatNumber(item.lost_hours, 1)} h</td>
                  <td>{item.sources.join(', ')}</td>
                </tr>
              ))}
              {!topEquipment.length && (
                <tr>
                  <td colSpan={4}>{t.hidden_loss_sin_equipos}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="nmcp-hidden-footer">
        <strong>{t.common_lectura_ejecutiva}</strong>
        {data.insights.slice(0, 2).map((item) => <span key={item}>{item}</span>)}
      </div>
    </section>
  )
}
