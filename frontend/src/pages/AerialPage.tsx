import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Mail, Map, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import { CompactStat, StatCluster } from '../components/kpi/CompactStat'
import { getAerialFiles, getAerialMailStatus, getAerialPreviewUrl, getAerialStatus, postAerialMailSync } from '../lib/api'
import { FAST_DEMO_AERIAL, FAST_PUBLIC_DEMO } from '../demo/fastDemo'
import { useModuleT } from '../i18n/useModuleT'
import { aerialT } from '../i18n/modules/aerial'
import { useAgentWidget } from '../lib/agentRegistry/useAgentWidget'
import type { MapWidgetSnapshot } from '../lib/agentPerception/geoContracts'

function mb(value: number) {
  return `${value.toLocaleString('es-CL', { maximumFractionDigits: 2 })} MB`
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
}

const VIEWER_MIN_ZOOM = 1
const VIEWER_MAX_ZOOM = 6

function OrthomosaicViewer({ fileName }: { fileName: string }) {
  const t = useModuleT(aerialT)
  const [zoom, setZoom] = useState(1)
  const [dragging, setDragging] = useState(false)
  const zoomRef = useRef(1)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null)

  const previewQuery = useQuery({
    queryKey: ['aerial-preview', fileName],
    queryFn: () =>
      FAST_PUBLIC_DEMO
        ? Promise.resolve(`${import.meta.env.BASE_URL}aerial/${fileName.replace(/\.(tif|tiff)$/i, '')}.jpg`)
        : getAerialPreviewUrl(fileName),
    staleTime: Infinity,
    // La primera generacion del JPEG desde el TIF puede tardar unos segundos.
    retry: 1,
  })

  useEffect(() => {
    const url = previewQuery.data
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [previewQuery.data])

  // Contrato semantico Etapa 5 (Vista Aerea): este widget es un visor de
  // imagen (zoom/pan sobre el JPEG generado del ortomosaico), NO un mapa
  // Leaflet georreferenciado - `geo` va null a proposito (ver geoContracts.ts).
  // No hay coordenadas de equipo que exponer todavia en esta vista.
  const { ref: widgetRef } = useAgentWidget({
    id: 'aerial-orthomosaic-viewer',
    moduleId: 'aerea',
    type: 'map',
    label: 'Visor de ortomosaico',
    description: 'Imagen orthomosaico del rajo con zoom/pan bajo demanda.',
    supportedActions: ['navigate', 'focus_widget', 'explain_widget'],
    getSnapshot: (): MapWidgetSnapshot => {
      const loaded = Boolean(previewQuery.data)
      const zoomPercent = Math.round(zoomRef.current * 100)
      return {
        widgetId: 'aerial-orthomosaic-viewer',
        type: 'map',
        label: 'Visor de ortomosaico',
        updatedAt: new Date().toISOString(),
        geo: null,
        activeFileName: fileName,
        imageZoomPercent: zoomPercent,
        freshnessStatus: previewQuery.isError ? 'unknown' : 'current',
        qualityStatus: loaded ? 'high' : 'unknown',
        semanticSummary: previewQuery.isLoading
          ? `Visor de ortomosaico: generando vista previa de ${fileName}.`
          : previewQuery.isError
            ? `Visor de ortomosaico: no se pudo cargar la vista previa de ${fileName}.`
            : `Visor de ortomosaico: mostrando ${fileName} al ${zoomPercent}% de zoom.`,
      }
    },
  })

  // Zoom manteniendo fijo el punto bajo el cursor: se recalcula el scroll del
  // contenedor en proporcion al cambio de escala.
  const applyZoom = (next: number, clientX?: number, clientY?: number) => {
    const container = containerRef.current
    const clamped = Math.min(VIEWER_MAX_ZOOM, Math.max(VIEWER_MIN_ZOOM, next))
    const previous = zoomRef.current
    if (clamped === previous) return
    if (container) {
      const rect = container.getBoundingClientRect()
      const pointX = (clientX ?? rect.left + rect.width / 2) - rect.left
      const pointY = (clientY ?? rect.top + rect.height / 2) - rect.top
      const ratio = clamped / previous
      pendingScrollRef.current = {
        left: (container.scrollLeft + pointX) * ratio - pointX,
        top: (container.scrollTop + pointY) * ratio - pointY,
      }
    }
    zoomRef.current = clamped
    setZoom(clamped)
  }

  useLayoutEffect(() => {
    const container = containerRef.current
    const pending = pendingScrollRef.current
    if (container && pending) {
      container.scrollLeft = pending.left
      container.scrollTop = pending.top
      pendingScrollRef.current = null
    }
  }, [zoom])

  // Rueda del mouse = zoom (listener nativo no-pasivo para poder anular el
  // scroll de la pagina dentro del visor).
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const factor = event.deltaY < 0 ? 1.18 : 1 / 1.18
      applyZoom(zoomRef.current * factor, event.clientX, event.clientY)
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [previewQuery.data])

  // Arrastre para mover la imagen (pan).
  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const drag = dragRef.current
      const container = containerRef.current
      if (!drag || !container) return
      container.scrollLeft = drag.left - (event.clientX - drag.x)
      container.scrollTop = drag.top - (event.clientY - drag.y)
    }
    const onUp = () => {
      dragRef.current = null
      setDragging(false)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const startDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const container = containerRef.current
    if (!container) return
    dragRef.current = { x: event.clientX, y: event.clientY, left: container.scrollLeft, top: container.scrollTop }
    setDragging(true)
    event.preventDefault()
  }

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (zoomRef.current >= VIEWER_MAX_ZOOM) {
      applyZoom(VIEWER_MIN_ZOOM)
    } else {
      applyZoom(zoomRef.current * 2, event.clientX, event.clientY)
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div><span className="panel-kicker">{t.viewer_kicker}</span><h2>{t.viewer_title(fileName)}</h2></div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <small style={{ color: 'var(--nm-muted)' }}>{t.viewer_hint}</small>
          <button className="command-button command-button-secondary" type="button" onClick={() => applyZoom(zoomRef.current / 1.5)} disabled={zoom <= VIEWER_MIN_ZOOM} aria-label={t.zoom_out_aria}>
            <ZoomOut size={15} />
          </button>
          <span className="panel-tag" style={{ minWidth: 52, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
          <button className="command-button command-button-secondary" type="button" onClick={() => applyZoom(zoomRef.current * 1.5)} disabled={zoom >= VIEWER_MAX_ZOOM} aria-label={t.zoom_in_aria}>
            <ZoomIn size={15} />
          </button>
        </div>
      </div>
      {previewQuery.isLoading && (
        <EmptyState title={t.generating_preview} />
      )}
      {previewQuery.isError && (
        <EmptyState title={t.preview_error} />
      )}
      {previewQuery.data && (
        <div
          ref={(node) => {
            containerRef.current = node
            widgetRef(node)
          }}
          onMouseDown={startDrag}
          onDoubleClick={handleDoubleClick}
          style={{
            overflow: 'auto',
            maxHeight: '72vh',
            borderRadius: 12,
            border: '1px solid rgba(125,211,252,0.16)',
            background: '#08121F',
            cursor: dragging ? 'grabbing' : 'grab',
            scrollbarWidth: 'thin',
            overscrollBehavior: 'contain',
          }}
        >
          <img
            src={previewQuery.data}
            alt={t.orthomosaic_alt(fileName)}
            draggable={false}
            style={{ width: `${zoom * 100}%`, display: 'block', userSelect: 'none' }}
          />
        </div>
      )}
    </section>
  )
}

export function AerialPage() {
  const t = useModuleT(aerialT)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['stage17-aerial'],
    queryFn: async () => {
      const [status, files, mailStatus] = await Promise.all([
        getAerialStatus(),
        getAerialFiles(),
        getAerialMailStatus().catch(() => null),
      ])
      return { status, files, mailStatus }
    },
    enabled: !FAST_PUBLIC_DEMO,
    initialData: FAST_PUBLIC_DEMO ? FAST_DEMO_AERIAL : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: FAST_PUBLIC_DEMO ? Infinity : 120000,
    gcTime: FAST_PUBLIC_DEMO ? Infinity : 30 * 60000,
    refetchInterval: FAST_PUBLIC_DEMO ? false : 120000,
  })

  const handleSync = async () => {
    setSyncing(true)
    setSyncMessage(null)
    if (FAST_PUBLIC_DEMO) {
      setSyncMessage('Demo rapido: sincronizacion simulada, sin descargar ortomosaicos pesados.')
      setSyncing(false)
      return
    }
    try {
      const result = await postAerialMailSync()
      const downloaded = [...result.drive.imported_files, ...result.mail.imported_files]
      if (result.drive.status === 'error') {
        setSyncMessage(result.drive.detail ?? t.drive_error_default)
      } else if (downloaded.length) {
        setSyncMessage(t.files_downloaded(downloaded.length, downloaded.map((file) => file.filename).join(', ')))
      } else {
        const detail = result.drive.checked?.length ? t.checked_suffix(result.drive.checked[0]) : ''
        setSyncMessage(t.no_new_files(detail))
      }
      await query.refetch()
    } catch {
      setSyncMessage(t.sync_failed)
    } finally {
      setSyncing(false)
    }
  }

  if (!FAST_PUBLIC_DEMO && query.isLoading) return <LoadingState label={t.loading_label} />
  if (query.isError || !query.data) return <ErrorState detail={t.error_detail} onRetry={() => query.refetch()} />

  const { status, files } = query.data
  const latest = status.latest_file
  const imageExtensions = new Set(['tif', 'tiff', 'jpg', 'jpeg', 'png', 'jp2', 'ecw'])
  const imageFiles = files.items.filter((item) => imageExtensions.has(item.extension.toLowerCase()))
  const latestImage = imageFiles.find((item) => item.file_name === latest?.file_name) ?? imageFiles[0] ?? null
  const activeImageFile = imageFiles.find((item) => item.file_name === selectedFile)?.file_name ?? latestImage?.file_name ?? null

  return (
    <div className="module-page">
      <ModuleHeader
        icon={Map}
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          <>
            <span className="panel-tag">
              <Mail size={12} style={{ verticalAlign: 'text-top', marginRight: 4 }} />
              {query.data?.mailStatus?.drive_configured
                ? t.drive_connected
                : t.drive_not_configured}
            </span>
            {query.data?.mailStatus?.auto_sync?.enabled && (
              <span className="panel-tag" style={{ borderColor: 'rgba(74,222,128,0.5)', color: '#4ADE80' }}>
                {t.auto_sync(
                  query.data.mailStatus.auto_sync.interval_min,
                  query.data.mailStatus.auto_sync.last_run
                    ? t.auto_sync_last_run_suffix(query.data.mailStatus.auto_sync.last_run.slice(11, 16))
                    : '',
                )}
              </span>
            )}
            <button className="command-button" type="button" onClick={handleSync} disabled={syncing}>
              <RefreshCw size={15} /> {syncing ? t.syncing : t.sync_button}
            </button>
          </>
        }
      />

      {syncMessage && (
        <p style={{ color: 'var(--nm-muted)', fontSize: '0.84rem', margin: '0 0 8px' }}>{syncMessage}</p>
      )}

      {imageFiles.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0 0 10px' }}>
          {imageFiles.map((item) => {
            const isActive = activeImageFile === item.file_name
            return (
              <button
                key={item.file_name}
                type="button"
                className={`command-button command-button-secondary nm-avr-filter-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => setSelectedFile(item.file_name)}
              >
                {item.file_name.replace(/\.tiff?$/i, '')}
              </button>
            )
          })}
        </div>
      )}

      {activeImageFile && <OrthomosaicViewer fileName={activeImageFile} />}

      <StatCluster title={t.kpi_cluster_title}>
        <CompactStat label={t.kpi_status_title} value={status.status.replace(/_/g, ' ')} meta={`${status.viewer_status} · ${status.heavy_tif_loaded ? t.tif_loaded : t.tif_not_loaded}`} tone={latestImage ? 'amber' : 'slate'} />
        <CompactStat label={t.kpi_files_title} value={status.files_count} meta={`${t.kpi_files_subtitle} · ${latestImage?.extension.toUpperCase() ?? t.kpi_files_trend_none}`} tone="cyan" />
        <CompactStat label={t.kpi_caex_title} value={status.equipment_counts.caex ?? 0} meta={`${t.kpi_caex_subtitle} · ${t.kpi_caex_trend(status.equipment_counts.palas ?? 0)}`} tone="green" />
        <CompactStat label={t.kpi_last_title} value={latestImage?.file_name ?? '-'} meta={`${latestImage ? mb(latestImage.size_mb) : t.kpi_last_subtitle_none} · ${latestImage ? dateLabel(latestImage.updated_at) : t.kpi_last_trend_validating}`} tone="slate" />
      </StatCluster>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header"><div><span className="panel-kicker">{t.orthomosaic_kicker}</span><h2>{t.last_file_available}</h2></div><span className="panel-tag">{status.status}</span></div>
          {latestImage ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>{t.file_label}</strong><span>{latestImage.file_name}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>{t.format_label}</strong><span>{latestImage.extension.toUpperCase()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>{t.size_label}</strong><span>{mb(latestImage.size_mb)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>{t.date_label}</strong><span>{dateLabel(latestImage.updated_at)}</span></div>
              <div className="alert-sim-hint" style={{ marginTop: 10 }}><span>{t.heavy_viewer_hint}</span></div>
            </div>
          ) : <EmptyState title={t.no_operational_data} />}
        </div>

        <div className="panel">
          <div className="panel-header"><div><span className="panel-kicker">{t.coverage_kicker}</span><h2>{t.layer_status}</h2></div><span className="panel-tag">{status.faena}</span></div>
          {Object.entries(status.equipment_counts).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <strong>{key.toUpperCase()}</strong><span>{value}</span>
            </div>
          ))}
          <div className="alert-sim-hint" style={{ marginTop: 14 }}><span>{t.no_internal_routes_hint}</span></div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header"><div><span className="panel-kicker">{t.files_kicker}</span><h2>{t.files_metadata}</h2></div><span className="panel-tag">{files.count}</span></div>
        {!files.items.length ? <EmptyState title={t.no_operational_data} /> : files.items.map((item) => (
          <article key={`${item.file_name}-${item.updated_at}`} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 140px 150px', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <strong>{item.file_name}</strong><span>{item.extension.toUpperCase()}</span><span>{mb(item.size_mb)}</span><span>{dateLabel(item.updated_at)}</span>
          </article>
        ))}
      </section>
    </div>
  )
}
