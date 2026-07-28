import { northmineApi, type LoadingUnitsSummary } from '../lib/api'
import type { AnalysisFilters } from '../components/filters/filterTypes'

export function getLoadingUnitsSummary(turno = 'ACTUAL', filters?: AnalysisFilters): Promise<LoadingUnitsSummary> {
  return northmineApi.loadingUnits(turno, filters)
}
