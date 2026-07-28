import { useQuery } from '@tanstack/react-query'
import { Activity, Gauge, Timer, TrendingDown, Truck, X } from 'lucide-react'
import type { AnalysisFilters } from '../filters/filterTypes'
import type { OperatorRankingItem } from '../../types/operatorRanking'
import { getOperatorRankingDetail, getOperatorScoreExplanation } from '../../services/operatorRankingService'
import { buildOperatorCoaching } from '../../lib/operatorCoaching'
import { useModuleT } from '../../i18n/useModuleT'
import { operatorRankingDrawerT } from '../../i18n/modules/operatorRankingDrawer'
import { operatorCoachingT } from '../../i18n/modules/operatorCoaching'
import { OperatorRiskBadge } from './OperatorRiskBadge'
import { OperatorScoreBreakdown } from './OperatorScoreBreakdown'
import { OperatorTrendChart } from './OperatorTrendChart'

interface Props {
  operator: OperatorRankingItem | null
  filters: AnalysisFilters
  open: boolean
  onClose: () => void
}

function formatNumber(value: number, digits = 0) {
  return Number(value || 0).toLocaleString('es-CL', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

function formatTons(value: number) {
  return `${formatNumber(value)} t`
}

function formatMinutes(value: number) {
  return `${formatNumber(value)} min`
}

function formatHours(value: number) {
  return `${formatNumber((value || 0) / 60, 1)} h`
}

export function OperatorRankingDrawer({ operator, filters, open, onClose }: Props) {
  const t = useModuleT(operatorRankingDrawerT)
  const tCoaching = useModuleT(operatorCoachingT)
  const operatorId = operator?.operator_id ?? ''
  const detailQuery = useQuery({
    queryKey: ['operator-ranking-detail', operatorId, filters],
    queryFn: () => getOperatorRankingDetail(operatorId, filters),
    enabled: open && Boolean(operatorId),
  })
  const explanationQuery = useQuery({
    queryKey: ['operator-ranking-explanation', operatorId, filters],
    queryFn: () => getOperatorScoreExplanation(operatorId, filters),
    enabled: open && Boolean(operatorId),
  })

  const detail = detailQuery.data
  const current = detail?.operator ?? operator
  const delayCategories = detail?.delay_categories ?? []
  const timeline = detail?.timeline ?? []
  const explanation = explanationQuery.data?.explanation ?? detail?.explanation ?? []
  const coaching = current ? buildOperatorCoaching(tCoaching, current, detail) : []

  return (
    <div className={`operator-ranking-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="operator-ranking-drawer-backdrop" onClick={onClose} />
      <aside className="operator-ranking-drawer-panel">
        <button className="operator-drawer-close" type="button" onClick={onClose} aria-label={t.cerrar_detalle}>
          <X size={18} />
        </button>

        {!current ? (
          <div className="loading-state">{t.selecciona_operador}</div>
        ) : (
          <>
            <header className="operator-drawer-header">
              <div className="operator-drawer-identity">
                <div>
                  <span className="panel-kicker">{t.detalle_operacional}</span>
                  <h2>{current.operator_name}</h2>
                  <div className="operator-drawer-meta">
                    <span>{current.operator_id}</span>
                    <span><Truck size={13} /> {current.frequent_equipment_id}</span>
                    <OperatorRiskBadge level={current.risk_level} />
                  </div>
                </div>
                <div className="operator-drawer-score-card">
                  <span>{t.score}</span>
                  <strong>{current.score_global.toFixed(1)}</strong>
                  <small>{current.recurrence_level || t.sin_recurrencia}</small>
                </div>
              </div>
              <p>{t.lectura_contextual}</p>
            </header>

            <section className="operator-drawer-summary-grid" aria-label={t.resumen_productivo_aria}>
              <div className="is-primary">
                <Activity size={18} />
                <span>{t.tonelaje}</span>
                <strong>{formatTons(current.toneladas_reales)}</strong>
                <small>{t.esperado_sufijo(formatTons(current.toneladas_esperadas))}</small>
              </div>
              <div>
                <Truck size={18} />
                <span>{t.ciclos}</span>
                <strong>{formatNumber(current.ciclos)}</strong>
                <small>{formatNumber(current.tph, 0)} tph</small>
              </div>
              <div>
                <Gauge size={18} />
                <span>{t.productividad}</span>
                <strong>{formatNumber(current.productividad_score, 1)}%</strong>
                <small>{t.score_productivo}</small>
              </div>
              <div>
                <Timer size={18} />
                <span>{t.demoras}</span>
                <strong>{formatHours(current.manageable_delay_minutes)}</strong>
                <small>{t.sistema_sufijo(formatMinutes(current.system_delay_minutes))}</small>
              </div>
              <div className="is-impact">
                <TrendingDown size={18} />
                <span>{t.impacto}</span>
                <strong>{formatTons(current.lost_tons_estimated)}</strong>
                <small>{t.perdida_estimada}</small>
              </div>
              <div>
                <Truck size={18} />
                <span>{t.equipo_frecuente}</span>
                <strong>{current.frequent_equipment_id || '-'}</strong>
                <small>{current.recurrence_level || t.sin_recurrencia}</small>
              </div>
            </section>

            {detailQuery.isError && (
              <section className="operator-drawer-section is-warning">
                <h3>{t.detalle_no_disponible_titulo}</h3>
                <p>{t.detalle_no_disponible_desc}</p>
              </section>
            )}

            {detailQuery.isLoading ? (
              <div className="loading-state">{t.cargando_detalle}</div>
            ) : (
              <>
                <div className="operator-drawer-content-grid">
                  <div className="operator-drawer-main-column">
                    {detail && <OperatorScoreBreakdown breakdown={detail.score_breakdown} />}

                    <section className="operator-drawer-section">
                      <h3>{t.explicacion_score}</h3>
                      {explanation.length ? (
                        <ul>
                          {explanation.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>{t.sin_explicacion}</p>
                      )}
                    </section>

                    <section className="operator-drawer-section">
                      <h3>{t.tendencia}</h3>
                      {detail?.trend?.length ? <OperatorTrendChart points={detail.trend} height={240} /> : <p>{t.sin_tendencia}</p>}
                    </section>
                  </div>

                  <div className="operator-drawer-side-column">
                    <section className="operator-drawer-section">
                      <h3>{t.demoras_por_categoria}</h3>
                      <div className="operator-delay-list">
                        {delayCategories.length ? (
                          delayCategories.slice(0, 10).map((delay) => (
                            <div key={`${delay.type}-${delay.category}`}>
                              <span>{delay.category}</span>
                              <strong>{delay.minutes} min</strong>
                              <small>{delay.type}</small>
                            </div>
                          ))
                        ) : (
                          <p>{t.sin_demoras_categorizadas}</p>
                        )}
                      </div>
                    </section>

                    <section className="operator-drawer-section">
                      <h3>{t.timeline_operacional}</h3>
                      <div className="operator-timeline">
                        {timeline.length ? (
                          timeline.slice(0, 16).map((event) => (
                            <div key={`${event.fecha}-${event.turno}-${event.category}-${event.minutes}`}>
                              <span>{event.fecha} / {event.turno}</span>
                              <strong>{event.category}</strong>
                              <small>{event.equipment_id} / {event.minutes} min / {event.type}</small>
                            </div>
                          ))
                        ) : (
                          <p>{t.sin_eventos_demora}</p>
                        )}
                      </div>
                    </section>
                  </div>
                </div>

                {coaching.length > 0 && (
                  <section className="operator-drawer-section operator-drawer-coaching">
                    <h3>{t.coaching}</h3>
                    <ul>
                      {coaching.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </section>
                )}

                <section className="operator-drawer-section operator-drawer-note">
                  <h3>{t.recomendacion}</h3>
                  <p>{detail?.recommendation ?? current.recommendation}</p>
                  <small>{detail?.privacy_note ?? t.privacy_note_default}</small>
                </section>
              </>
            )}
          </>
        )}
      </aside>
    </div>
  )
}
