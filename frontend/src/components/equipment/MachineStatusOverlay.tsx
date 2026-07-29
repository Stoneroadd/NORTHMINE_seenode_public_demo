import { AlertTriangle, Gauge, RadioTower } from 'lucide-react'
import { StatusPill, toneFromOperationalState } from '../ui/StatusPill'
import { formatTons as formatTonsBase } from '../../lib/format'

interface Props {
  state?: string
  toneladas?: number
  ciclos?: number
  rendimiento?: number
  alert?: string | null
}

function formatTons(value?: number) {
  if (value === undefined) return '-'
  return formatTonsBase(value)
}

export function MachineStatusOverlay({
  state = 'ACTIVO',
  toneladas,
  ciclos,
  rendimiento,
  alert,
}: Props) {
  const tone = toneFromOperationalState(state)

  return (
    <div className="machine-status-overlay">
      <div className="machine-status-top">
        <StatusPill tone={tone}>{state}</StatusPill>
        <span><RadioTower size={13} /> live</span>
      </div>
      <div className="machine-status-grid">
        <span><Gauge size={13} /> {formatTons(toneladas)}</span>
        <span>{rendimiento !== undefined ? `${rendimiento.toLocaleString('es-CL')} tph` : `${(ciclos ?? 0).toLocaleString('es-CL')} ciclos`}</span>
      </div>
      {alert && <p><AlertTriangle size={13} /> {alert}</p>}
    </div>
  )
}

