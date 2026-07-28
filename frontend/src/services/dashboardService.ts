import {
  northmineApi,
  type DemoSummary,
  type HealthResponse,
} from '../lib/api'
import type { AnalysisFilters } from '../components/filters/filterTypes'

export { getSmartAlerts } from './alertsService'
export { getFleetStatus } from './fleetService'
export { getLoadingUnitsSummary } from './loadingUnitsService'
export { getProductionShift } from './productionService'
export { getShiftReport } from './reportsService'

export function getHealth(): Promise<HealthResponse> {
  return northmineApi.health()
}

export function getDashboardSummary(filters?: AnalysisFilters): Promise<DemoSummary> {
  return northmineApi.summary(filters)
}
