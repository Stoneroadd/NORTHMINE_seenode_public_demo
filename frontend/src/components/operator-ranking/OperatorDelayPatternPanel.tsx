import { AlertTriangle } from 'lucide-react'
import type { OperatorDelayPattern } from '../../types/operatorRanking'
import { useModuleT } from '../../i18n/useModuleT'
import { operatorRankingT } from '../../i18n/modules/operatorRanking'

interface Props {
  patterns: OperatorDelayPattern[]
  onSelectOperator?: (operatorId: string) => void
}

export function OperatorDelayPatternPanel({ patterns, onSelectOperator }: Props) {
  const t = useModuleT(operatorRankingT)
  return (
    <section className="panel operator-pattern-panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">{t.pattern_kicker}</span>
          <h2>{t.pattern_titulo}</h2>
        </div>
        <span className="panel-tag">{t.pattern_tag}</span>
      </div>

      <div className="operator-pattern-list">
        {patterns.slice(0, 6).map((pattern) => (
          <button
            key={`${pattern.operator_id}-${pattern.category}`}
            type="button"
            aria-haspopup="dialog"
            aria-controls="operator-detail-dialog"
            onClick={() => onSelectOperator?.(pattern.operator_id)}
          >
            <span className={`pattern-level pattern-${pattern.pattern_level.toLowerCase()}`}>
              <AlertTriangle size={15} /> {pattern.pattern_level}
            </span>
            <strong>{pattern.operator_name}</strong>
            <small>{pattern.category} / {t.pattern_turnos(pattern.over_threshold_shifts)}</small>
            <small>{t.pattern_impacto(Math.round(pattern.lost_tons_estimated).toLocaleString('es-CL'))}</small>
          </button>
        ))}
        {!patterns.length && (
          <div className="operator-pattern-empty">{t.pattern_empty}</div>
        )}
      </div>
    </section>
  )
}
