import { northmineApi, type ListResponse, type OperationalAlertsResponse, type SmartAlert } from '../lib/api'
import type { AnalysisFilters } from '../components/filters/filterTypes'

export function getSmartAlerts(filters?: AnalysisFilters): Promise<ListResponse<SmartAlert>> {
  return northmineApi.alerts(filters)
}

export function getOperationalAlerts(filters?: AnalysisFilters): Promise<OperationalAlertsResponse> {
  return northmineApi.operationalAlerts(filters)
}
