import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GitBranch, RotateCcw, Search } from 'lucide-react'
import { MissionState, StatusIndicator } from '../mission-control/design-system'
import { ApiError } from '../lib/api'
import {
  getGitNexusReindexJob,
  getGitNexusStatus,
  queryGitNexus,
  startGitNexusReindex,
  type GitNexusQueryResult,
} from '../mission-control/gitnexus/service'
import '../styles/gitnexus.css'

const ACTIVE_JOB_STATUSES = new Set(['queued', 'cloning', 'analyzing'])

function formatTimestamp(value: string | null): string {
  if (!value) return 'Nunca'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
}

function resultLabel(result: GitNexusQueryResult): string {
  const candidate = result.name ?? result.label ?? result.symbol ?? result.title
  return typeof candidate === 'string' ? candidate : 'Resultado'
}

function resultPath(result: GitNexusQueryResult): string | null {
  const candidate = result.file ?? result.path ?? result.filePath
  return typeof candidate === 'string' ? candidate : null
}

function resultSnippet(result: GitNexusQueryResult): string | null {
  const candidate = result.snippet ?? result.summary ?? result.description
  return typeof candidate === 'string' ? candidate : null
}

export function GitNexusPage() {
  const queryClient = useQueryClient()
  const [jobId, setJobId] = useState<string | null>(null)
  const [queryText, setQueryText] = useState('')
  const [results, setResults] = useState<GitNexusQueryResult[] | null>(null)

  const statusQuery = useQuery({
    queryKey: ['gitnexus', 'status'],
    queryFn: getGitNexusStatus,
  })

  const jobQuery = useQuery({
    queryKey: ['gitnexus', 'reindex', jobId],
    queryFn: () => getGitNexusReindexJob(jobId as string),
    enabled: jobId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && ACTIVE_JOB_STATUSES.has(status) ? 2000 : false
    },
  })

  const jobDone = jobId !== null && jobQuery.data && !ACTIVE_JOB_STATUSES.has(jobQuery.data.status)
  if (jobDone) {
    // Job just finished (this render) -- refresh the status card once.
    queryClient.invalidateQueries({ queryKey: ['gitnexus', 'status'] })
  }

  const reindexMutation = useMutation({
    mutationFn: startGitNexusReindex,
    onSuccess: (response) => setJobId(response.job_id),
  })

  const queryMutation = useMutation({
    mutationFn: (q: string) => queryGitNexus(q),
    onSuccess: (response) => setResults(response.results),
  })

  const handleSubmitQuery = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = queryText.trim()
    if (!trimmed) return
    queryMutation.mutate(trimmed)
  }

  if (statusQuery.isLoading) {
    return (
      <div className="mc-surface gx-page">
        <MissionState kind="loading" title="Consultando GitNexus" detail="Verificando el estado del índice de código." />
      </div>
    )
  }

  if (statusQuery.isError) {
    const error = statusQuery.error
    const isForbidden = error instanceof ApiError && error.status === 403
    return (
      <div className="mc-surface gx-page">
        <MissionState
          kind="error"
          title={isForbidden ? 'Cuenta sin acceso' : 'GitNexus no está disponible'}
          detail={
            isForbidden
              ? 'Esta sección requiere una cuenta administrativa real. Las cuentas demo sembradas (admin/demo/supervisor/operador) no tienen acceso, aunque el rol diga "admin".'
              : 'No se pudo consultar el módulo de inteligencia de código. Intenta de nuevo en unos segundos.'
          }
          actionLabel="Reintentar"
          onAction={() => void statusQuery.refetch()}
        />
      </div>
    )
  }

  if (!statusQuery.data?.available) {
    return (
      <div className="mc-surface gx-page">
        <MissionState
          kind="error"
          title="GitNexus no está disponible"
          detail="El módulo de inteligencia de código no está configurado en este entorno."
          actionLabel="Reintentar"
          onAction={() => void statusQuery.refetch()}
        />
      </div>
    )
  }

  const status = statusQuery.data
  const activeJob = jobId !== null && jobQuery.data && ACTIVE_JOB_STATUSES.has(jobQuery.data.status)

  return (
    <div className="mc-surface gx-page">
      <header className="gx-header">
        <GitBranch aria-hidden="true" size={22} />
        <div>
          <h1>GitNexus</h1>
          <p>Inteligencia de código sobre el propio repositorio de NORTHMINE</p>
        </div>
      </header>

      <section className="gx-status-card">
        <div>
          <StatusIndicator tone={status.indexed ? 'normal' : 'unknown'} label={status.indexed ? 'Indexado' : 'Sin indexar'} />
          <div className="gx-status-card__meta" style={{ marginTop: 8 }}>
            <strong>{status.repo_name ?? 'NORTHMINE_seenode_public_demo'}</strong>
            <span>Última indexación: {formatTimestamp(status.indexed_at)}</span>
            {activeJob && jobQuery.data?.progress?.message && <span>{jobQuery.data.progress.message}</span>}
            {jobQuery.data?.status === 'failed' && jobQuery.data.error && (
              <span style={{ color: 'var(--mc-critical)' }}>Falló: {jobQuery.data.error}</span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="mc-action mc-action--quiet"
          disabled={reindexMutation.isPending || Boolean(activeJob)}
          onClick={() => reindexMutation.mutate()}
        >
          <RotateCcw aria-hidden="true" size={15} />
          {activeJob ? 'Indexando…' : 'Reindexar'}
        </button>
      </section>

      <section className="gx-query">
        <form onSubmit={handleSubmitQuery}>
          <input
            type="text"
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            placeholder="Ej: ¿dónde se usa RequireAdmin?"
            disabled={!status.indexed}
            aria-label="Pregunta sobre el código de NORTHMINE"
          />
          <button type="submit" className="mc-action" disabled={!status.indexed || queryMutation.isPending}>
            <Search aria-hidden="true" size={15} />
            Preguntar
          </button>
        </form>

        {!status.indexed && <p className="mc-mission-state--empty">Ejecuta Reindexar antes de hacer preguntas.</p>}

        {queryMutation.isPending && <MissionState kind="loading" title="Buscando" detail="Consultando el grafo de código." />}

        {queryMutation.isError && (
          <MissionState kind="error" title="La consulta falló" detail="Intenta de nuevo en unos segundos." />
        )}

        {results && results.length === 0 && !queryMutation.isPending && (
          <MissionState kind="empty" title="Sin resultados" detail="No se encontró nada relacionado con esa pregunta." />
        )}

        {results && results.length > 0 && (
          <ul className="gx-results">
            {results.map((result, index) => (
              <li key={index} className="gx-result">
                <span className="gx-result__label">{resultLabel(result)}</span>
                {resultPath(result) && <span className="gx-result__path">{resultPath(result)}</span>}
                {resultSnippet(result) && <p className="gx-result__snippet">{resultSnippet(result)}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
