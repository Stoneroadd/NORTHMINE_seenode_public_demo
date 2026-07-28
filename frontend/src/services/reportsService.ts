import { northmineApi, type ShiftReport } from '../lib/api'
import type { AnalysisFilters } from '../components/filters/filterTypes'

export function getShiftReport(turno = 'ACTUAL', filters?: AnalysisFilters): Promise<ShiftReport> {
  return northmineApi.shiftReport(turno, filters)
}
