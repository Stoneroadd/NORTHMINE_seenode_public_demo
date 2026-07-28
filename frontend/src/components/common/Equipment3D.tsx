import { useMemo } from 'react'
import { getEquipmentImage, getEquipmentLabel } from '../../data/equipmentAssets'

// Tornamesa 3D CSS para las imagenes de equipos (CAEX / UC): la imagen gira
// sobre su eje Y con perspectiva; la cara trasera va espejada para simular
// que el equipo da la vuelta. Respeta prefers-reduced-motion (queda estatica).

function delayFromId(id: string): string {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 9973
  }
  return `-${(hash % 70) / 10}s`
}

export function Equipment3D({
  id,
  model,
  speed = 'normal',
}: {
  id: string
  model?: string
  speed?: 'normal' | 'slow'
}) {
  const image = getEquipmentImage(id, model)
  const label = getEquipmentLabel(id, model)
  const delay = useMemo(() => delayFromId(id), [id])

  return (
    <span className={`nm-equip-3d is-${speed}`}>
      <span className="nm-equip-3d-stage" style={{ animationDelay: delay }}>
        <img className="is-front" src={image} alt={label} loading="lazy" />
        <img className="is-back" src={image} alt="" aria-hidden="true" loading="lazy" />
      </span>
      <i className="nm-equip-3d-shadow" aria-hidden="true" />
    </span>
  )
}
