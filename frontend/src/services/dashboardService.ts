import {
  northmineApi,
  type DemoSummary,
  type HealthResponse,
} from '../lib/api'
import type { AnalysisFilters } from '../components/filters/filterTypes'

export function getHealth(): Promise<HealthResponse> {
  return northmineApi.health()
}

export function getDashboardSummary(filters?: AnalysisFilters): Promise<DemoSummary> {
  return northmineApi.summary(filters)
}
