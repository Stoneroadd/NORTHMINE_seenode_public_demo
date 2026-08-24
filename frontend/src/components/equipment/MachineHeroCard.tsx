import { motion } from 'framer-motion'
import type { FleetEquipment, LoadingUnit } from '../../lib/api'
import { getEquipmentFamilyLabel, getEquipmentImage, getEquipmentLabel } from '../../data/equipmentAssets'
import { MachineStatusOverlay } from './MachineStatusOverlay'
import { EQUIPMENT_DETAIL_DRAWER_ID } from './equipmentDetailA11y'

type Machine = FleetEquipment | LoadingUnit

interface Props {
  item: Machine
  title?: string
  subtitle?: string
  onClick?: () => void
}

function isFleet(item: Machine): item is FleetEquipment {
  return 'caex_id' in item
}

function machineId(item: Machine) {
  return isFleet(item) ? item.caex_id : item.carguio_id
}

function machineModel(item: Machine) {
  return isFleet(item) ? item.modelo : item.modelo
}

export function MachineHeroCard({ item, title = 'Equipo destacado', subtitle, onClick }: Props) {
  const id = machineId(item)
  const model = machineModel(item)
  const image = getEquipmentImage(id, model)
  const label = getEquipmentLabel(id, model)
  const family = getEquipmentFamilyLabel(id, model)
  const isInteractive = Boolean(onClick)

  return (
    <article
      className={`machine-hero-card ${isInteractive ? 'is-interactive' : ''}`}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isInteractive ? `Ver detalle operacional ${id}` : undefined}
      aria-haspopup={isInteractive ? 'dialog' : undefined}
      aria-controls={isInteractive ? EQUIPMENT_DETAIL_DRAWER_ID : undefined}
      onKeyDown={(event) => {
        if (!isInteractive) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
    >
      <div className="machine-hero-copy">
        <span className="panel-kicker">{title}</span>
        <h3>{id}</h3>
        <p>{subtitle ?? label}</p>
        <strong>{family}</strong>
      </div>
      <div className="machine-hero-stage">
        <motion.img
          src={image}
          alt={label}
          loading="lazy"
          whileHover={{ scale: 1.06, y: -2 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
        />
        <span className="equipment-scanline" />
        <MachineStatusOverlay
          state={item.estado}
          toneladas={item.toneladas}
          ciclos={item.ciclos}
          rendimiento={!isFleet(item) ? item.rendimiento_tph : undefined}
          alert={isFleet(item) ? item.alerta : null}
        />
      </div>
    </article>
  )
}
