import { CheckCircle2, Database, RadioTower } from 'lucide-react'
import type { HealthResponse } from '../../lib/api'
import { useModuleT } from '../../i18n/useModuleT'
import { statusT } from '../../i18n/modules/status'

interface Props {
  health?: HealthResponse
  loading?: boolean
}

export function SystemStatusBadge({ health, loading }: Props) {
  const t = useModuleT(statusT)
  const online = health?.service === 'northmine-api' || health?.status === 'ok'
  const mode = health?.environment === 'production' ? t.production : t.local
  const database = health?.database === 'connected' ? t.dbConnected : t.dbDisconnected

  return (
    <div className="status-strip" aria-label={t.systemStatusAria}>
      <span className={`status-pill ${online ? 'is-online' : 'is-warning'}`}>
        <RadioTower size={14} />
        {loading ? t.checkingApi : online ? t.apiConnected : t.apiUnreachable}
      </span>
      <span className="status-pill is-online">
        <Database size={14} />
        {mode}
      </span>
      <span className="status-pill is-muted">
        <CheckCircle2 size={14} />
        {database}
      </span>
    </div>
  )
}
