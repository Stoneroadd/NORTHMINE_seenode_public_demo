import { Bot, GitBranch, RefreshCcw, ShieldAlert, Target, TrendingUp } from 'lucide-react'
import type { DispatcherAdvisorEvidence, DispatcherAdvisorResponse } from '../../lib/api'
import { formatMoney, formatNumber, formatTons } from './cockpitModel'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT } from '../../i18n/modules/cockpit'

interface DispatcherAdvisorPanelProps {
  data?: DispatcherAdvisorResponse
  error?: Error | null
  fetching?: boolean
  loading?: boolean
  onRefresh: () => void
}

function riskClass(value: string): string {
  const normalized = value.toLowerCase()
  if (normalized.includes('alto')) return 'is-bad'
  if (normalized.includes('medio')) return 'is-warn'
  return 'is-good'
}

function evidenceClass(source: string): string {
  const normalized = source.toLowerCase()
  if (normalized.includes('profit')) return 'is-green'
  if (normalized.includes('hidden')) return 'is-orange'
  if (normalized.includes('nlp')) return 'is-purple'
  return 'is-cyan'
}

function EvidenceCard({ item }: { item: DispatcherAdvisorEvidence }) {
  const t = useModuleT(cockpitT)
  return (
    <article className={`nmcp-dispatcher-evidence-card ${evidenceClass(item.source)}`}>
      <div>
        <span>{item.source.replace(/_/g, ' ')}</span>
        <strong>{item.title}</strong>
      </div>
      <p>{item.detail}</p>
      <em>{t.dispatcher_peso(formatNumber(item.weight * 100, 0))}</em>
    </article>
  )
}

export function DispatcherAdvisorPanel({
  data,
  error,
  fetching = false,
  loading = false,
  onRefresh,
}: DispatcherAdvisorPanelProps) {
  const t = useModuleT(cockpitT)
  if (loading) {
    return (
      <section className="nmcp-panel nmcp-dispatcher-panel" aria-label="AI Dispatcher Advisor">
        <div className="nmcp-panel-header">
          <div>
            <span className="nmcp-section-kicker">{t.dispatcher_kicker}</span>
            <h2>{t.dispatcher_loading_title}</h2>
          </div>
          <span className="nmcp-panel-tag">API v1</span>
        </div>
        <div className="nmcp-dispatcher-empty">{t.dispatcher_loading_body}</div>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="nmcp-panel nmcp-dispatcher-panel" aria-label="AI Dispatcher Advisor">
        <div className="nmcp-panel-header">
          <div>
            <span className="nmcp-section-kicker">{t.dispatcher_kicker}</span>
            <h2>{t.dispatcher_error_title}</h2>
          </div>
          <button className="nmcp-icon-button" type="button" onClick={onRefresh} aria-label={t.dispatcher_retry_aria}>
            <RefreshCcw size={16} />
          </button>
        </div>
        <div className="nmcp-dispatcher-empty">
          {t.dispatcher_error_body(error?.message ?? t.dispatcher_sin_respuesta)}
        </div>
      </section>
    )
  }

  const advisor = data.advisor
  const impact = advisor.impact
  const alternatives = data.alternatives.slice(0, 3)
  const evidence = data.evidence.slice(0, 4)

  return (
    <section className="nmcp-panel nmcp-dispatcher-panel" aria-label="AI Dispatcher Advisor">
      <div className="nmcp-panel-header">
        <div>
          <span className="nmcp-section-kicker">{t.dispatcher_kicker}</span>
          <h2>{t.dispatcher_title}</h2>
        </div>
        <div className="nmcp-dispatcher-actions">
          <span className={`nmcp-mode-pill ${data.data_source === 'DEMO' ? 'is-demo' : data.stale ? 'is-stale' : 'is-real'}`}>
            {data.data_source}
          </span>
          <span className={`nmcp-risk-chip ${riskClass(advisor.risk)}`}>{t.dispatcher_riesgo(advisor.risk)}</span>
          <span className="nmcp-panel-tag">{t.dispatcher_confianza(advisor.confidence)}</span>
          <button className="nmcp-icon-button" type="button" onClick={onRefresh} aria-label={t.dispatcher_refresh_aria}>
            <RefreshCcw size={16} className={fetching ? 'is-spinning' : undefined} />
          </button>
        </div>
      </div>

      <div className="nmcp-dispatcher-hero">
        <div className="nmcp-dispatcher-icon">
          <Bot size={24} />
        </div>
        <div>
          <span>{t.dispatcher_situacion}</span>
          <strong>{advisor.situation}</strong>
          <p>{advisor.probable_cause}</p>
        </div>
      </div>

      <div className="nmcp-dispatcher-main-grid">
        <article className="nmcp-dispatcher-action-card">
          <span><Target size={14} /> {t.dispatcher_accion_sugerida}</span>
          <h3>{advisor.action.title}</h3>
          <p>{advisor.action.rationale.slice(0, 2).join(' ') || t.dispatcher_sin_racional}</p>
          <div className="nmcp-dispatcher-targets">
            {advisor.target_equipment.slice(0, 6).map((item) => <span key={item}>{item}</span>)}
            {!advisor.target_equipment.length && <span>{t.dispatcher_sin_equipo_objetivo}</span>}
          </div>
        </article>

        <div className="nmcp-dispatcher-impact-grid">
          <article>
            <span><TrendingUp size={14} /> {t.dispatcher_productividad}</span>
            <strong>{impact.productivity_pct > 0 ? '+' : ''}{formatNumber(impact.productivity_pct, 1)}%</strong>
            <em>{t.dispatcher_potenciales(formatTons(impact.production_tonnes))}</em>
          </article>
          <article>
            <span><ShieldAlert size={14} /> {t.dispatcher_cola}</span>
            <strong>{impact.queue_delta_min > 0 ? '+' : ''}{formatNumber(impact.queue_delta_min, 1)} min</strong>
            <em>{t.dispatcher_ventana(advisor.execution_window_min)}</em>
          </article>
          <article>
            <span><GitBranch size={14} /> {t.dispatcher_valor_esperado}</span>
            <strong>{formatMoney(impact.expected_value_usd)}</strong>
            <em>{t.dispatcher_recuperable(formatMoney(impact.hidden_recoverable_usd))}</em>
          </article>
        </div>
      </div>

      <div className="nmcp-dispatcher-evidence-grid">
        {evidence.map((item) => <EvidenceCard key={`${item.source}-${item.title}`} item={item} />)}
      </div>

      <div className="nmcp-dispatcher-bottom-grid">
        <div className="nmcp-table-wrap nmcp-dispatcher-table-wrap">
          <table className="nmcp-table nmcp-dispatcher-table">
            <thead>
              <tr>
                <th>{t.dispatcher_col_alternativa}</th>
                <th>{t.dispatcher_col_valor}</th>
                <th>{t.dispatcher_col_produccion}</th>
                <th>{t.dispatcher_col_riesgo}</th>
              </tr>
            </thead>
            <tbody>
              {alternatives.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td>{formatMoney(item.expected_value_usd)}</td>
                  <td>{formatTons(item.production_tonnes)}</td>
                  <td>{item.risk}</td>
                </tr>
              ))}
              {!alternatives.length && (
                <tr>
                  <td colSpan={4}>{t.dispatcher_sin_alternativas}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <aside className="nmcp-dispatcher-trace">
          <span className="nmcp-section-kicker">{t.dispatcher_trazabilidad}</span>
          {data.traceability.inputs.map((item) => (
            <p key={item.endpoint}>
              <strong>{item.endpoint}</strong>
              <span>{item.status} - API {item.api_version}</span>
            </p>
          ))}
          <em>{data.traceability.decision_policy}</em>
          <small>{t.dispatcher_calidad_dato(formatNumber(data.data_quality.score, 0), data.data_quality.texts_analyzed)}</small>
        </aside>
      </div>
    </section>
  )
}
