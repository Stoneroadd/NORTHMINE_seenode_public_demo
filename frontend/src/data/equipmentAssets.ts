export type EquipmentType = 'pala' | 'cargador' | 'camion' | 'perforadora' | 'dozer' | 'auxiliar' | 'desconocido'
export type EquipmentFamily = 'carguio' | 'caex' | 'apoyo' | 'unknown'

interface EquipmentAsset {
  image: string
  label: string
  type: EquipmentType
}

const equipmentBase = '/assets/equipment'

const equipmentById: Record<string, EquipmentAsset> = {
  PALA1: { image: 'pala_1.png', label: 'Pala 1', type: 'pala' },
  'PALA 1': { image: 'pala_1.png', label: 'Pala 1', type: 'pala' },
  EX3600: { image: 'pala_komatsu.png', label: 'Pala Komatsu EX3600', type: 'pala' },
  EX3517: { image: 'pala_komatsu.png', label: 'Pala Komatsu EX3517', type: 'pala' },
  EX3470: { image: 'pala_komatsu.png', label: 'Pala Komatsu EX3470', type: 'pala' },
  EX3420: { image: 'pala_cat390.png', label: 'Pala CAT EX3420', type: 'pala' },
  EX09: { image: 'pala_komatsu.png', label: 'Pala Komatsu EX09', type: 'pala' },
  CF3672: { image: 'cargador_cat.png', label: 'Cargador CAT CF3672', type: 'cargador' },
  CF3449: { image: 'cargador_cat.png', label: 'Cargador CAT CF3449', type: 'cargador' },
  CF3589: { image: 'cargador_cat.png', label: 'Cargador CAT CF3589', type: 'cargador' },
  CF8007: { image: 'cargador_cat.png', label: 'Cargador CAT CF8007', type: 'cargador' },
  CF0007: { image: 'cargador_cat.png', label: 'Cargador CAT CF0007', type: 'cargador' },
  PERFORADORA: { image: 'perforadora.png', label: 'Perforadora', type: 'perforadora' },
  BULLDOZER: { image: 'bulldozer.png', label: 'Bulldozer', type: 'dozer' },
  WHEELDOZER: { image: 'wheeldozer.png', label: 'Wheeldozer', type: 'dozer' },
  ALJIBE: { image: 'aljibe.png', label: 'Aljibe', type: 'auxiliar' },
  MOTONIVELADORA: { image: 'motoniveladora.png', label: 'Motoniveladora', type: 'auxiliar' },
}

const equipmentByModel: Record<string, EquipmentAsset> = {
  CAT793F: { image: 'camion_cat793f.png', label: 'Camion CAT 793F', type: 'camion' },
  CAT793D: { image: 'camion_cat793f.png', label: 'Camion CAT 793D', type: 'camion' },
  CAT789D: { image: 'camion_cat793f.png', label: 'Camion CAT 789D', type: 'camion' },
  KOM980E: { image: 'camion_komatsu980.png', label: 'Camion Komatsu 980E', type: 'camion' },
  'KOM980E-5': { image: 'camion_komatsu980.png', label: 'Camion Komatsu 980E-5', type: 'camion' },
  KOM830E: { image: 'camion_komatsu980.png', label: 'Camion Komatsu 830E', type: 'camion' },
}

const fallbackByType: Record<EquipmentType, string> = {
  pala: 'pala_komatsu.png',
  cargador: 'cargador_cat.png',
  camion: 'camion_cat793f.png',
  perforadora: 'perforadora.png',
  dozer: 'bulldozer.png',
  auxiliar: 'motoniveladora.png',
  desconocido: 'camion_cat793f.png',
}

function normalize(value?: string) {
  return (value ?? '').trim().toUpperCase()
}

function resolveEquipment(equipmentId: string, model?: string): EquipmentAsset {
  const id = normalize(equipmentId)
  const modelKey = normalize(model)
  const type = getEquipmentType(equipmentId, model)

  return equipmentById[id]
    ?? equipmentByModel[modelKey]
    ?? {
      image: fallbackByType[type],
      label: [equipmentId, model].filter(Boolean).join(' / ') || 'Equipo minero',
      type,
    }
}

export function getEquipmentImage(equipmentId: string, model?: string) {
  return `${equipmentBase}/${resolveEquipment(equipmentId, model).image}`
}

export function getEquipmentLabel(equipmentId: string, model?: string) {
  return resolveEquipment(equipmentId, model).label
}

export function getEquipmentType(equipmentId: string, model?: string): EquipmentType {
  const id = normalize(equipmentId)
  const modelKey = normalize(model)

  if (equipmentById[id]?.type) return equipmentById[id].type
  if (equipmentByModel[modelKey]?.type) return equipmentByModel[modelKey].type
  // Resolver primero las unidades de carguio: sus modelos tambien contienen
  // CAT/KOM y antes caian incorrectamente en el fallback de camion.
  if (id.startsWith('EX') || id.startsWith('PALA') || modelKey.includes('PC5500') || modelKey.includes('390F') || modelKey.includes('390D')) return 'pala'
  if (id.startsWith('CF') || modelKey.includes('CAT995') || modelKey.includes('CAT994')) return 'cargador'
  if (id.startsWith('CAEX') || id.startsWith('SIM-CA') || modelKey.includes('CAT') || modelKey.includes('KOM')) return 'camion'
  if (id.includes('PERFORADORA') || modelKey.includes('PERF')) return 'perforadora'
  if (id.includes('BULLDOZER') || id.includes('WHEELDOZER') || modelKey.includes('DOZER')) return 'dozer'
  if (id.includes('ALJIBE') || id.includes('MOTONIVELADORA')) return 'auxiliar'

  return 'desconocido'
}

export function getEquipmentFamily(equipmentId: string, model?: string): EquipmentFamily {
  const type = getEquipmentType(equipmentId, model)

  if (type === 'pala' || type === 'cargador') return 'carguio'
  if (type === 'camion') return 'caex'
  if (type === 'perforadora' || type === 'dozer' || type === 'auxiliar') return 'apoyo'

  return 'unknown'
}

export function getEquipmentFamilyLabel(equipmentId: string, model?: string) {
  const type = getEquipmentType(equipmentId, model)
  const family = getEquipmentFamily(equipmentId, model)

  if (type === 'pala') return 'Pala / excavadora'
  if (type === 'cargador') return 'Cargador frontal'
  if (family === 'caex') return 'CAEX'
  if (family === 'apoyo') return 'Equipo de apoyo'

  return 'Equipo minero'
}
