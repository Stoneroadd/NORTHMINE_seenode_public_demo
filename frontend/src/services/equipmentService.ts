import { apiFetch } from '../lib/api'
import type { EquipmentDetail } from '../types/equipment'

export function getEquipmentDetail(equipmentId: string): Promise<EquipmentDetail> {
  return apiFetch<EquipmentDetail>(`/api/equipment/${encodeURIComponent(equipmentId)}/detail`)
}
