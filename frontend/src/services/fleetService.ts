import { northmineApi, type FleetStatus } from '../lib/api'
import type { AnalysisFilters } from '../components/filters/filterTypes'

export function getFleetStatus(turno = 'ACTUAL', filters?: AnalysisFilters): Promise<FleetStatus> {
  return northmineApi.fleetStatus(turno, filters)
}
