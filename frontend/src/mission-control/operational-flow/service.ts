import { apiFetch } from '../../lib/api'
import type { OperationalFlowSnapshot } from './types'

export function getOperationalFlowSnapshot(at: string): Promise<OperationalFlowSnapshot> {
  const query = new URLSearchParams({ at })
  return apiFetch<OperationalFlowSnapshot>(`/api/mission-control/operational-flow?${query.toString()}`)
}
