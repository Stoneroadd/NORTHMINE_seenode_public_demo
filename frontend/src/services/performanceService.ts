import { northmineApi, type PerformanceSummary } from '../lib/api'

export function getPerformanceSummary(desde?: string, hasta?: string): Promise<PerformanceSummary> {
  return northmineApi.performanceSummary(desde, hasta)
}
