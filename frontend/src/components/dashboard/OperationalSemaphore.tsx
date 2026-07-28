import { STATUS_CONFIG, type OperationalStatus } from '../../services/operationalInsights'

const LIGHTS: OperationalStatus[] = ['CONTROLADO', 'PREVENTIVO', 'CRITICO']

interface Props {
  status: OperationalStatus
  headline: string
  loading?: boolean
}

export function OperationalSemaphore({ status, headline, loading }: Props) {
  const cfg = STATUS_CONFIG[status]

  if (loading) {
    return (
      <div className="op-semaphore op-semaphore-loading">
        <div className="semaphore-lights">
          {LIGHTS.map(s => <div key={s} className="semaphore-light semaphore-inactive" />)}
        </div>
        <div className="semaphore-info">
          <span className="skeleton-line short" style={{ height: 14, width: 100 }} />
          <span className="skeleton-line" style={{ height: 18, width: 240 }} />
        </div>
      </div>
    )
  }

  return (
    <div className={`op-semaphore op-semaphore-${status.toLowerCase()}`}>
      <div className="semaphore-lights">
        {LIGHTS.map(s => {
          const active = s === status
          const sc = STATUS_CONFIG[s]
          return (
            <div
              key={s}
              className={`semaphore-light ${active ? 'semaphore-active' : 'semaphore-inactive'}`}
              style={active ? {
                background: sc.color,
                boxShadow: `0 0 16px ${sc.color}99, 0 0 32px ${sc.color}44`,
              } : undefined}
              title={sc.label}
            />
          )
        })}
      </div>
      <div className="semaphore-info">
        <span className="semaphore-label" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
        <span className="semaphore-headline">{headline}</span>
        <span className="semaphore-desc">{cfg.desc}</span>
      </div>
    </div>
  )
}
