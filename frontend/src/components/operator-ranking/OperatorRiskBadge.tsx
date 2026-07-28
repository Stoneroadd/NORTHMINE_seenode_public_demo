import type { OperatorRiskLevel } from '../../types/operatorRanking'
import { useModuleT } from '../../i18n/useModuleT'
import { operatorRankingT } from '../../i18n/modules/operatorRanking'

export function OperatorRiskBadge({ level }: { level: OperatorRiskLevel | string }) {
  const t = useModuleT(operatorRankingT)
  const LABELS: Record<string, string> = {
    EXCELENTE: t.risk_excelente,
    BUENO: t.risk_bueno,
    SEGUIMIENTO: t.risk_seguimiento,
    RIESGO_ALTO: t.risk_riesgo_alto,
    CRITICO: t.risk_critico,
  }
  const normalized = String(level || 'SEGUIMIENTO').toUpperCase()
  return (
    <span className={`operator-risk-badge risk-${normalized.toLowerCase().replace(/_/g, '-')}`}>
      {LABELS[normalized] ?? normalized}
    </span>
  )
}
