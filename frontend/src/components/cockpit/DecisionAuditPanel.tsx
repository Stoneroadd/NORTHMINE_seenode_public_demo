import { ClipboardCheck, History, RefreshCcw, TrendingUp } from 'lucide-react'
import type { DecisionAuditRecord, DecisionAuditResponse } from '../../lib/api'
import { formatMoney, formatNumber, formatPct, formatTons } from './cockpitModel'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT, type CockpitT } from '../../i18n/modules/cockpit'

interface DecisionAuditPanelProps {
  data?: DecisionAuditResponse
  error?: Error | null
  fetching?: boolean
  loading?: boolean
  onRefresh: () => void
}

function statusClass(status: string): string {
  const normalized = status.toUpperCase()
  if (normalized.includes('EJECUTADA') || normalized === 'OK') return 'is-good'
  if (normalized.includes('PARCIAL') || normalized.includes('INSUFICIENTE')) return 'is-warn'
  if (normalized.includes('NO_EJECUTADA')) return 'is-bad'
  return 'is-neutral'
}

function Metric({
  label,
  value,
  subtext,
}: {
  label: string
  value: string
  subtext?: string
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
      {subtext && <em>{subtext}</em>}
    </article>
  )
}

function RecordRow({ item, t }: { item: DecisionAuditRecord; t: CockpitT }) {
  const evaluation = item.evaluation
  return (
    <tr>
      <td><strong>{item.recommended_action}</strong><span>{item.action_type}</span></td>
      <td><span className={`nmcp-audit-status ${statusClass(item.execution_status)}`}>{item.execution_status}</span></td>
      <td>{formatMoney(evaluation.expected_value_usd)}</td>
      <td>{formatMoney(evaluation.actual_value_usd)}</td>
      <td>{evaluation.effectiveness_score === null ? t.audit_sin_evaluar : formatPct(evaluation.effectiveness_score, 0)}</td>
    </tr>
  )
}

export function DecisionAuditPanel({
  data,
  error,
  fetching = false,
  loading = false,
  onRefresh,
}: DecisionAuditPanelProps) {
  const t = useModuleT(cockpitT)
  if (loading) {
    return (
      <section className="nmcp-panel nmcp-audit-panel" aria-label="Operational Decision Audit">
        <div className="nmcp-panel-header">
          <div>
            <span className="nmcp-section-kicker">{t.audit_title}</span>
            <h2>{t.audit_loading_title}</h2>
          </div>
          <span className="nmcp-panel-tag">API v1</span>
        </div>
        <div className="nmcp-audit-empty">{t.audit_loading_body}</div>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="nmcp-panel nmcp-audit-panel" aria-label="Operational Decision Audit">
        <div className="nmcp-panel-header">
          <div>
            <span className="nmcp-section-kicker">{t.audit_title}</span>
            <h2>{t.audit_error_title}</h2>
          </div>
          <button className="nmcp-icon-button" type="button" onClick={onRefresh} aria-label={t.audit_retry_aria}>
            <RefreshCcw size={16} />
          </button>
        </div>
        <div className="nmcp-audit-empty">
          {t.audit_error_body(error?.message ?? t.audit_sin_respuesta)}
        </div>
      </section>
    )
  }

  const metrics = data.historical_metrics
  const hasHistory = data.records.length > 0
  const current = data.current_decision
  const noHistoryMessage = data.message === 'Aun no existen decisiones auditadas.'
    ? t.audit_no_history_fallback
    : data.message

  return (
    <section className="nmcp-panel nmcp-audit-panel" aria-label="Operational Decision Audit">
      <div className="nmcp-panel-header">
        <div>
          <span className="nmcp-section-kicker">{t.audit_title}</span>
          <h2>{t.audit_kicker}</h2>
        </div>
        <div className="nmcp-audit-actions">
          <span className={`nmcp-mode-pill ${data.data_source === 'DEMO' ? 'is-demo' : 'is-real'}`}>
            {data.data_source}
          </span>
          <span className={`nmcp-audit-status ${statusClass(data.status)}`}>{data.status}</span>
          <button className="nmcp-icon-button" type="button" onClick={onRefresh} aria-label={t.audit_refresh_aria}>
            <RefreshCcw size={16} className={fetching ? 'is-spinning' : undefined} />
          </button>
        </div>
      </div>

      {!hasHistory && (
        <div className="nmcp-audit-no-history">
          <ClipboardCheck size={22} />
          <div>
            <strong>{t.audit_no_history_title}</strong>
            <p>{noHistoryMessage}</p>
            {current && (
              <span>
                {t.audit_en_seguimiento(current.recommendation.recommended_action)}
              </span>
            )}
          </div>
        </div>
      )}

      {hasHistory && metrics && (
        <>
          <div className="nmcp-audit-metrics">
            <Metric label={t.audit_metric_recomendaciones} value={formatNumber(metrics.recommendations)} subtext={t.audit_metric_ejecutadas(formatNumber(metrics.executed))} />
            <Metric label={t.audit_metric_adopcion} value={metrics.adoption_rate_pct === null ? t.audit_insuficiente : formatPct(metrics.adoption_rate_pct, 0)} subtext={t.audit_metric_parciales(formatNumber(metrics.partial))} />
            <Metric label={t.audit_metric_efectividad} value={metrics.average_effectiveness_pct === null ? t.audit_insuficiente : formatPct(metrics.average_effectiveness_pct, 0)} subtext={t.audit_metric_evaluadas(formatNumber(metrics.evaluated))} />
            <Metric label={t.audit_metric_valor_esperado} value={formatMoney(metrics.expected_value_usd)} subtext={t.audit_acumulado} />
            <Metric label={t.audit_metric_valor_real} value={formatMoney(metrics.actual_value_usd)} subtext={t.audit_observado} />
            <Metric label={t.audit_metric_recuperacion} value={metrics.value_recovery_ratio_pct === null ? t.audit_insuficiente : formatPct(metrics.value_recovery_ratio_pct, 0)} subtext={metrics.message} />
          </div>

          <div className="nmcp-audit-history-grid">
            <div className="nmcp-table-wrap nmcp-audit-table-wrap">
              <table className="nmcp-table nmcp-audit-table">
                <thead>
                  <tr>
                    <th>{t.audit_col_decision}</th>
                    <th>{t.audit_col_estado}</th>
                    <th>{t.audit_col_esperado}</th>
                    <th>{t.audit_col_real}</th>
                    <th>{t.audit_col_efectividad}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.slice(0, 8).map((item) => <RecordRow key={item.decision_id} item={item} t={t} />)}
                </tbody>
              </table>
            </div>

            <aside className="nmcp-audit-insights">
              <span className="nmcp-section-kicker">{t.audit_aprendizaje}</span>
              <p><History size={14} /> {t.audit_mejor_tipo_label} <strong>{metrics.best_action_type?.action_type ?? t.common_sin_dato}</strong></p>
              <p><TrendingUp size={14} /> {t.audit_menor_desempeno_label} <strong>{metrics.worst_action_type?.action_type ?? t.common_sin_dato}</strong></p>
              <em>{data.executive_summary?.message ?? metrics.message}</em>
            </aside>
          </div>
        </>
      )}

      {current && hasHistory && (
        <div className="nmcp-audit-current">
          <span>{t.audit_decision_actual}</span>
          <strong>{current.recommendation.recommended_action}</strong>
          <em>
            {t.audit_esperado_detalle(formatTons(current.recommendation.expected_impact.delta_tonnes), formatMoney(current.recommendation.expected_impact.delta_usd))}
          </em>
        </div>
      )}

      {!!data.warnings.length && (
        <div className="nmcp-audit-warnings">
          {data.warnings.slice(0, 3).map((item) => <span key={item}>{item}</span>)}
        </div>
      )}
    </section>
  )
}
