import { northmineApi, type ProductionShift } from '../lib/api'
import type { AnalysisFilters } from '../components/filters/filterTypes'

export function getProductionShift(turno = 'ACTUAL', filters?: AnalysisFilters): Promise<ProductionShift> {
  return northmineApi.productionShift(turno, filters)
}
