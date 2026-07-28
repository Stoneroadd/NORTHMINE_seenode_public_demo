import { AlertTriangle, ShieldAlert } from 'lucide-react'
import type { ExecutiveRisk } from '../../lib/operationalInsights'

interface Props {
  risk: ExecutiveRisk
}

function severityClass(severity: ExecutiveRisk['severity']) {
  if (severity === 'CRITICA') return 'critical'
  if (severity === 'ALTA') return 'high'
  if (severity === 'MEDIA') return 'medium'
  return 'low'
}

export function RiskCard({ risk }: Props) {
  const tone = severityClass(risk.severity)
  const Icon = tone === 'critical' || tone === 'high' ? ShieldAlert : AlertTriangle

  return (
    <section className={`risk-card risk-${tone}`}>
      <div className="risk-card-head">
        <div>
          <span className="panel-kicker">Riesgo destacado</span>
          <h2>Que puede afectar el plan</h2>
        </div>
        <span className="risk-severity">{risk.severity}</span>
      </div>

      <div className="risk-body">
        <span className="risk-icon"><Icon size={24} /></span>
        <div>
          <span>Riesgo</span>
          <strong>{risk.title}</strong>
        </div>
      </div>

      <div className="risk-grid">
        <div>
          <span>Impacto</span>
          <strong>{risk.impact}</strong>
        </div>
        <div>
          <span>Origen</span>
          <strong>{risk.origin}</strong>
        </div>
      </div>

      <div className="risk-action">
        <span>Accion</span>
        <p>{risk.action}</p>
      </div>
    </section>
  )
}
