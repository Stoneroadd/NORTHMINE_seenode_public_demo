import type { FleetEquipment, LoadingUnit } from '../../lib/api'
import { EquipmentVisualCard } from './EquipmentVisualCard'

type EquipmentItem = FleetEquipment | LoadingUnit

interface Props {
  items: EquipmentItem[]
  variant?: 'fleet' | 'loading'
  limit?: number
  onInspect?: (item: EquipmentItem) => void
  onSelect?: (equipmentId: string, item: EquipmentItem) => void
  selectedEquipmentId?: string | null
  interactive?: boolean
}

function isFleet(item: EquipmentItem): item is FleetEquipment {
  return 'caex_id' in item
}

export function EquipmentCommandGrid({
  items,
  variant = 'loading',
  limit = 8,
  onInspect,
  onSelect,
  selectedEquipmentId,
  interactive = true,
}: Props) {
  return (
    <div className={`equipment-command-grid equipment-command-grid-${variant}`}>
      {items.slice(0, limit).map((item) => {
        if (isFleet(item)) {
          return (
            <EquipmentVisualCard
              key={item.caex_id}
              equipmentId={item.caex_id}
              model={item.modelo}
              state={item.estado}
              toneladas={item.toneladas}
              ciclos={item.ciclos}
              operator={item.operador}
              location={item.destino_actual}
              onInspect={() => onInspect?.(item)}
              onClick={() => onSelect?.(item.caex_id, item)}
              selected={selectedEquipmentId === item.caex_id}
              interactive={interactive && Boolean(onSelect)}
            />
          )
        }

        return (
          <EquipmentVisualCard
            key={item.carguio_id}
            equipmentId={item.carguio_id}
            model={item.modelo}
            state={item.estado}
            toneladas={item.toneladas}
            ciclos={item.ciclos}
            tph={item.rendimiento_tph}
            trucks={item.camiones_atendidos}
            location={item.ubicacion}
            onInspect={() => onInspect?.(item)}
            onClick={() => onSelect?.(item.carguio_id, item)}
            selected={selectedEquipmentId === item.carguio_id}
            interactive={interactive && Boolean(onSelect)}
          />
        )
      })}
    </div>
  )
}
