import type { SmartAlert } from '../../lib/api'
import { normalizeSeverity } from '../alerts/AlertSeverityBadge'

const SEV_COLOR: Record<string, string> = {
  CRITICA: '#ef4444',
  ALTA:    '#f59e0b',
  MEDIA:   '#38bdf8',
  BAJA:    '#10b981',
}

const SEV_RANK: Record<string, number> = {
  CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3,
}

function AlertRow({ alert }: { alert: SmartAlert }) {
  const sev = normalizeSeverity(alert)
  const color = SEV_COLOR[sev] ?? '#6366f1'
  const timestamp = alert.timestamp
  const ts = timestamp
    ? new Date(timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    : '--:--'

  return (
    <div className="alert-center-row" style={{ borderLeftColor: color }}>
      <div className="alert-center-row-top">
        <span className="alert-sev-dot" style={{ background: color, boxShadow: sev === 'CRITICA' ? `0 0 8px ${color}88` : 'none' }} />
        <span className="alert-sev-label" style={{ color }}>{sev}</span>
        <span className="alert-time">{ts}</span>
      </div>
      <p className="alert-center-msg">{alert.titulo ?? alert.title ?? alert.descripcion ?? alert.description ?? 'Alerta operacional'}</p>
      {alert.equipment_id && <span className="alert-equipo">{alert.equipment_id}</span>}
    </div>
  )
}

interface Props {
  alerts: SmartAlert[]
  loading?: boolean
  max?: number
}

export function AlertCenterPanel({ alerts, loading, max = 10 }: Props) {
  const sorted = [...alerts]
    .sort((a, b) => (SEV_RANK[normalizeSeverity(a)] ?? 9) - (SEV_RANK[normalizeSeverity(b)] ?? 9))
    .slice(0, max)

  const criticalCount = alerts.filter(a => normalizeSeverity(a) === 'CRITICA').length
  const highCount = alerts.filter(a => normalizeSeverity(a) === 'ALTA').length

  return (
    <div className="alert-center-panel panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Centro de alertas</span>
          <h2>Alertas activas</h2>
        </div>
        <div className="alert-center-summary">
          {criticalCount > 0 && (
            <span className="alert-count-badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.35)' }}>
              {criticalCount} CRÍTICA{criticalCount !== 1 ? 'S' : ''}
            </span>
          )}
          {highCount > 0 && (
            <span className="alert-count-badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.35)' }}>
              {highCount} ALTA{highCount !== 1 ? 'S' : ''}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="alert-center-rows">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="alert-center-row" style={{ borderLeftColor: 'var(--border-dim)' }}>
              <span className="skeleton-line short" />
              <span className="skeleton-line" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="alert-center-empty">
          <span className="alert-empty-icon">✓</span>
          <span>Sin alertas activas</span>
        </div>
      ) : (
        <div className="alert-center-rows">
          {sorted.map((alert, i) => <AlertRow key={alert.id ?? i} alert={alert} />)}
        </div>
      )}

      {alerts.length > max && (
        <div className="alert-center-overflow">
          +{alerts.length - max} alertas adicionales
        </div>
      )}
    </div>
  )
}
