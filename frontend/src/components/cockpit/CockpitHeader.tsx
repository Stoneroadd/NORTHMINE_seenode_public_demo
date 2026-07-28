import { Clock3, Database, Download, RefreshCw, ShieldCheck } from 'lucide-react'
import type { CockpitViewModel } from './cockpitModel'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT } from '../../i18n/modules/cockpit'

function dateLabel(value: string) {
  try {
    return new Date(value).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return value
  }
}

function statusTone(status: string) {
  const normalized = status.toUpperCase()
  if (normalized.includes('CONNECTED') || normalized.includes('OK')) return 'is-connected'
  if (normalized.includes('STALE') || normalized.includes('CACHE')) return 'is-warning'
  return 'is-error'
}

export function CockpitHeader({
  data,
  fetching,
  onRefresh,
  downloadingReport = false,
  onDownloadReport,
}: {
  data: CockpitViewModel
  fetching: boolean
  onRefresh: () => void
  downloadingReport?: boolean
  onDownloadReport?: () => void
}) {
  const t = useModuleT(cockpitT)
  const modeLabel = data.isDemo ? t.header_modo_demo : data.stale ? t.header_cache_real : t.header_datos_reales
  const dataStatusLabel = data.isDemo
    ? t.header_datos_sinteticos
    : `${data.sourceSystem}: ${data.dataSourceStatus}`
  const quality = data.dataQualityScore === null ? data.dataQualityLabel : `${Math.round(data.dataQualityScore)}%`
  const freshness = data.lastRecordAgeMin === null ? null : `${data.lastRecordAgeMin} min`

  return (
    <header className="nmcp-header">
      <div className="nmcp-title-block">
        <span>NORTHMINE</span>
        <h1>{t.header_title}</h1>
        <p>{t.header_subtitle}</p>
      </div>

      <div className="nmcp-header-status" aria-label={t.header_status_aria}>
        <span className={`nmcp-status-pill ${statusTone(data.backendStatus)}`}>
          <ShieldCheck size={14} /> {t.header_backend(data.backendStatus)}
        </span>
        <span className={`nmcp-status-pill ${statusTone(data.dataSourceStatus)}`}>
          <Database size={14} /> {dataStatusLabel}
        </span>
        <span><Clock3 size={14} /> {dateLabel(data.generatedAt)}</span>
        <span>{t.header_ultimo_registro} <strong>{data.lastRealRecordLabel}</strong></span>
        <span className={`nmcp-mode-pill ${data.isDemo ? 'is-demo' : data.stale ? 'is-stale' : 'is-real'}`}>
          <Database size={14} /> {modeLabel}
        </span>
        <span>{t.header_calidad} <strong>{quality}</strong></span>
        {freshness && <span>{t.header_frescura} <strong>{freshness}</strong></span>}
        <span>{t.header_api} <strong>{data.apiVersion}</strong></span>
        {onDownloadReport && (
          <button className="nmcp-report-button" type="button" onClick={onDownloadReport} aria-label="Descargar informe ejecutivo" title="Descargar informe ejecutivo" disabled={downloadingReport}>
            <Download size={16} className={downloadingReport ? 'is-spinning' : ''} />
            <span>{downloadingReport ? 'Generando...' : 'Informe'}</span>
          </button>
        )}
        <button className="nmcp-icon-button" type="button" onClick={onRefresh} aria-label={t.header_refresh_aria} disabled={fetching}>
          <RefreshCw size={16} className={fetching ? 'is-spinning' : ''} />
        </button>
      </div>
    </header>
  )
}
