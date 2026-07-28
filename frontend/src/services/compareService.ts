import { northmineApi, type CompareResponse } from '../lib/api'

export interface CompareParams {
  desde_a?: string
  hasta_a?: string
  desde_b?: string
  hasta_b?: string
}

export function getCompare(params: CompareParams = {}): Promise<CompareResponse> {
  return northmineApi.compare(params)
}
