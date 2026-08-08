import { getFleetStatus } from '../../services/fleetService'
import { getEquipmentLabel } from '../../data/equipmentAssets'
import type { FleetEquipment } from '../../lib/api'
import type { AgentEntityDescriptor, EntityResolutionResult } from './types'

/**
 * Catalogo de equipos independiente de la navegacion (prerrequisito de la
 * Etapa 3). Antes, entityResolver.ts solo tenia datos si el usuario ya
 * habia visitado /flota (via el widget registry). Esto llama a la MISMA
 * fuente real que usa FleetPage.tsx (getFleetStatus -> /api/fleet-status),
 * pero de forma independiente del ciclo de vida de ese componente - se
 * dispara una vez al montar AgentPresence (ver App.tsx-equivalente), no
 * requiere que el modulo Flota este montado.
 *
 * Single-tenant confirmado (Etapa 1): companyId/siteId en AgentScope
 * existen por fidelidad de interfaz con el brief, pero hoy son no-op - no
 * hay filtrado multi-tenant que aplicar porque NORTHMINE no lo tiene
 * todavia. Documentado, no fingido.
 */

export interface AgentScope {
  companyId?: string
  siteId?: string
}

export type CatalogLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

class AgentEquipmentCatalogImpl {
  private items: FleetEquipment[] = []
  private status: CatalogLoadStatus = 'idle'
  private loadedAt: string | null = null
  private inFlight: Promise<void> | null = null

  async load(): Promise<void> {
    if (this.status === 'ready' || this.inFlight) return this.inFlight ?? Promise.resolve()
    this.status = 'loading'
    this.inFlight = getFleetStatus('ACTUAL')
      .then((data) => {
        this.items = data.lista_equipos ?? []
        this.loadedAt = new Date().toISOString()
        this.status = 'ready'
      })
      .catch(() => {
        this.status = 'error'
      })
      .finally(() => {
        this.inFlight = null
      })
    return this.inFlight
  }

  async refresh(): Promise<void> {
    this.status = 'idle'
    return this.load()
  }

  getStatus(): CatalogLoadStatus {
    return this.status
  }

  /** Frescura en minutos desde la ultima carga exitosa, o null si nunca cargo. */
  ageMinutes(): number | null {
    if (!this.loadedAt) return null
    return Math.max(0, Math.round((Date.now() - new Date(this.loadedAt).getTime()) / 60000))
  }

  getById(id: string, _context?: AgentScope): AgentEntityDescriptor | null {
    const item = this.items.find((row) => row.caex_id.toUpperCase() === id.trim().toUpperCase())
    if (!item) return null
    return {
      entityType: 'equipment',
      entityId: item.caex_id,
      label: `${getEquipmentLabel(item.caex_id, item.modelo)} (${item.caex_id})`,
      moduleId: 'flota',
      supportedActions: ['select', 'open', 'focus'],
    }
  }

  resolve(query: string, _context?: AgentScope): EntityResolutionResult {
    const normalized = query.trim().toUpperCase()
    if (!normalized) return { status: 'not_found', candidates: [] }

    const seen = new Set<string>()
    const candidates: AgentEntityDescriptor[] = []
    for (const item of this.items) {
      if (seen.has(item.caex_id)) continue
      const label = getEquipmentLabel(item.caex_id, item.modelo)
      const haystack = `${item.caex_id} ${item.modelo ?? ''} ${label}`.toUpperCase()
      if (!haystack.includes(normalized)) continue
      seen.add(item.caex_id)
      candidates.push({
        entityType: 'equipment',
        entityId: item.caex_id,
        label: `${label} (${item.caex_id})`,
        moduleId: 'flota',
        supportedActions: ['select', 'open', 'focus'],
      })
      if (candidates.length >= 5) break
    }

    if (candidates.length === 0) return { status: 'not_found', candidates: [] }
    if (candidates.length === 1) return { status: 'resolved', candidates }
    return { status: 'ambiguous', candidates }
  }
}

export const agentEquipmentCatalog = new AgentEquipmentCatalogImpl()
