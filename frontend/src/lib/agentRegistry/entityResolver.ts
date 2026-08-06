import { getEquipmentLabel } from '../../data/equipmentAssets'
import { agentWidgetRegistry } from './registry'
import type { AgentEntityDescriptor, EntityResolutionResult } from './types'

/**
 * Resuelve referencias en lenguaje natural ("Pala 03", "CAEX 104") a IDs
 * reales - el modelo NUNCA decide el ID interno, solo propone texto libre
 * que pasa por aca. El catalogo es el roster REAL y en vivo expuesto por
 * fleet-status-table (no una lista inventada): busca por id, modelo o la
 * etiqueta amigable de data/equipmentAssets.ts.
 *
 * Limitacion conocida: si el usuario nunca visito Flota en la sesion
 * actual, el registro esta vacio y todo resuelve 'not_found' - no hay
 * catalogo independiente de la navegacion todavia (requeriria un endpoint
 * de roster dedicado, fuera de alcance de esta etapa).
 */
export function resolveEquipmentAlias(query: string): EntityResolutionResult {
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
