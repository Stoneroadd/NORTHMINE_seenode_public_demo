import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import type { AnalysisFilters } from '../filters/filterTypes'
import type { OperatorRankingItem } from '../../types/operatorRanking'
import { getOperatorRankingAudit } from '../../services/operatorRankingService'
import { CalculationTraceTable } from './CalculationTraceTable'
import { OperatorRiskBadge } from './OperatorRiskBadge'
import { ResponsibleUseNotice } from './ResponsibleUseNotice'
import { useModuleT } from '../../i18n/useModuleT'
import { operatorRankingT, type OperatorRankingT } from '../../i18n/modules/operatorRanking'
import { useModalA11y } from '../../hooks/useModalA11y'

interface Props {
  operator: OperatorRankingItem | null
  filters: AnalysisFilters
  open: boolean
  onClose: () => void
}

function KeyValueGrid({ data, t }: { data: Record<string, unknown>; t: OperatorRankingT }) {
  const entries = Object.entries(data ?? {})
  if (!entries.length) return <p className="operator-audit-muted">{t.audit_sin_datos}</p>
  return (
    <div className="operator-audit-kv">
      {entries.map(([key, value]) => (
        <div key={key}>
          <span>{key.replace(/_/g, ' ')}</span>
          <strong>{typeof value === 'number' ? value.toLocaleString('es-CL') : String(value)}</strong>
        </div>
      ))}
    </div>
  )
}

export function OperatorAuditDrawer({ operator, filters, open, onClose }: Props) {
  const t = useModuleT(operatorRankingT)
  const { panelRef, closeButtonRef, titleId, descriptionId } = useModalA11y(open, onClose)
  const operatorId = operator?.operator_id ?? ''
  const query = useQuery({
    queryKey: ['operator-ranking-audit', operatorId, filters],
    queryFn: () => getOperatorRankingAudit(operatorId, filters),
    enabled: open && Boolean(operatorId),
  })

  const audit = query.data

  if (!open) return null

  return (
    <div className="operator-audit-drawer is-open">
      <div className="operator-audit-backdrop" aria-hidden="true" onClick={onClose} />
      <aside
        id="operator-audit-dialog"
        ref={panelRef}
        className="operator-audit-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <button ref={closeButtonRef} type="button" className="operator-drawer-close" onClick={onClose} aria-label={t.audit_close}>
          <X size={18} />
        </button>

        <header className="operator-drawer-header">
          <span className="panel-kicker">{t.audit_kicker}</span>
          <h2 id={titleId}>{audit?.operator.operator_name ?? operator?.operator_name ?? t.audit_operador_fallback}</h2>
          <div className="operator-drawer-meta">
            <span>{audit?.operator.operator_id ?? operatorId}</span>
            <span>{t.audit_seed(audit?.seed_id ?? '-')}</span>
            {audit?.score.risk_level && <OperatorRiskBadge level={audit.score.risk_level} />}
          </div>
          <p id={descriptionId}>{t.audit_desc}</p>
        </header>

        {query.isLoading && <div className="loading-state" role="status" aria-live="polite">{t.audit_cargando}</div>}
        {query.isError && <div className="error-state" role="alert">{t.audit_error}</div>}

        {audit && (
          <div className="operator-audit-content">
            <ResponsibleUseNotice note={audit.responsible_use_note} compact />

            <section className="operator-drawer-section">
              <h3>{t.audit_resultado_titulo}</h3>
              <div className="operator-audit-score-grid">
                <div><span>{t.audit_score_global}</span><strong>{audit.score.score_global.toFixed(1)}</strong></div>
                <div><span>{t.audit_periodo}</span><strong>{audit.period.start_date} / {audit.period.end_date}</strong></div>
                <div><span>{t.audit_turnos_analizados}</span><strong>{audit.period.turnos_analizados}</strong></div>
                <div><span>{t.audit_modo}</span><strong>{audit.data_mode}</strong></div>
              </div>
              <p>{audit.score.risk_reason}</p>
            </section>

            <section className="operator-drawer-section">
              <h3>{t.audit_filtros_titulo}</h3>
              <KeyValueGrid data={audit.applied_filters} t={t} />
            </section>

            <section className="operator-drawer-section">
              <h3>{t.audit_datos_base_titulo}</h3>
              <KeyValueGrid data={audit.raw_values} t={t} />
            </section>

            <section className="operator-drawer-section">
              <h3>{t.audit_traza_titulo}</h3>
              <CalculationTraceTable trace={audit.calculation_trace} />
            </section>

            <section className="operator-drawer-section">
              <h3>{t.audit_penalizaciones_titulo}</h3>
              <KeyValueGrid data={audit.penalties} t={t} />
            </section>

            <section className="operator-drawer-section">
              <h3>{t.audit_excesos_titulo}</h3>
              <div className="operator-audit-list">
                {audit.manageable_delay_excess.map((row) => (
                  <div key={row.category} className={row.applied ? 'is-applied' : ''}>
                    <span>{row.category}</span>
                    <strong>{row.excess_minutes} min</strong>
                    <small>{row.note}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="operator-drawer-section">
              <h3>{t.audit_recurrencia_titulo}</h3>
              <KeyValueGrid data={audit.recurrence as unknown as Record<string, unknown>} t={t} />
            </section>

            <section className="operator-drawer-section">
              <h3>{t.audit_sistemicas_titulo}</h3>
              <p>{audit.system_delay_note}</p>
              <KeyValueGrid data={audit.system_delays_context} t={t} />
            </section>

            <section className="operator-drawer-section">
              <h3>{t.audit_explicacion_titulo}</h3>
              <ul>
                {audit.explanation_lines.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </section>

            <section className="operator-drawer-section operator-drawer-note">
              <h3>{t.audit_recomendacion_titulo}</h3>
              <p>{audit.recommendation}</p>
              <small>{audit.recommendation_reason}</small>
            </section>
          </div>
        )}
      </aside>
    </div>
  )
}
