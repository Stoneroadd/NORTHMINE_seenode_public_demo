import { apiFetch } from '../lib/api'

async function getJson<T>(path: string): Promise<T> {
  return apiFetch<T>(path)
}

export type DemoSummary = {
  source: string
  mode: string
  generated_at: string
  period: Record<string, unknown>
  kpis: Record<string, number | string>
  daily: Array<Record<string, unknown>>
  hourly_shift: Array<Record<string, unknown>>
  top_loaders: Array<Record<string, unknown>>
  top_trucks: Array<Record<string, unknown>>
  destinations: Array<Record<string, unknown>>
  phase_breakdown: Array<Record<string, unknown>>
  current_shift: Record<string, unknown>
}

export const api = {
  summary: () => getJson<DemoSummary>('/api/summary'),
  fleet: () => getJson('/api/fleet/status'),
  alerts: () => getJson('/api/alerts'),
  shiftReport: () => getJson('/api/reports/shift'),
}
