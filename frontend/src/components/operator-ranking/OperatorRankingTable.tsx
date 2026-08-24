import { ClipboardList, Eye } from 'lucide-react'
import type { OperatorRankingItem } from '../../types/operatorRanking'
import { OperatorRiskBadge } from './OperatorRiskBadge'
import { useModuleT } from '../../i18n/useModuleT'
import { operatorRankingT, type OperatorRankingT } from '../../i18n/modules/operatorRanking'

interface Props {
  items: OperatorRankingItem[]
  onSelect: (item: OperatorRankingItem) => void
  onAudit: (item: OperatorRankingItem) => void
}

function pct(value: number) {
  return `${Number(value || 0).toFixed(1)}%`
}

function tons(value: number) {
  return Math.round(value || 0).toLocaleString('es-CL')
}

function hours(value: number) {
  return `${Math.round((value || 0) / 60).toLocaleString('es-CL')} h`
}

function causeLabel(t: OperatorRankingT, value: string) {
  return String(value || t.sin_causa).replace(/^O\d+\s/, '').replace(/^S\d+\s/, '')
}

function scoreClass(value: number) {
  if (value >= 90) return 'score-excellent'
  if (value >= 80) return 'score-good'
  if (value >= 70) return 'score-watch'
  if (value >= 60) return 'score-risk'
  return 'score-critical'
}

function topDelayChips(t: OperatorRankingT, item: OperatorRankingItem) {
  return [
    { label: t.tabla_chip_bano, minutes: item.bathroom_minutes },
    { label: t.tabla_chip_colacion, minutes: item.lunch_minutes },
    { label: t.tabla_chip_cambio_turno, minutes: item.shift_change_minutes },
    { label: t.tabla_chip_combustible, minutes: item.fueling_minutes },
    { label: t.tabla_chip_sin_asignacion, minutes: item.no_assignment_minutes },
  ]
    .filter((entry) => Number(entry.minutes || 0) > 0)
    .sort((a, b) => Number(b.minutes || 0) - Number(a.minutes || 0))
    .slice(0, 3)
}

export function OperatorRankingTable({ items, onSelect, onAudit }: Props) {
  const t = useModuleT(operatorRankingT)
  return (
    <div className="table-wrap operator-ranking-table">
      <table>
        <thead>
          <tr>
            <th>{t.tabla_col_rank}</th>
            <th>{t.tabla_col_operador}</th>
            <th>{t.tabla_col_produccion}</th>
            <th>{t.tabla_col_demoras}</th>
            <th>{t.tabla_col_impacto}</th>
            <th>{t.tabla_col_riesgo}</th>
            <th>{t.tabla_col_accion}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.operator_id} onClick={() => onSelect(item)}>
              <td data-label={t.tabla_col_rank}><strong>#{item.rank}</strong></td>
              <td data-label={t.tabla_col_operador}>
                <div className="operator-name-cell">
                  <div className="operator-name-main">
                    <strong>{item.operator_name}</strong>
                    <span className={`operator-score-pill ${scoreClass(item.score_global)}`}>{item.score_global.toFixed(1)}</span>
                  </div>
                  <span>{item.operator_id} / {item.frequent_equipment_id}</span>
                </div>
              </td>
              <td data-label={t.tabla_col_produccion}>
                <div className="operator-production-cell">
                  <strong>{tons(item.toneladas_reales)} t</strong>
                  <span>{tons(item.ciclos)} {t.tabla_ciclos}</span>
                  <small>{Math.round(item.tph || 0).toLocaleString('es-CL')} tph / {pct(item.productividad_score)}</small>
                </div>
              </td>
              <td data-label={t.tabla_col_demoras}>
                <div className="operator-delay-cell">
                  <strong>{hours(item.manageable_delay_minutes)}</strong>
                  <span>{t.tabla_min_gestionables(item.manageable_delay_minutes.toLocaleString('es-CL'))}</span>
                  <div className="operator-delay-chips">
                    {topDelayChips(t, item).length
                      ? topDelayChips(t, item).map((entry) => <small key={entry.label}>{entry.label} {Math.round(entry.minutes)}m</small>)
                      : <small>{t.tabla_sin_demoras}</small>}
                  </div>
                </div>
              </td>
              <td data-label={t.tabla_col_impacto}>
                <div className="operator-impact-cell">
                  <strong>{tons(item.lost_tons_estimated)} t</strong>
                  <span>{t.tabla_perdida_estimada}</span>
                </div>
              </td>
              <td data-label={t.tabla_col_riesgo}>
                <div className="operator-risk-cause-cell">
                  <OperatorRiskBadge level={item.risk_level} />
                  <span>{causeLabel(t, item.main_loss_cause)}</span>
                </div>
              </td>
              <td data-label={t.tabla_col_accion} className="operator-recommendation-cell">{item.recommendation}</td>
              <td data-label={t.tabla_col_acciones} className="operator-table-actions">
                <button
                  type="button"
                  className="icon-action"
                  aria-label={t.tabla_ver_detalle(item.operator_name)}
                  aria-haspopup="dialog"
                  aria-controls="operator-detail-dialog"
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelect(item)
                  }}
                >
                  <Eye size={15} />
                </button>
                <button
                  type="button"
                  className="icon-action audit"
                  aria-label={t.tabla_ver_auditoria(item.operator_name)}
                  aria-haspopup="dialog"
                  aria-controls="operator-audit-dialog"
                  onClick={(event) => {
                    event.stopPropagation()
                    onAudit(item)
                  }}
                >
                  <ClipboardList size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
