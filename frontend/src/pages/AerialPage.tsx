import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileStack, Mail, Map, RefreshCw, ShieldCheck, Truck, ZoomIn, ZoomOut } from 'lucide-react'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import { ExecutiveKpiCard } from '../components/kpi/ExecutiveKpiCard'
import { getAerialFiles, getAerialMailStatus, getAerialPreviewUrl, getAerialStatus, postAerialMailSync } from '../lib/api'

function mb(value: number) {
  return `${value.toLocaleString('es-CL', { maximumFractionDigits: 2 })} MB`
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
}

const VIEWER_MIN_ZOOM = 1
const VIEWER_MAX_ZOOM = 6

function OrthomosaicViewer({ fileName }: { fileName: string }) {
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
        <div><span className="panel-kicker">Visor</span><h2>Ortomosaico {fileName}</h2></div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <small style={{ color: 'var(--nm-muted)' }}>Rueda: zoom / Arrastrar: mover / Doble clic: acercar</small>
          <button className="command-button command-button-secondary" type="button" onClick={() => applyZoom(zoomRef.current / 1.5)} disabled={zoom <= VIEWER_MIN_ZOOM} aria-label="Alejar">
            <ZoomOut size={15} />
          </button>
          <span className="panel-tag" style={{ minWidth: 52, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
          <button className="command-button command-button-secondary" type="button" onClick={() => applyZoom(zoomRef.current * 1.5)} disabled={zoom >= VIEWER_MAX_ZOOM} aria-label="Acercar">
            <ZoomIn size={15} />
          </button>
        </div>
      </div>
      {previewQuery.isLoading && (
        <EmptyState title="Generando vista previa del TIF... la primera vez puede tardar unos segundos." />
      )}
      {previewQuery.isError && (
        <EmptyState title="No se pudo generar la vista previa. Reintenta recargando la pagina." />
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
            alt={`Ortomosaico ${fileName}`}
            draggable={false}
            style={{ width: `${zoom * 100}%`, display: 'block', userSelect: 'none' }}
          />
        </div>
      )}
    </section>
  )
}

export function AerialPage() {
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
    refetchInterval: 120000,
  })

  const handleSync = async () => {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const result = await postAerialMailSync()
      const downloaded = [...result.drive.imported_files, ...result.mail.imported_files]
      if (result.drive.status === 'error') {
        setSyncMessage(result.drive.detail ?? 'Error al revisar la carpeta Drive.')
      } else if (downloaded.length) {
        setSyncMessage(`${downloaded.length} archivo(s) descargados: ${downloaded.map((file) => file.filename).join(', ')}`)
      } else {
        const detail = result.drive.checked?.length ? ` (${result.drive.checked[0]})` : ''
        setSyncMessage(`Sin ortomosaicos nuevos en la carpeta Drive${detail}.`)
      }
      await query.refetch()
    } catch {
      setSyncMessage('No se pudo sincronizar. Reintenta.')
    } finally {
      setSyncing(false)
    }
  }

  if (query.isLoading) return <LoadingState label="Cargando estado aereo..." />
  if (query.isError || !query.data) return <ErrorState detail="No se pudo cargar el modulo de vista aerea." />

  const { status, files } = query.data
  const latest = status.latest_file

  return (
    <div className="module-page">
      <ModuleHeader
        icon={Map}
        eyebrow="Vista Aerea"
        title="Ortomosaicos y cobertura operacional"
        description="Primera iteracion metadata-only para evitar cargar TIF pesados en frontend."
        meta="API /api/aerial/status"
        actions={
          <>
            <span className="panel-tag">
              <Mail size={12} style={{ verticalAlign: 'text-top', marginRight: 4 }} />
              {query.data?.mailStatus?.drive_configured
                ? 'Drive vuelos: conectado'
                : 'Drive sin configurar'}
            </span>
            {query.data?.mailStatus?.auto_sync?.enabled && (
              <span className="panel-tag" style={{ borderColor: 'rgba(74,222,128,0.5)', color: '#4ADE80' }}>
                Auto cada {query.data.mailStatus.auto_sync.interval_min} min
                {query.data.mailStatus.auto_sync.last_run
                  ? ` / ultima ${query.data.mailStatus.auto_sync.last_run.slice(11, 16)}`
                  : ''}
              </span>
            )}
            <button className="command-button" type="button" onClick={handleSync} disabled={syncing}>
              <RefreshCw size={15} /> {syncing ? 'Sincronizando...' : 'Buscar ortomosaico'}
            </button>
          </>
        }
      />

      {syncMessage && (
        <p style={{ color: 'var(--nm-muted)', fontSize: '0.84rem', margin: '0 0 8px' }}>{syncMessage}</p>
      )}

      {files.items.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0 0 10px' }}>
          {files.items.map((item) => {
            const isActive = (selectedFile ?? latest?.file_name) === item.file_name
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

      {(selectedFile ?? latest?.file_name) && (
        <OrthomosaicViewer fileName={selectedFile ?? latest!.file_name} />
      )}

      <section className="kpi-grid compact">
        <ExecutiveKpiCard title="Estado" value={status.status.replace(/_/g, ' ')} subtitle={status.viewer_status} trend={status.heavy_tif_loaded ? 'TIF cargado' : 'TIF no cargado'} tone={latest ? 'amber' : 'slate'} icon={ShieldCheck} />
        <ExecutiveKpiCard title="Archivos" value={`${status.files_count}`} subtitle="Ortomosaicos detectados" trend={latest?.extension.toUpperCase() ?? 'sin archivo'} tone="cyan" icon={FileStack} />
        <ExecutiveKpiCard title="CAEX" value={`${status.equipment_counts.caex ?? 0}`} subtitle="Cobertura operacional" trend={`${status.equipment_counts.palas ?? 0} palas`} tone="green" icon={Truck} />
        <ExecutiveKpiCard title="Ultimo" value={latest?.file_name ?? '-'} subtitle={latest ? mb(latest.size_mb) : 'Sin ortomosaico'} trend={latest ? dateLabel(latest.updated_at) : 'en validacion'} tone="slate" icon={Map} />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header"><div><span className="panel-kicker">Ortomosaico</span><h2>Ultimo archivo disponible</h2></div><span className="panel-tag">{status.status}</span></div>
          {latest ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>Archivo</strong><span>{latest.file_name}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>Formato</strong><span>{latest.extension.toUpperCase()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>Tamano</strong><span>{mb(latest.size_mb)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>Fecha</strong><span>{dateLabel(latest.updated_at)}</span></div>
              <div className="alert-sim-hint" style={{ marginTop: 10 }}><span>Visor pesado en validacion. Estado actual: metadata-only.</span></div>
            </div>
          ) : <EmptyState title="Sin datos suficientes para evaluacion operacional" />}
        </div>

        <div className="panel">
          <div className="panel-header"><div><span className="panel-kicker">Cobertura</span><h2>Estado de capas</h2></div><span className="panel-tag">{status.faena}</span></div>
          {Object.entries(status.equipment_counts).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <strong>{key.toUpperCase()}</strong><span>{value}</span>
            </div>
          ))}
          <div className="alert-sim-hint" style={{ marginTop: 14 }}><span>No se exponen rutas internas del servidor al frontend.</span></div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header"><div><span className="panel-kicker">Archivos</span><h2>Metadatos disponibles</h2></div><span className="panel-tag">{files.count}</span></div>
        {!files.items.length ? <EmptyState title="Sin datos suficientes para evaluacion operacional" /> : files.items.map((item) => (
          <article key={`${item.file_name}-${item.updated_at}`} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 140px 150px', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <strong>{item.file_name}</strong><span>{item.extension.toUpperCase()}</span><span>{mb(item.size_mb)}</span><span>{dateLabel(item.updated_at)}</span>
          </article>
        ))}
      </section>
    </div>
  )
}
