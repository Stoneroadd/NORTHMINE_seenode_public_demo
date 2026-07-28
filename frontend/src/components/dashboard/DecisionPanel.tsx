import { Activity, CheckCircle2, CircleAlert, Siren } from 'lucide-react'
import type { DecisionSummary, OperationalStatus } from '../../lib/operationalInsights'

interface Props {
  decision: DecisionSummary
  generatedAt?: string
  apiStatus?: string
  actions?: string[]
}

const semaphore: Array<{ status: OperationalStatus; label: string; icon: typeof CheckCircle2 }> = [
  { status: 'controlado', label: 'Controlado', icon: CheckCircle2 },
  { status: 'preventivo', label: 'Preventivo', icon: CircleAlert },
  { status: 'critico', label: 'Critico', icon: Siren },
]

export function DecisionPanel({ decision, generatedAt, apiStatus, actions = [] }: Props) {
  const actionItems = actions.length ? actions : [decision.action]

  return (
    <section className={`decision-panel decision-${decision.status}`}>
      <div className="decision-head">
        <div>
          <span className="hero-kicker">Centro de comando operacional</span>
          <h2>Que esta pasando y que debo hacer</h2>
        </div>
        <div className="decision-meta">
          <span><Activity size={14} /> Riesgo operativo {decision.score}/100</span>
          <span>{apiStatus === 'ok' ? 'API online' : 'API verificando'}</span>
          {generatedAt && <span>{new Date(generatedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
      </div>

      <div className="operational-semaphore" aria-label="Semaforo operacional">
        {semaphore.map((item) => {
          const Icon = item.icon
          const active = item.status === decision.status
          return (
            <div key={item.status} className={`semaphore-item semaphore-${item.status} ${active ? 'is-active' : ''}`}>
              <Icon size={18} />
              <span>{item.label}</span>
            </div>
          )
        })}
      </div>

      <div className="decision-copy-grid">
        <div className="decision-copy-block">
          <span>Diagnostico</span>
          <p>{decision.diagnosis}</p>
        </div>
        <div className="decision-copy-block">
          <span>Riesgo</span>
          <p>{decision.risk}</p>
        </div>
        <div className="decision-copy-block">
          <span>Accion</span>
          <p>{decision.action}</p>
        </div>
      </div>

      <div className="decision-next-actions" aria-label="Acciones recomendadas ahora">
        <span>Que hacer ahora</span>
        <ol>
          {actionItems.slice(0, 3).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>
    </section>
  )
}
