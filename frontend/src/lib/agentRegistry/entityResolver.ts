import { getEquipmentLabel } from '../../data/equipmentAssets'
import { agentEquipmentCatalog } from './equipmentCatalog'
import { agentWidgetRegistry } from './registry'
import type { AgentEntityDescriptor, EntityResolutionResult } from './types'

/**
 * Resuelve referencias en lenguaje natural ("Pala 03", "CAEX 104") a IDs
 * reales - el modelo NUNCA decide el ID interno, solo propone texto libre
 * que pasa por aca.
 *
 * Fuente primaria (Etapa 3): agentEquipmentCatalog, cargado independiente
 * de la navegacion (ver equipmentCatalog.ts, dispara load() al montar
 * AgentPresence). Si por algun motivo no cargo (error de red, todavia en
 * 'loading') se usa como respaldo el snapshot en vivo de fleet-status-table
 * - el registry de Flota ENRIQUECE, no es la unica fuente, tal como pide
 * el brief de Etapa 3.
 */
export function resolveEquipmentAlias(query: string): EntityResolutionResult {
  const catalogResult = agentEquipmentCatalog.resolve(query)
  if (catalogResult.status !== 'not_found') return catalogResult

  // Respaldo: registry en vivo (por si el catalogo aun no cargo o fallo).
  const normalized = query.trim().toUpperCase()
  if (!normalized) return { status: 'not_found', candidates: [] }

  const snapshot = agentWidgetRegistry.snapshot('fleet-status-table')
  const rows = (snapshot?.rows as Array<{ id: string; modelo?: string; estado?: string }> | undefined) ?? []
  if (!rows.length) return { status: 'not_found', candidates: [] }

  const seen = new Set<string>()
  const candidates: AgentEntityDescriptor[] = []
  for (const row of rows) {
    if (seen.has(row.id)) continue
    const label = getEquipmentLabel(row.id, row.modelo)
    const haystack = `${row.id} ${row.modelo ?? ''} ${label}`.toUpperCase()
    if (!haystack.includes(normalized)) continue
    seen.add(row.id)
    candidates.push({
      entityType: 'equipment',
      entityId: row.id,
      label: `${label} (${row.id})`,
      moduleId: 'flota',
      supportedActions: ['select', 'open', 'focus'],
    })
    if (candidates.length >= 5) break
  }

  if (candidates.length === 0) return { status: 'not_found', candidates: [] }
  if (candidates.length === 1) return { status: 'resolved', candidates }
  return { status: 'ambiguous', candidates }
}
