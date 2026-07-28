import { AlertTriangle, CircleAlert, Info, ShieldAlert } from 'lucide-react'
import type { SmartAlert } from '../../lib/api'
import { normalizeSeverity } from './AlertSeverityBadge'

const severityMeta: Record<string, { label: string; icon: typeof AlertTriangle }> = {
  CRITICAL: { label: 'Critica', icon: ShieldAlert },
  HIGH: { label: 'Alta', icon: CircleAlert },
  MEDIUM: { label: 'Media', icon: AlertTriangle },
  LOW: { label: 'Baja', icon: Info },
  INFO: { label: 'Info', icon: Info },
}

interface Props {
  alerts: SmartAlert[]
  loading?: boolean
}

export function SmartAlertPanel({ alerts, loading }: Props) {
  return (
    <section className="panel alert-panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Smart alerts</span>
          <h2>Riesgo operacional</h2>
        </div>
        <span className="panel-tag">{loading ? 'Sincronizando' : `${alerts.length} activas`}</span>
      </div>

      <div className="alert-list">
        {alerts.slice(0, 6).map((alert) => {
          const severity = normalizeSeverity(alert)
          const legacySeverity = {
            CRITICA: 'CRITICAL',
            ALTA: 'HIGH',
            MEDIA: 'MEDIUM',
            BAJA: 'LOW',
          }[severity] ?? 'INFO'
          const meta = severityMeta[legacySeverity] ?? severityMeta.INFO
          const Icon = meta.icon
          return (
            <article key={alert.id} className={`alert-row severity-${legacySeverity.toLowerCase()}`}>
              <div className="alert-icon"><Icon size={18} /></div>
              <div>
                <div className="alert-title">
                  <span>{alert.titulo ?? alert.title}</span>
                  <strong>{meta.label}</strong>
                </div>
                <p>{alert.descripcion ?? alert.description}</p>
              </div>
            </article>
          )
        })}
        {!alerts.length && !loading && (
          <div className="empty-state">Sin alertas criticas para el periodo consultado.</div>
        )}
      </div>
    </section>
  )
}
