import { Clock3, Database, Download, ShieldCheck } from 'lucide-react'
import type { CockpitViewModel } from './cockpitModel'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT } from '../../i18n/modules/cockpit'
import { Badge, type BadgeProps } from '../ui/badge'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'
import { operationalStatusLabel, sourceDisplayName } from '../../lib/presentationSafety'

function dateLabel(value: string) {
  try {
    return new Date(value).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return value
  }
}

function statusVariant(status: string): NonNullable<BadgeProps['variant']> {
  const normalized = status.toUpperCase()
  if (normalized.includes('CONNECTED') || normalized.includes('OK')) return 'success'
  if (normalized.includes('STALE') || normalized.includes('CACHE')) return 'warning'
  return 'critical'
}

export function CockpitHeader({
  data,
  downloadingReport = false,
  onDownloadReport,
}: {
  data: CockpitViewModel
  downloadingReport?: boolean
  onDownloadReport?: () => void
}) {
  const t = useModuleT(cockpitT)
  const modeLabel = data.isDemo ? t.header_modo_demo : data.stale ? t.header_cache_real : t.header_datos_reales
  const modeVariant: NonNullable<BadgeProps['variant']> = data.isDemo ? 'info' : data.stale ? 'warning' : 'success'
  const dataStatusLabel = data.isDemo
    ? t.header_datos_sinteticos
    : `${sourceDisplayName(data.sourceSystem)}: ${operationalStatusLabel(data.dataSourceStatus)}`
  const quality = data.dataQualityScore === null ? data.dataQualityLabel : `${Math.round(data.dataQualityScore)}%`
  const freshness = data.lastRecordAgeMin === null ? null : `${data.lastRecordAgeMin} min`

  return (
    <header className="flex flex-col gap-4 border-b border-border-dim px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex shrink-0 flex-col gap-0.5">
        <span className="text-xs font-semibold tracking-[0.08em] text-signal">NORTHMINE</span>
        <h1 className="font-industrial text-2xl font-semibold tracking-tight text-text-primary">{t.header_title}</h1>
        <p className="text-sm text-text-secondary">{t.header_subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 text-xs text-text-secondary" aria-label={t.header_status_aria}>
        <Badge variant={statusVariant(data.backendStatus)}>
          <ShieldCheck size={13} /> {t.header_backend(operationalStatusLabel(data.backendStatus))}
        </Badge>
        <Badge variant={statusVariant(data.dataSourceStatus)}>
          <Database size={13} /> {dataStatusLabel}
        </Badge>
        <span className="inline-flex items-center gap-1"><Clock3 size={13} /> {dateLabel(data.generatedAt)}</span>
        <span>{t.header_ultimo_registro} <strong className="text-text-primary">{data.lastRealRecordLabel}</strong></span>
        <Badge variant={modeVariant}>
          <Database size={13} /> {modeLabel}
        </Badge>
        <span>{t.header_calidad} <strong className="text-text-primary">{quality}</strong></span>
        {freshness && <span>{t.header_frescura} <strong className="text-text-primary">{freshness}</strong></span>}
        {onDownloadReport && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onDownloadReport}
            aria-label="Descargar informe ejecutivo"
            title="Descargar informe ejecutivo"
            disabled={downloadingReport}
          >
            <Download size={14} className={cn(downloadingReport && 'animate-spin')} />
            <span>{downloadingReport ? 'Generando...' : 'Informe'}</span>
          </Button>
        )}
      </div>
    </header>
  )
}
