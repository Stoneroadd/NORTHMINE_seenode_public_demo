import { apiFetch } from '../../lib/api'

export interface GitNexusStatus {
  available: boolean
  indexed: boolean
  repo_name: string | null
  indexed_at: string | null
  stats: Record<string, unknown> | null
}

export interface ReindexResponse {
  job_id: string
  status: string
}

export interface ReindexJobStatus {
  job_id: string
  status: string
  repo_name: string | null
  progress: { phase?: string; percent?: number; message?: string } | null
  error: string | null
}

export interface GitNexusQueryResult {
  [key: string]: unknown
}

export interface QueryResponse {
  results: GitNexusQueryResult[]
}

export function getGitNexusStatus(): Promise<GitNexusStatus> {
  return apiFetch<GitNexusStatus>('/api/gitnexus/status')
}

export function startGitNexusReindex(): Promise<ReindexResponse> {
  return apiFetch<ReindexResponse>('/api/gitnexus/reindex', { method: 'POST' })
}

export function getGitNexusReindexJob(jobId: string): Promise<ReindexJobStatus> {
  return apiFetch<ReindexJobStatus>(`/api/gitnexus/reindex/${encodeURIComponent(jobId)}`)
}

export function queryGitNexus(query: string, limit = 10): Promise<QueryResponse> {
  return apiFetch<QueryResponse>('/api/gitnexus/query', {
    method: 'POST',
    body: JSON.stringify({ query, limit }),
  })
}
