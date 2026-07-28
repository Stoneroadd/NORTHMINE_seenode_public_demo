import { northmineApi, type CurrentShiftCommandCenter } from '../lib/api'

export function getCurrentShiftCommandCenter(): Promise<CurrentShiftCommandCenter> {
  return northmineApi.currentShiftCommandCenter()
}
