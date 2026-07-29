import 'leaflet/dist/leaflet.css'
import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Map } from 'lucide-react'
import { apiFetch } from '../lib/api'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { EquipmentDetailDrawer } from '../components/equipment/detail/EquipmentDetailDrawer'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Pala   { id: string; lat: number; lng: number; estado: string; ton_turno: number; ciclos: number; ruta: string }
interface Caex   { id: string; lat: number; lng: number; estado: string; ton_turno: number; ciclos: number }
interface Botadero { id: string; lat: number; lng: number; nombre: string }
interface AereaData {
  faena: string
  centro: { lat: number; lng: number }
  palas: Pala[]; caex: Caex[]; botaderos: Botadero[]
}

// ── SVG DivIcon factories ─────────────────────────────────────────────────────
const statusColor = {
  ACTIVO:        { border: '#00FF88', bg: 'rgba(0,255,136,0.15)' },
  OBSERVACION:   { border: '#FFD100', bg: 'rgba(255,209,0,0.15)' },
  SIN_ACTIVIDAD: { border: '#FFD100', bg: 'rgba(255,209,0,0.10)' },
  MANTENCION:    { border: '#FF2D55', bg: 'rgba(255,45,85,0.10)' },
  DEMORA:        { border: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.05)' },
} as const

function makePalaIcon(estado: string) {
  const c = statusColor[estado as keyof typeof statusColor] ?? statusColor.ACTIVO
  return L.divIcon({
    html: `<div style="width:44px;height:44px;border:2px solid ${c.border};background:${c.bg};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;backdrop-filter:blur(4px);box-shadow:0 0 14px ${c.border}44;">⛏</div>`,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
  })
}

function makeCaexIcon(estado: string) {
  const c = statusColor[estado as keyof typeof statusColor] ?? statusColor.ACTIVO
  return L.divIcon({
    html: `<div style="width:28px;height:28px;border:1.5px solid ${c.border};background:${c.bg};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:13px;backdrop-filter:blur(3px);">🚛</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

const botaderoIcon = L.divIcon({
  html: `<div style="width:36px;height:36px;border:2px solid #FF6B00;background:rgba(255,107,0,0.15);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:17px;backdrop-filter:blur(3px);">⛰</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
})

// ── Map resizer on container change ──────────────────────────────────────────
function MapResizer() {
  const map = useMap()
  useEffect(() => { setTimeout(() => map.invalidateSize(), 200) }, [map])
  return null
}

// ── Main component ────────────────────────────────────────────────────────────
type LayerFilter = 'todos' | 'caex' | 'palas'

export function AerialView() {
  const [data, setData] = useState<AereaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [layerFilter, setLayerFilter] = useState<LayerFilter>('todos')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [drawerEquipId, setDrawerEquipId] = useState<string | null>(null)
  const [caexPositions, setCaexPositions] = useState<Caex[]>([])

  const load = useCallback(async () => {
    try {
      const result = await apiFetch<AereaData>('/api/aerea/equipos')
      setData(result)
      setCaexPositions(result.caex)
      setHasError(false)
    } catch {
      setHasError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh: jitter CAEX positions ±0.001
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      setCaexPositions(prev => prev.map(c => ({
        ...c,
        lat: c.lat + (Math.random() - 0.5) * 0.002,
        lng: c.lng + (Math.random() - 0.5) * 0.002,
      })))
    }, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  if (loading) return <LoadingState label="Cargando vista aérea..." />
  if (hasError || !data) return <ErrorState detail="No se pudo cargar /api/aerea/equipos." />

  const counts = {
    activos:       caexPositions.filter(c => c.estado === 'ACTIVO').length,
    sinActividad:  caexPositions.filter(c => c.estado === 'SIN_ACTIVIDAD').length,
    mantencion:    caexPositions.filter(c => c.estado === 'MANTENCION').length,
    demora:        caexPositions.filter(c => c.estado === 'DEMORA').length,
  }

  const showCaex  = layerFilter !== 'palas'
  const showPalas = layerFilter !== 'caex'

  return (
    <>
      <div className="module-page">
        <ModuleHeader
          icon={Map}
          eyebrow="Vista Aérea"
          title={`Faena ${data.faena}`}
          description={`${data.palas.length} palas · ${data.caex.length} CAEX · ${data.botaderos.length} botaderos`}
          meta="Metadata real disponible; posiciones en vivo no configuradas"
        />

        <div style={{ position: 'relative', height: 'calc(100vh - 220px)', minHeight: 500, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--nm-border)' }}>
          <MapContainer
            center={[data.centro.lat, data.centro.lng]}
            zoom={14}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            <MapResizer />
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
              subdomains="abcd"
              maxZoom={20}
            />

            {/* Botaderos */}
            {data.botaderos.map(b => (
              <Marker key={b.id} position={[b.lat, b.lng]} icon={botaderoIcon}>
                <Popup className="nm-popup">
                  <strong>{b.id}</strong><br />{b.nombre}
                </Popup>
              </Marker>
            ))}

            {/* Palas */}
            {showPalas && data.palas.map(p => (
              <Marker
                key={p.id}
                position={[p.lat, p.lng]}
                icon={makePalaIcon(p.estado)}
                eventHandlers={{ click: () => setDrawerEquipId(p.id) }}
              >
                <Popup className="nm-popup">
                  <strong>{p.id}</strong> · {p.estado}<br />
                  {p.ton_turno.toLocaleString('es-CL')} t · {p.ciclos} ciclos
                </Popup>
              </Marker>
            ))}

            {/* CAEX */}
            {showCaex && caexPositions.map(c => (
              <Marker
                key={c.id}
                position={[c.lat, c.lng]}
                icon={makeCaexIcon(c.estado)}
                eventHandlers={{ click: () => setDrawerEquipId(c.id) }}
              >
                <Popup className="nm-popup">
                  <strong>{c.id}</strong> · {c.estado}<br />
                  {c.ton_turno.toLocaleString('es-CL')} t
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* ── Panel lateral ── */}
          <div style={{
            position: 'absolute', top: 12, right: 12, zIndex: 1000,
            width: 200,
            background: 'rgba(2,4,3,0.88)',
            border: '1px solid rgba(57,255,20,0.18)',
            borderRadius: 8,
            padding: '12px 14px',
            backdropFilter: 'blur(12px)',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {/* Leyenda */}
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,212,255,0.7)', marginBottom: 2 }}>
              Estado flota
            </div>
            {[
              { emoji: '🟢', label: 'Activos',    count: counts.activos },
              { emoji: '🟡', label: 'Sin act.',   count: counts.sinActividad },
              { emoji: '🔴', label: 'Mantención', count: counts.mantencion },
              { emoji: '⚫', label: 'Demora',     count: counts.demora },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--nm-muted)' }}>
                <span>{row.emoji} {row.label}</span>
                <strong style={{ color: 'var(--nm-text)', fontFamily: '"JetBrains Mono",monospace' }}>{row.count}</strong>
              </div>
            ))}

            <div style={{ height: 1, background: 'rgba(57,255,20,0.12)', margin: '2px 0' }} />

            {/* Selector de capa */}
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(0,212,255,0.7)', marginBottom: 2 }}>
              Capas
            </div>
            {(['todos', 'caex', 'palas'] as LayerFilter[]).map(layer => (
              <button
                key={layer}
                type="button"
                style={{
                  textAlign: 'left', border: 'none', background: 'transparent',
                  color: layerFilter === layer ? 'var(--nm-green)' : 'var(--nm-muted)',
                  fontSize: 12, cursor: 'pointer', padding: 0, fontWeight: layerFilter === layer ? 800 : 400,
                }}
                onClick={() => setLayerFilter(layer)}
              >
                {layerFilter === layer ? '● ' : '○ '}
                {{ todos: 'Todos', caex: 'Solo CAEX', palas: 'Solo Palas' }[layer]}
              </button>
            ))}

            <div style={{ height: 1, background: 'rgba(57,255,20,0.12)', margin: '2px 0' }} />

            {/* Auto-refresh toggle */}
            <button
              type="button"
              style={{
                border: `1px solid ${autoRefresh ? 'rgba(57,255,20,0.38)' : 'rgba(245,255,250,0.1)'}`,
                borderRadius: 6, padding: '5px 8px',
                background: autoRefresh ? 'rgba(57,255,20,0.07)' : 'transparent',
                color: autoRefresh ? 'var(--nm-green)' : 'var(--nm-muted)',
                fontSize: 11, cursor: 'pointer', fontWeight: 800,
              }}
              onClick={() => setAutoRefresh(v => !v)}
            >
              {autoRefresh ? '⏸ Auto-refresh ON' : '▶ Auto-refresh OFF'}
            </button>
          </div>
        </div>
      </div>

      <EquipmentDetailDrawer
        equipmentId={drawerEquipId}
        open={Boolean(drawerEquipId)}
        onClose={() => setDrawerEquipId(null)}
      />
    </>
  )
}
