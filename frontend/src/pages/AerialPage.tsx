import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileStack, Mail, Map, RefreshCw, ShieldCheck, Truck, ZoomIn, ZoomOut } from 'lucide-react'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import { ExecutiveKpiCard } from '../components/kpi/ExecutiveKpiCard'
import { getAerialFiles, getAerialMailStatus, getAerialPreviewUrl, getAerialStatus, postAerialMailSync } from '../lib/api'
import { FAST_DEMO_AERIAL, FAST_PUBLIC_DEMO } from '../demo/fastDemo'
import { useModuleT } from '../i18n/useModuleT'
import { aerialT } from '../i18n/modules/aerial'

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
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null)

  const previewQuery = useQuery({
    queryKey: ['aerial-preview', fileName],
    queryFn: () => getAerialPreviewUrl(fileName),
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
          ref={containerRef}
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

function DemoOrthomosaicViewer({ fileName }: { fileName: string }) {
  const t = useModuleT(aerialT)
  const [zoom, setZoom] = useState(1)
  const clampZoom = (next: number) => setZoom(Math.min(2.4, Math.max(1, next)))
  const assets = [
    { id: 'CAEX01', x: '20%', y: '56%', tone: '#38BDF8' },
    { id: 'CAEX07', x: '36%', y: '42%', tone: '#4ADE80' },
    { id: 'CAEX12', x: '52%', y: '36%', tone: '#38BDF8' },
    { id: 'CAEX22', x: '64%', y: '54%', tone: '#FBBF24' },
    { id: 'PALA 1', x: '74%', y: '30%', tone: '#A78BFA' },
    { id: 'CF 2', x: '58%', y: '68%', tone: '#F87171' },
  ]

  return (
    <section className="panel">
      <div className="panel-header">
        <div><span className="panel-kicker">{t.viewer_kicker}</span><h2>{t.viewer_title(fileName)}</h2></div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <small style={{ color: 'var(--nm-muted)' }}>Capa demo</small>
          <button className="command-button command-button-secondary" type="button" onClick={() => clampZoom(zoom / 1.25)} disabled={zoom <= 1} aria-label={t.zoom_out_aria}>
            <ZoomOut size={15} />
          </button>
          <span className="panel-tag" style={{ minWidth: 52, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
          <button className="command-button command-button-secondary" type="button" onClick={() => clampZoom(zoom * 1.25)} disabled={zoom >= 2.4} aria-label={t.zoom_in_aria}>
            <ZoomIn size={15} />
          </button>
        </div>
      </div>
      <div
        style={{
          overflow: 'hidden',
          minHeight: 360,
          maxHeight: '68vh',
          borderRadius: 12,
          border: '1px solid rgba(125,211,252,0.16)',
          background: '#07111C',
          position: 'relative',
          isolation: 'isolate',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `scale(${zoom})`,
            transformOrigin: 'center',
            transition: 'transform 180ms ease-out',
            background:
              'radial-gradient(circle at 72% 32%, rgba(167,139,250,0.22), transparent 15%), radial-gradient(circle at 30% 62%, rgba(56,189,248,0.18), transparent 18%), linear-gradient(145deg, #0B1826 0%, #10263A 42%, #182A22 68%, #08121F 100%)',
          }}
        >
          <div style={{ position: 'absolute', inset: '12% 9% 18% 11%', border: '1px solid rgba(125,211,252,0.18)', borderRadius: 999, transform: 'rotate(-15deg)' }} />
          <div style={{ position: 'absolute', left: '10%', right: '12%', top: '54%', height: 3, background: 'linear-gradient(90deg, transparent, rgba(125,211,252,0.55), transparent)', transform: 'rotate(-10deg)' }} />
          <div style={{ position: 'absolute', left: '42%', right: '14%', top: '42%', height: 3, background: 'linear-gradient(90deg, rgba(74,222,128,0.08), rgba(74,222,128,0.45), transparent)', transform: 'rotate(22deg)' }} />
          {assets.map((asset) => (
            <span
              key={asset.id}
              title={asset.id}
              style={{
                position: 'absolute',
                left: asset.x,
                top: asset.y,
                transform: 'translate(-50%, -50%)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 7px',
                borderRadius: 8,
                border: `1px solid ${asset.tone}88`,
                background: 'rgba(4,12,22,0.78)',
                color: asset.tone,
                fontSize: '0.68rem',
                fontWeight: 800,
                boxShadow: `0 0 20px ${asset.tone}33`,
              }}
            >
              <i style={{ width: 8, height: 8, borderRadius: 99, background: asset.tone, boxShadow: `0 0 12px ${asset.tone}` }} />
              {asset.id}
            </span>
          ))}
        </div>
        <div style={{ position: 'absolute', left: 14, bottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="panel-tag">Rajo norte</span>
          <span className="panel-tag">6 activos</span>
          <span className="panel-tag">alta fluidez</span>
        </div>
      </div>
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
        meta="API /api/aerial/status"
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

      {activeImageFile && (
        FAST_PUBLIC_DEMO ? <DemoOrthomosaicViewer fileName={activeImageFile} /> : <OrthomosaicViewer fileName={activeImageFile} />
      )}

      <section className="kpi-grid compact">
        <ExecutiveKpiCard title={t.kpi_status_title} value={status.status.replace(/_/g, ' ')} subtitle={status.viewer_status} trend={status.heavy_tif_loaded ? t.tif_loaded : t.tif_not_loaded} tone={latestImage ? 'amber' : 'slate'} icon={ShieldCheck} />
        <ExecutiveKpiCard title={t.kpi_files_title} value={`${status.files_count}`} subtitle={t.kpi_files_subtitle} trend={latestImage?.extension.toUpperCase() ?? t.kpi_files_trend_none} tone="cyan" icon={FileStack} />
        <ExecutiveKpiCard title={t.kpi_caex_title} value={`${status.equipment_counts.caex ?? 0}`} subtitle={t.kpi_caex_subtitle} trend={t.kpi_caex_trend(status.equipment_counts.palas ?? 0)} tone="green" icon={Truck} />
        <ExecutiveKpiCard title={t.kpi_last_title} value={latestImage?.file_name ?? '-'} subtitle={latestImage ? mb(latestImage.size_mb) : t.kpi_last_subtitle_none} trend={latestImage ? dateLabel(latestImage.updated_at) : t.kpi_last_trend_validating} tone="slate" icon={Map} />
      </section>

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
