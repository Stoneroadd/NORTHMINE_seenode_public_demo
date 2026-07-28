import { northmineApi, type FleetFullResponse, type FleetStatus } from '../lib/api'
import type { AnalysisFilters } from '../components/filters/filterTypes'

export function getFleetStatus(turno = 'ACTUAL', filters?: AnalysisFilters): Promise<FleetStatus> {
  return northmineApi.fleetStatus(turno, filters)
}

export function getFleetFull(dias = 7, filters?: AnalysisFilters): Promise<FleetFullResponse> {
  return northmineApi.fleetFull(dias, filters)
}
