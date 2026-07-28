import { Activity, MessageSquare, RefreshCcw, Search, TrendingUp } from 'lucide-react'
import type { OperationalNlpPattern, OperationalNlpResponse } from '../../lib/api'
import { formatMoney, formatNumber } from './cockpitModel'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT } from '../../i18n/modules/cockpit'

interface OperationalNlpPanelProps {
  data?: OperationalNlpResponse
  error?: Error | null
  fetching?: boolean
  loading?: boolean
  onRefresh: () => void
}

function trendLabel(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase()
}

function trendClass(value: string): string {
  const normalized = value.toLowerCase()
  if (normalized.includes('aumento')) return 'is-bad'
  if (normalized.includes('descenso')) return 'is-good'
  return 'is-warn'
}

function categoryLabel(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase()
}

function PatternRow({ pattern, active }: { pattern: OperationalNlpPattern; active: boolean }) {
  const t = useModuleT(cockpitT)
  return (
    <article className={active ? 'is-active' : undefined}>
      <div>
        <strong>{pattern.label}</strong>
        <span>{t.nlp_pattern_menciones(categoryLabel(pattern.category), pattern.frequency)}</span>
      </div>
      <div>
        <strong>{formatMoney(pattern.estimated_impact_usd)}</strong>
        <span>{t.nlp_pattern_horas(formatNumber(pattern.estimated_lost_hours, 1))}</span>
      </div>
    </article>
  )
}

export function OperationalNlpPanel({
  data,
  error,
  fetching = false,
  loading = false,
  onRefresh,
}: OperationalNlpPanelProps) {
  const t = useModuleT(cockpitT)
  if (loading) {
    return (
      <section className="nmcp-panel nmcp-nlp-panel" aria-label="Operational NLP">
        <div className="nmcp-panel-header">
          <div>
            <span className="nmcp-section-kicker">{t.nlp_title}</span>
            <h2>{t.nlp_loading_title}</h2>
          </div>
          <span className="nmcp-panel-tag">API v1</span>
        </div>
        <div className="nmcp-nlp-empty">{t.nlp_loading_body}</div>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="nmcp-panel nmcp-nlp-panel" aria-label="Operational NLP">
        <div className="nmcp-panel-header">
          <div>
            <span className="nmcp-section-kicker">{t.nlp_title}</span>
            <h2>{t.nlp_error_title}</h2>
          </div>
          <button className="nmcp-icon-button" type="button" onClick={onRefresh} aria-label={t.nlp_retry_aria}>
            <RefreshCcw size={16} />
          </button>
        </div>
        <div className="nmcp-nlp-empty">
          {t.nlp_error_body(error?.message ?? t.nlp_sin_respuesta)}
        </div>
      </section>
    )
  }

  const primary = data.patterns[0]
  const equipment = data.entities.equipment.slice(0, 5)
  const operators = data.entities.operators.slice(0, 5)

  return (
    <section className="nmcp-panel nmcp-nlp-panel" aria-label="Operational NLP">
      <div className="nmcp-panel-header">
        <div>
          <span className="nmcp-section-kicker">{t.nlp_kicker}</span>
          <h2>{t.nlp_subtitle}</h2>
        </div>
        <div className="nmcp-nlp-actions">
          <span className={`nmcp-mode-pill ${data.data_source === 'DEMO' ? 'is-demo' : data.stale ? 'is-stale' : 'is-real'}`}>
            {data.data_source}
          </span>
          <span className="nmcp-panel-tag">API {data.api_version}</span>
          <button className="nmcp-icon-button" type="button" onClick={onRefresh} aria-label={t.nlp_refresh_aria}>
            <RefreshCcw size={16} className={fetching ? 'is-spinning' : undefined} />
          </button>
        </div>
      </div>

      <div className="nmcp-nlp-summary">
        <article>
          <span><MessageSquare size={14} /> {t.nlp_senal_principal}</span>
          <strong>{data.summary.emerging_pattern}</strong>
          <em>{t.nlp_menciones_confianza(data.summary.frequency, data.summary.confidence)}</em>
        </article>
        <article>
          <span><Activity size={14} /> {t.nlp_impacto_asociado}</span>
          <strong>{formatMoney(data.summary.estimated_impact_usd)}</strong>
          <em>{t.nlp_horas_perdidas(formatNumber(data.summary.estimated_lost_hours, 1))}</em>
        </article>
        <article>
          <span><Search size={14} /> {t.nlp_equipos_mencionados}</span>
          <strong>{equipment.length ? equipment.map((item) => item.id).join(', ') : t.nlp_sin_equipo}</strong>
          <em>{t.nlp_textos_analizados(data.source_mix.total_texts, trendLabel(data.summary.trend))}</em>
        </article>
      </div>

      {primary ? (
        <div className="nmcp-nlp-primary">
          <div>
            <span className={`nmcp-risk-chip ${trendClass(primary.trend)}`}>{trendLabel(primary.trend)}</span>
            <h3>{t.nlp_que_dicen}</h3>
            <strong className="nmcp-nlp-cause">{primary.label}</strong>
            <p>{primary.recommendation}</p>
            <div className="nmcp-nlp-tags">
              {primary.keywords.slice(0, 5).map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
          <aside>
            <strong>{t.nlp_relacion_perdida}</strong>
            <span>{t.nlp_conectado(formatMoney(primary.linked_hidden_loss_usd))}</span>
            <span>{data.hidden_loss_context.primary_source}</span>
          </aside>
        </div>
      ) : (
        <div className="nmcp-nlp-empty">{t.nlp_sin_textos}</div>
      )}

      <div className="nmcp-nlp-grid">
        <div className="nmcp-nlp-patterns">
          <div className="nmcp-mini-section-title">
            <span>{t.nlp_patrones_detectados}</span>
            <strong>{data.patterns.length}</strong>
          </div>
          {data.patterns.slice(0, 4).map((pattern, index) => (
            <PatternRow key={pattern.id} pattern={pattern} active={index === 0} />
          ))}
          {!data.patterns.length && <div className="nmcp-nlp-empty">{t.nlp_sin_patrones}</div>}
        </div>

        <div className="nmcp-nlp-side">
          <div>
            <span className="nmcp-section-kicker">{t.nlp_equipos_involucrados}</span>
            {equipment.map((item) => (
              <p key={item.id}><Search size={13} /> <strong>{item.id}</strong> {t.nlp_menciones(item.mentions)}</p>
            ))}
            {!equipment.length && <p>{t.nlp_sin_equipos_asociados}</p>}
          </div>
          <div>
            <span className="nmcp-section-kicker">{t.nlp_operadores_roles}</span>
            {operators.map((item) => (
              <p key={item.id}><Search size={13} /> <strong>{item.id}</strong> {t.nlp_menciones(item.mentions)}</p>
            ))}
            {!operators.length && <p>{t.nlp_sin_operadores_asociados}</p>}
          </div>
        </div>
      </div>

      {primary?.evidence?.length ? (
        <div className="nmcp-nlp-evidence">
          <strong>{t.nlp_evidencia_operacional}</strong>
          {primary.evidence.slice(0, 3).map((item) => <span key={item}>{item}</span>)}
        </div>
      ) : null}
    </section>
  )
}
