import { motion } from 'framer-motion'
import { Activity, Gauge, Truck } from 'lucide-react'
import { getEquipmentFamilyLabel, getEquipmentImage, getEquipmentLabel, getEquipmentType } from '../../data/equipmentAssets'
import { useTilt3D } from '../../hooks/useTilt3D'
import { CommandCard } from '../ui/CommandCard'
import { StatusPill, toneFromOperationalState } from '../ui/StatusPill'
import { MachineStatusOverlay } from './MachineStatusOverlay'

interface Props {
  equipmentId: string
  model?: string
  state?: string
  toneladas?: number
  ciclos?: number
  tph?: number
  operator?: string | null
  location?: string
  trucks?: number
  onInspect?: () => void
  onClick?: () => void
  selected?: boolean
  interactive?: boolean
}

function formatTons(value?: number) {
  if (value === undefined) return '-'
  return `${Math.round(value).toLocaleString('es-CL')} t`
}

export function EquipmentVisualCard({
  equipmentId,
  model,
  state = 'ACTIVO',
  toneladas,
  ciclos,
  tph,
  operator,
  location,
  trucks,
  onInspect,
  onClick,
  selected = false,
  interactive = true,
}: Props) {
  const image = getEquipmentImage(equipmentId, model)
  const label = getEquipmentLabel(equipmentId, model)
  const type = getEquipmentType(equipmentId, model)
  const family = getEquipmentFamilyLabel(equipmentId, model)
  const tone = toneFromOperationalState(state)
  const canOpenDetail = interactive && Boolean(onClick)
  const tilt = useTilt3D({ maxTilt: 5, scale: 1.012, enabled: interactive })

  return (
    <CommandCard
      state={tone === 'critical' ? 'critical' : tone === 'warning' ? 'warning' : tone === 'success' ? 'success' : 'normal'}
      className={`equipment-card equipment-card-${type} ${selected ? 'is-selected' : ''} ${canOpenDetail ? 'is-interactive' : ''}`}
      onMouseEnter={onInspect}
    >
      <button
        className="equipment-card-button"
        type="button"
        onClick={canOpenDetail ? onClick : undefined}
        onPointerMove={tilt.onPointerMove}
        onPointerLeave={tilt.onPointerLeave}
        style={tilt.style}
        aria-label={`Ver detalle operacional ${equipmentId}`}
        aria-pressed={selected}
        aria-disabled={!canOpenDetail}
        tabIndex={canOpenDetail ? 0 : -1}
      >
        <div className="equipment-image-stage">
          <motion.img
            src={image}
            alt={label}
            className="equipment-image"
            loading="lazy"
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
          <span className="equipment-scanline" />
          <span className="equipment-type">{family}</span>
          <MachineStatusOverlay state={state} toneladas={toneladas} ciclos={ciclos} rendimiento={tph} />
        </div>

        <div className="equipment-card-content">
          <div className="equipment-card-head">
            <div>
              <strong>{equipmentId}</strong>
              <span>{model ?? label}</span>
            </div>
            <StatusPill tone={tone}>{state}</StatusPill>
          </div>

          <div className="equipment-mini-kpis">
            <span><Activity size={13} /> {formatTons(toneladas)}</span>
            <span><Gauge size={13} /> {tph !== undefined ? `${tph.toLocaleString('es-CL')} tph` : `${(ciclos ?? 0).toLocaleString('es-CL')} ciclos`}</span>
            {trucks !== undefined && <span><Truck size={13} /> {trucks} CAEX</span>}
          </div>

          <div className="equipment-overlay">
            <strong>Analisis rapido</strong>
            <span>{operator ? `Operador ${operator}` : location ?? 'Sin dato de operador'}</span>
            <span>{tone === 'warning' ? 'Revisar restriccion operacional.' : tone === 'critical' ? 'Priorizar accion de despacho.' : 'Operacion dentro de rango.'}</span>
          </div>
        </div>
      </button>
    </CommandCard>
  )
}
