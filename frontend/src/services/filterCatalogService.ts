import { apiFetch } from '../lib/api'
import type { FilterCatalog } from '../components/filters/filterTypes'

export const emptyRealFilterCatalog: FilterCatalog = {
  source: 'real-unavailable',
  shifts: [
    { value: 'TODOS', label: 'Todos' },
    { value: 'DIA', label: 'Dia' },
    { value: 'NOCHE', label: 'Noche' },
    { value: 'ACTUAL', label: 'Actual' },
  ],
  equipment_ids: [],
  caex_ids: [],
  loading_units: [],
  models: [],
  phases: [],
  origins: [],
  destinations: [],
  materials: [],
  operators: [],
  statuses: ['ACTIVO', 'DEMORA', 'SIN ACTIVIDAD', 'MANTENCION', 'AVERIA'].map((value) => ({ value, label: value })),
  severities: ['CRITICA', 'ALTA', 'MEDIA', 'BAJA'].map((value) => ({ value, label: value })),
  event_categories: [],
  delay_categories: [],
  recurrence_levels: ['BAJO', 'OBSERVACION', 'SEGUIMIENTO', 'ALTO'].map((value) => ({ value, label: value })),
}

emptyRealFilterCatalog.equipment_ids = []

export async function getFilterCatalog(): Promise<FilterCatalog> {
  try {
    return await apiFetch<FilterCatalog>('/api/filters/catalog')
  } catch {
    return emptyRealFilterCatalog
  }
}
