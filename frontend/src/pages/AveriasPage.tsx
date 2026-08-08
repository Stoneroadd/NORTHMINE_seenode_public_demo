import { Fragment, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useAgentWidget } from '../lib/agentRegistry/useAgentWidget'
import { useAgentEntityHandler } from '../lib/agentRegistry/useAgentEntityHandler'
import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, ChevronDown, Clock, CircleDollarSign, Gauge, Mail, RefreshCw, ShieldAlert, Timer, Upload, Wrench } from 'lucide-react'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import { ExecutiveKpiCard } from '../components/kpi/ExecutiveKpiCard'
import { formatMoney } from '../components/cockpit/cockpitModel'
import { useModuleT } from '../i18n/useModuleT'
import { averiasT, type AveriasT } from '../i18n/modules/averias'
import {
  getAveriasFleetDetail,
  getAveriasHistory,
  getAveriasInsights,
  getAveriasMailStatus,
  getAveriasSummary,
  postAveriasMailSync,
  uploadAveriasXls,
  type ActiveBreakdownItem,
} from '../lib/api'
import {
  FAST_DEMO_AVERIAS_FLEET,
  FAST_DEMO_AVERIAS_HISTORY,
  FAST_DEMO_AVERIAS_INSIGHTS,
  FAST_DEMO_AVERIAS_SUMMARY,
  FAST_PUBLIC_DEMO,
} from '../demo/fastDemo'

function costFormatRate(value: number) {
  return value.toLocaleString('es-CL', { maximumFractionDigits: 2 })
}

function minutes(value: number) {
  if (value < 60) return `${value} min`
  return `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, '0')}m`
}

// "2026-07-14" o "2026-07-14T08:30" -> "14-07-2026" / "14-07-2026 08:30"
function formatFecha(value?: string | null): string {
  if (!value) return '-'
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-')
  if (!year || !month || !day) return value
  const base = `${day}-${month}-${year}`
  return timePart ? `${base} ${timePart.slice(0, 5)}` : base
}

function severityClass(severity: string) {
  const normalized = severity.toLowerCase()
  if (normalized.includes('crit')) return 'critical'
  if (normalized.includes('alta') || normalized.includes('high')) return 'warning'
  return 'success'
}

// Categorias de evento del reporte ESTATUS DIARIO, con color propio:
// averia (Averia propia / Continuacion), programada (M. Planificado),
// mantencion (Mantenimiento diario), operacional (Dano Operacional),
// externa (Averia otro).
const TIPO_CATEGORIES: Record<string, { color: string }> = {
  averia: { color: '#F87171' },
  programada: { color: '#38BDF8' },
  mantencion: { color: '#4ADE80' },
  operacional: { color: '#FBBF24' },
  externa: { color: '#A78BFA' },
  otro: { color: '#94A3B8' },
}

function tipoLabel(t: AveriasT, key: string): string {
  const labels: Record<string, string> = {
    averia: t.tipo_averia_propia,
    programada: t.tipo_mant_programada,
    mantencion: t.tipo_mant_diario,
    operacional: t.tipo_dano_operacional,
    externa: t.tipo_averia_otro,
    otro: t.tipo_otro,
  }
  return labels[key] ?? key
}

function tipoCategory(tipo?: string | null): keyof typeof TIPO_CATEGORIES {
  const normalized = (tipo ?? '').toUpperCase()
  if (normalized.includes('AVER') && normalized.includes('OTRO')) return 'externa'
  if (normalized.includes('AVER')) return 'averia'
  if (normalized.includes('PLANIFICADO') || normalized.includes('PROGRAMADA')) return 'programada'
  if (normalized.includes('MANTENIMIENTO') || normalized.includes('MANTENCION')) return 'mantencion'
  if (normalized.includes('OPERACIONAL') || normalized.includes('DANO') || normalized.includes('DAÑO')) return 'operacional'
  return 'otro'
}

function tipoColor(tipo?: string | null): string {
  return TIPO_CATEGORIES[tipoCategory(tipo)].color
}

function TipoChip({ tipo, suffix, t }: { tipo?: string | null; suffix?: string; t: AveriasT }) {
  const color = tipoColor(tipo)
  return (
    <span
      className="panel-tag"
      style={{ borderColor: color, color, background: `${color}1A` }}
    >
      {tipo ?? t.sin_tipo}{suffix ? ` ${suffix}` : ''}
    </span>
  )
}

function EstadoChip({ estado }: { estado: string }) {
  const isFs = estado.toUpperCase().replace('/', '') === 'FS'
  const color = isFs ? '#F87171' : '#4ADE80'
  return (
    <span className="panel-tag" style={{ borderColor: color, color, background: `${color}1A`, fontWeight: 700 }}>
      {isFs ? 'F/S' : 'OP'}
    </span>
  )
}

function EventCard({ item, t }: { item: ActiveBreakdownItem; t: AveriasT }) {
  const tone = severityClass(item.severity)
  return (
    <article className={`operational-alert-row shift-state-${tone}`} style={{ marginBottom: 10 }}>
      <div>
        <h3>{item.equipment_id}</h3>
        <p>{item.description}</p>
        <small>{item.model ?? t.equipo_fallback} / {minutes(item.duration_min)} / {item.last_activity ?? t.sin_timestamp}</small>
      </div>
      <span className="panel-tag">{item.severity}</span>
    </article>
  )
}

function HBar({ label, min, max, color, index = 0, costRate }: { label: string; min: number; max: number; color: string; index?: number; costRate?: number }) {
  return (
    <div className="nm-avr-hbar">
      <small title={label}>{label}</small>
      <span className="nm-avr-hbar-track">
        <i
          className="nm-avr-hbar-fill"
          style={{
            width: `${Math.min(100, (min / Math.max(max, 1)) * 100)}%`,
            '--c': color,
            '--d': `${index * 70}ms`,
          } as CSSProperties}
        />
      </span>
      <small className="nm-avr-hbar-value">
        {minutes(Math.round(min))}{costRate ? ` · ${formatMoney(Math.round(min * costRate))}` : ''}
      </small>
    </div>
  )
}

type TipoFilterValue = 'todos' | keyof typeof TIPO_CATEGORIES

export function AveriasPage() {
  const t = useModuleT(averiasT)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [days, setDays] = useState(31)
  const [tipoFilter, setTipoFilter] = useState<TipoFilterValue>('todos')
  const [modelFilter, setModelFilter] = useState<string>('todos')
  const [sistemaFilter, setSistemaFilter] = useState<string>('todos')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [openInsight, setOpenInsight] = useState<string | null>(null)

  const fleetQuery = useQuery({
    queryKey: ['averias-fleet-detail', days],
    queryFn: async () => {
      const [detail, mailStatus] = await Promise.all([getAveriasFleetDetail(days), getAveriasMailStatus()])
      return { detail, mailStatus }
    },
    enabled: !FAST_PUBLIC_DEMO,
    initialData: FAST_PUBLIC_DEMO ? FAST_DEMO_AVERIAS_FLEET : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: FAST_PUBLIC_DEMO ? Infinity : 120000,
    gcTime: FAST_PUBLIC_DEMO ? Infinity : 30 * 60000,
    refetchInterval: FAST_PUBLIC_DEMO ? false : 120000,
  })

  const insightsQuery = useQuery({
    queryKey: ['averias-insights', days],
    queryFn: () => getAveriasInsights(days),
    enabled: !FAST_PUBLIC_DEMO,
    initialData: FAST_PUBLIC_DEMO ? FAST_DEMO_AVERIAS_INSIGHTS : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: FAST_PUBLIC_DEMO ? Infinity : 300000,
    gcTime: FAST_PUBLIC_DEMO ? Infinity : 30 * 60000,
    refetchInterval: FAST_PUBLIC_DEMO ? false : 300000,
  })

  const chartData = useMemo(() => {
    const events = fleetQuery.data?.detail.events ?? []
    const needle = search.trim().toUpperCase()
    const filtered = events.filter((event) =>
      (tipoFilter === 'todos' || tipoCategory(event.tipo) === tipoFilter)
      && (modelFilter === 'todos' || (event.model ?? t.sin_modelo) === modelFilter)
      && (sistemaFilter === 'todos' || (event.sistema ?? t.sin_sistema) === sistemaFilter)
      && (!needle
        || event.equipment_id.toUpperCase().includes(needle)
        || (event.model ?? '').toUpperCase().includes(needle)
        || (event.sistema ?? '').toUpperCase().includes(needle)
        || (event.descripcion ?? '').toUpperCase().includes(needle)))
    const accumulate = (map: Map<string, number>, key: string, value: number) => map.set(key, (map.get(key) ?? 0) + value)
    const bySystem = new Map<string, number>()
    const byModel = new Map<string, number>()
    const byTipo = new Map<string, number>()
    const byMonth = new Map<string, number>()
    for (const event of filtered) {
      const eventMinutes = event.duracion_min ?? 0
      accumulate(bySystem, event.sistema ?? t.sin_sistema, eventMinutes)
      accumulate(byModel, event.model ?? t.sin_modelo, eventMinutes)
      accumulate(byTipo, tipoCategory(event.tipo), eventMinutes)
      const month = (event.fecha ?? event.inicio ?? '').slice(0, 7)
      if (month) accumulate(byMonth, month, eventMinutes)
    }
    const top = (map: Map<string, number>, count: number) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, count)
    return {
      filtered,
      bySystem: top(bySystem, 8),
      byModel: top(byModel, 8),
      byTipo: [...byTipo.entries()].sort((a, b) => b[1] - a[1]),
      byMonth: [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    }
  }, [fleetQuery.data?.detail.events, tipoFilter, modelFilter, sistemaFilter, search, t])

  const filteredEquipment = useMemo(() => {
    const equipment = fleetQuery.data?.detail.equipment ?? []
    const needle = search.trim().toUpperCase()
    return equipment.filter((item) =>
      (modelFilter === 'todos' || (item.model ?? t.sin_modelo) === modelFilter)
      && (tipoFilter === 'todos' || item.tipos.some((tipo) => tipoCategory(tipo.name) === tipoFilter))
      && (sistemaFilter === 'todos' || item.sistemas.some((sistema) => sistema.name === sistemaFilter))
      && (!needle
        || item.equipment_id.toUpperCase().includes(needle)
        || (item.model ?? '').toUpperCase().includes(needle)
        || item.sistemas.some((sistema) => sistema.name.toUpperCase().includes(needle))))
  }, [fleetQuery.data?.detail.equipment, tipoFilter, modelFilter, sistemaFilter, search, t])

  const modelOptions = useMemo(
    () => [...new Set((fleetQuery.data?.detail.equipment ?? []).map((item) => item.model ?? t.sin_modelo))],
    [fleetQuery.data?.detail.equipment, t],
  )

  // Estado actual por equipo = estado del evento mas reciente (events viene
  // ordenado descendente por fecha/inicio desde el backend).
  const latestEstado = useMemo(() => {
    const map = new Map<string, string>()
    for (const event of fleetQuery.data?.detail.events ?? []) {
      if (!map.has(event.equipment_id)) map.set(event.equipment_id, event.estado ?? 'OP')
    }
    return map
  }, [fleetQuery.data?.detail.events])

  // Tabla global ordenada por la atencion mas reciente primero.
  const sortedEquipment = useMemo(
    () => [...filteredEquipment].sort((a, b) =>
      (b.last_event ?? '').localeCompare(a.last_event ?? '')),
    [filteredEquipment],
  )

  const sistemaOptions = useMemo(
    () => [...new Set((fleetQuery.data?.detail.events ?? []).map((event) => event.sistema ?? 'Sin sistema'))].sort(),
    [fleetQuery.data?.detail.events],
  )

  const handleUpload = async (file: File | undefined) => {
    if (!file) return
    setImporting(true)
    setImportMessage(null)
    if (FAST_PUBLIC_DEMO) {
      setImportMessage('Demo rapido: XLS simulado, la interfaz ya muestra una muestra liviana de averias.')
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    try {
      const result = await uploadAveriasXls(file)
      setImportMessage(
        `${result.filename}: ${result.events_imported} eventos nuevos (${result.events_duplicated} ya existian). ${result.notes.join(' ')}`,
      )
      await fleetQuery.refetch()
    } catch (error) {
      setImportMessage(error instanceof Error ? `Error al importar: ${error.message}` : 'Error al importar el archivo.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleMailSync = async () => {
    setSyncing(true)
    setImportMessage(null)
    if (FAST_PUBLIC_DEMO) {
      setImportMessage('Demo rapido: sincronizacion simulada, sin descargar adjuntos ni procesar archivos pesados.')
      setSyncing(false)
      return
    }
    try {
      const result = await postAveriasMailSync()
      const mailFiles = result.mail.imported_files.length
      const folderFiles = result.folder.imported_files.length
      if (result.mail.status === 'sin_configurar' && result.folder.status === 'sin_configurar') {
        setImportMessage('Casilla y carpeta vigilada sin configurar. Define NORTHMINE_MAIL_USER / NORTHMINE_MAIL_PASSWORD o NORTHMINE_AVERIAS_WATCH_DIR en el backend.')
      } else if (result.mail.status === 'error') {
        setImportMessage(result.mail.detail ?? 'Error al sincronizar el correo.')
      } else {
        setImportMessage(`Sincronizacion lista: ${mailFiles} adjuntos desde correo, ${folderFiles} archivos desde carpeta.`)
      }
      await fleetQuery.refetch()
    } catch (error) {
      setImportMessage(error instanceof Error ? `Error al sincronizar: ${error.message}` : 'Error al sincronizar.')
    } finally {
      setSyncing(false)
    }
  }

  const query = useQuery({
    queryKey: ['stage17-averias'],
    queryFn: async () => {
      const [summary, history] = await Promise.all([
        getAveriasSummary(),
        getAveriasHistory(),
      ])
      return { summary, history }
    },
    enabled: !FAST_PUBLIC_DEMO,
    initialData: FAST_PUBLIC_DEMO
      ? { summary: FAST_DEMO_AVERIAS_SUMMARY, history: FAST_DEMO_AVERIAS_HISTORY }
      : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: FAST_PUBLIC_DEMO ? Infinity : 60000,
    gcTime: FAST_PUBLIC_DEMO ? Infinity : 30 * 60000,
    refetchInterval: FAST_PUBLIC_DEMO ? false : 60000,
  })

  // Solo mantencion: averias y mantenimientos WENCO. Se excluyen demoras
  // operacionales (colacion, bano, traslado, combustible, inactividad).
  const maintenanceHistory = useMemo(
    () =>
      (query.data?.history.items ?? []).filter((item) =>
        /AVERIA|AVERÍA|MANTEN/i.test(item.description ?? ''),
      ),
    [query.data?.history.items],
  )

  const averiasDataRef = useRef(query.data)
  averiasDataRef.current = query.data
  useAgentWidget({
    id: 'breakdown-summary',
    moduleId: 'averias',
    type: 'kpi',
    label: 'Resumen de averías',
    description: 'Averias activas, equipos inactivos y alertas criticas/altas.',
    supportedActions: ['explain_widget'],
    getSnapshot: () => {
      const summary = averiasDataRef.current?.summary
      return {
        widgetId: 'breakdown-summary',
        type: 'kpi',
        label: 'Resumen de averías',
        updatedAt: new Date().toISOString(),
        activeBreakdowns: summary?.active_breakdowns ?? 0,
        inactiveEquipment: summary?.inactive_equipment ?? 0,
        maintenanceEquipment: summary?.maintenance_equipment ?? 0,
        criticalAlerts: summary?.critical_alerts ?? 0,
        highAlerts: summary?.high_alerts ?? 0,
        value: summary?.active_breakdowns ?? 0,
        status: !summary ? undefined : summary.critical_alerts > 0 ? 'critical' : summary.high_alerts > 0 ? 'warning' : 'ok',
      }
    },
  })
  useAgentWidget({
    id: 'breakdown-active-list',
    moduleId: 'averias',
    type: 'alert-list',
    label: 'Averías activas',
    description: 'Equipos detenidos, duracion, severidad y sistema afectado.',
    supportedActions: ['focus_widget', 'explain_widget'],
    getSnapshot: () => {
      const items = averiasDataRef.current?.summary.items ?? []
      return {
        widgetId: 'breakdown-active-list',
        type: 'alert-list',
        label: 'Averías activas',
        updatedAt: new Date().toISOString(),
        total: items.length,
        items: items.slice(0, 15).map((item) => ({
          id: item.id,
          equipmentId: item.equipment_id,
          severity: item.severity,
          durationMin: item.duration_min,
          description: item.description,
        })),
      }
    },
  })
  useAgentEntityHandler('breakdown', {
    select: (entityId) => setExpandedId(entityId),
    open: (entityId) => setExpandedId(entityId),
    isOpen: (entityId) => expandedId === entityId,
  })

  if (!FAST_PUBLIC_DEMO && query.isLoading) return <LoadingState label="Cargando averias y mantenciones..." />
  if (query.isError || !query.data) return <ErrorState detail="No se pudo cargar el modulo de averias." onRetry={() => query.refetch()} />

  const data = query.data
  const fleetDetail = fleetQuery.data?.detail
  const costRate = fleetDetail?.costos?.tasa_usd_por_min
  // Equipos F/S segun el ultimo dia de reporte importado: eventos cuyo estado
  // final es F/S y que seguian apareciendo en la hoja mas reciente.
  const lastReportDate = fleetDetail?.events.reduce<string | null>(
    (max, event) => (event.fecha && (!max || event.fecha > max) ? event.fecha : max),
    null,
  )
  const equiposFs = fleetDetail && lastReportDate
    ? new Set(
        fleetDetail.events
          .filter((event) => event.fecha === lastReportDate && (event.estado ?? '').toUpperCase().replace('/', '') === 'FS')
          .map((event) => event.equipment_id),
      ).size
    : 0

  return (
    <div className="module-page operational-alerts-page">
      <ModuleHeader
        icon={Wrench}
        eyebrow="Averias"
        title="Averias y mantencion de flota"
        description="Averias, mantenciones programadas y desglose del reporte diario de mantencion."
        meta="API /api/averias/*"
      />

      <section className="kpi-grid compact">
        <ExecutiveKpiCard title="Averias activas" value={`${data.summary.active_breakdowns}`} subtitle="Eventos abiertos WENCO" trend={`${data.summary.maintenance_equipment} en mantencion`} tone={data.summary.active_breakdowns ? 'amber' : 'green'} icon={Wrench} />
        <ExecutiveKpiCard title="Averias / mantenciones" value={`${maintenanceHistory.length}`} subtitle="Eventos WENCO recientes" trend="turno vigente" tone={maintenanceHistory.length ? 'amber' : 'green'} icon={AlertTriangle} />
        <ExecutiveKpiCard title="Equipos F/S" value={`${equiposFs}`} subtitle="Fuera de servicio (reporte)" trend={fleetDetail ? `${fleetDetail.count_equipment} con eventos` : 'sin reporte'} tone={equiposFs ? 'red' : 'green'} icon={ShieldAlert} />
        <ExecutiveKpiCard title="Horas detenidas" value={fleetDetail ? minutes(Math.round(fleetDetail.total_min)) : '-'} subtitle={`Flota / ultimos ${fleetDetail?.days ?? 31} dias`} trend={`${fleetDetail?.count_events ?? 0} eventos`} tone="slate" icon={Clock} />
      </section>

      <section className="panel">
        <div className="panel-header"><div><span className="panel-kicker">WENCO en vivo</span><h2>Averias y mantenciones recientes</h2></div><span className="panel-tag">{maintenanceHistory.length} eventos</span></div>
        {maintenanceHistory.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {maintenanceHistory.slice(0, 12).map((item) => <EventCard key={item.id} item={item} t={t} />)}
          </div>
        ) : (
          <EmptyState title="Sin averias ni mantenciones registradas en WENCO recientemente" />
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">Reporte externo</span>
            <h2>Desglose de averias de la flota (XLS del correo)</h2>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="panel-tag">
              <Mail size={12} style={{ verticalAlign: 'text-top', marginRight: 4 }} />
              {fleetQuery.data?.mailStatus.mail_configured
                ? `Casilla: ${fleetQuery.data.mailStatus.mail_user}`
                : 'Outlook via tarea programada'}
            </span>
            {fleetQuery.data?.mailStatus.auto_sync?.enabled && (
              <span className="panel-tag" style={{ borderColor: 'rgba(74,222,128,0.5)', color: '#4ADE80' }}>
                Auto cada {fleetQuery.data.mailStatus.auto_sync.interval_min} min
                {fleetQuery.data.mailStatus.auto_sync.last_run
                  ? ` / ultima ${fleetQuery.data.mailStatus.auto_sync.last_run.slice(11, 16)}`
                  : ''}
              </span>
            )}
            <button className="command-button command-button-secondary" type="button" onClick={handleMailSync} disabled={syncing}>
              <RefreshCw size={15} /> {syncing ? 'Sincronizando...' : 'Sincronizar correo'}
            </button>
            <button className="command-button" type="button" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              <Upload size={15} /> {importing ? 'Importando...' : 'Cargar XLS'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx,.xlsm"
              style={{ display: 'none' }}
              onChange={(event) => handleUpload(event.target.files?.[0])}
            />
          </div>
        </div>

        {importMessage && (
          <p style={{ color: 'var(--nm-muted)', fontSize: '0.82rem', marginBottom: 12 }}>{importMessage}</p>
        )}

        {!FAST_PUBLIC_DEMO && fleetQuery.isLoading && <EmptyState title="Cargando desglose importado..." />}
        {fleetQuery.data && fleetQuery.data.detail.count_events === 0 && (
          <EmptyState title="Aun no hay reportes XLS importados. Carga uno con el boton o configura la casilla / carpeta vigilada." />
        )}

        {fleetQuery.data && fleetQuery.data.detail.count_events > 0 && (
          <>
            <section className="kpi-grid compact" style={{ marginBottom: 14 }}>
              <ExecutiveKpiCard title="Equipos afectados" value={`${fleetQuery.data.detail.count_equipment}`} subtitle={`Ultimos ${fleetQuery.data.detail.days} dias`} trend={`${fleetQuery.data.detail.count_events} eventos`} tone="amber" icon={Wrench} />
              <ExecutiveKpiCard title="Tiempo detenido" value={minutes(Math.round(fleetQuery.data.detail.total_min))} subtitle="Flota completa" trend="XLS importado" tone="red" icon={Clock} />
              <ExecutiveKpiCard title="Eventos" value={`${fleetQuery.data.detail.count_events}`} subtitle="Registros del reporte" trend={`${fleetQuery.data.mailStatus.total_events} historicos`} tone="cyan" icon={AlertTriangle} />
            </section>

            {fleetQuery.data.detail.costos && (() => {
              const costos = fleetQuery.data.detail.costos
              return (
                <section className="kpi-grid compact" style={{ marginBottom: 14 }}>
                  <ExecutiveKpiCard
                    title="Costo de indisponibilidad"
                    value={formatMoney(costos.total_usd)}
                    subtitle={`Ultimos ${fleetQuery.data.detail.days} dias, flota completa`}
                    trend={`${formatMoney(costos.correctiva_usd)} correctiva / ${formatMoney(costos.programada_usd)} programada`}
                    tone={costos.correctiva_usd > costos.programada_usd ? 'red' : 'amber'}
                    icon={CircleDollarSign}
                  />
                </section>
              )
            })()}
            {fleetQuery.data.detail.costos && (
              <p style={{ color: 'var(--nm-muted)', fontSize: '0.78rem', margin: '-8px 0 14px' }}>
                Estimado a USD {costFormatRate(fleetQuery.data.detail.costos.tasa_usd_por_min)}/min de indisponibilidad ({fleetQuery.data.detail.costos.fuente_tasa}). {fleetQuery.data.detail.costos.nota}
              </p>
            )}

            {fleetQuery.data.detail.kpis && (() => {
              const kpis = fleetQuery.data.detail.kpis
              const dfTone = kpis.disponibilidad_fisica_pct >= 90 ? 'green' : kpis.disponibilidad_fisica_pct >= 85 ? 'amber' : 'red'
              return (
                <section className="kpi-grid compact" style={{ marginBottom: 14 }}>
                  <ExecutiveKpiCard
                    title="Disponibilidad fisica"
                    value={`${kpis.disponibilidad_fisica_pct.toLocaleString('es-CL')}%`}
                    subtitle={`${kpis.equipos} equipos / ${kpis.dias_observados} dias con reporte`}
                    trend={kpis.peor_equipo ? `Peor: ${kpis.peor_equipo.equipment_id} (${kpis.peor_equipo.disponibilidad_pct}%)` : ''}
                    tone={dfTone}
                    icon={Gauge}
                  />
                  <ExecutiveKpiCard
                    title="MTTR"
                    value={kpis.mttr_horas != null ? `${kpis.mttr_horas.toLocaleString('es-CL')} h` : '-'}
                    subtitle="Tiempo medio de reparacion"
                    trend={`${kpis.num_averias} averias correctivas`}
                    tone={kpis.mttr_horas != null && kpis.mttr_horas > 8 ? 'amber' : 'cyan'}
                    icon={Timer}
                  />
                  <ExecutiveKpiCard
                    title="MTBF"
                    value={kpis.mtbf_horas != null ? `${kpis.mtbf_horas.toLocaleString('es-CL')} h` : '-'}
                    subtitle="Tiempo medio entre fallas"
                    trend={`${Math.round(kpis.horas_correctiva)} h en averias`}
                    tone="slate"
                    icon={Activity}
                  />
                  <ExecutiveKpiCard
                    title="Mantencion programada"
                    value={`${kpis.pct_programada.toLocaleString('es-CL')}%`}
                    subtitle="De la detencion total"
                    trend={`${kpis.pct_correctiva.toLocaleString('es-CL')}% correctiva`}
                    tone={kpis.pct_programada >= 60 ? 'green' : 'amber'}
                    icon={ShieldAlert}
                  />
                </section>
              )
            })()}

            {/* Filtros: rango de dias, tipo de evento y modelo */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '2px 0 12px' }}>
              <span style={{ display: 'inline-flex', gap: 4 }}>
                {[7, 14, 31, 60, 90, 180, 240].map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`command-button command-button-secondary nm-avr-filter-btn ${days === option ? 'is-active' : ''}`}
                    onClick={() => setDays(option)}
                  >
                    {option}d
                  </button>
                ))}
              </span>
              <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`command-button command-button-secondary nm-avr-filter-btn ${tipoFilter === 'todos' ? 'is-active' : ''}`}
                  onClick={() => setTipoFilter('todos')}
                >
                  Todos
                </button>
                {(Object.entries(TIPO_CATEGORIES) as Array<[TipoFilterValue & string, { label: string; color: string }]>)
                  .filter(([key]) => key !== 'otro')
                  .map(([key, cat]) => (
                    <button
                      key={key}
                      type="button"
                      className={`command-button command-button-secondary nm-avr-filter-btn ${tipoFilter === key ? 'is-active' : ''}`}
                      onClick={() => setTipoFilter(tipoFilter === key ? 'todos' : key)}
                      style={{ '--c': cat.color } as CSSProperties}
                    >
                      <i style={{ width: 9, height: 9, borderRadius: 3, background: cat.color, display: 'inline-block', marginRight: 5 }} />
                      {cat.label}
                    </button>
                  ))}
              </span>
              <select
                value={modelFilter}
                onChange={(event) => setModelFilter(event.target.value)}
                style={{
                  background: 'rgba(8,22,38,0.6)', color: 'var(--nm-text)', border: '1px solid rgba(125,211,252,0.25)',
                  borderRadius: 8, padding: '6px 10px', fontSize: '0.8rem',
                }}
              >
                <option value="todos">Todos los modelos</option>
                {modelOptions.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              <select
                value={sistemaFilter}
                onChange={(event) => setSistemaFilter(event.target.value)}
                style={{
                  background: 'rgba(8,22,38,0.6)', color: 'var(--nm-text)', border: '1px solid rgba(125,211,252,0.25)',
                  borderRadius: 8, padding: '6px 10px', fontSize: '0.8rem',
                }}
              >
                <option value="todos">Todos los sistemas</option>
                {sistemaOptions.map((sistema) => (
                  <option key={sistema} value={sistema}>{sistema}</option>
                ))}
              </select>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar equipo, sistema o falla..."
                style={{
                  background: 'rgba(8,22,38,0.6)', color: 'var(--nm-text)', border: '1px solid rgba(125,211,252,0.25)',
                  borderRadius: 8, padding: '6px 10px', fontSize: '0.8rem', minWidth: 220,
                }}
              />
              {(tipoFilter !== 'todos' || modelFilter !== 'todos' || sistemaFilter !== 'todos' || search.trim()) && (
                <>
                  <span className="panel-tag">{chartData.filtered.length} eventos filtrados</span>
                  <button
                    type="button"
                    className="command-button command-button-secondary nm-avr-filter-btn"
                    onClick={() => { setTipoFilter('todos'); setModelFilter('todos'); setSistemaFilter('todos'); setSearch('') }}
                  >
                    Limpiar
                  </button>
                </>
              )}
            </div>

            {/* Graficos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 14 }}>
              <div className="nm-avr-chart-card">
                <div className="panel-header" style={{ marginBottom: 6 }}>
                  <div><span className="panel-kicker">Donde duele</span><h2 style={{ fontSize: '0.92rem' }}>Horas por sistema</h2></div>
                </div>
                {chartData.bySystem.map(([name, min], index) => (
                  <HBar key={name} label={name} min={min} max={chartData.bySystem[0]?.[1] ?? 1} color="#38BDF8" index={index} costRate={costRate} />
                ))}
              </div>
              <div className="nm-avr-chart-card" style={{ '--d': '120ms' } as CSSProperties}>
                <div className="panel-header" style={{ marginBottom: 6 }}>
                  <div><span className="panel-kicker">Por flota</span><h2 style={{ fontSize: '0.92rem' }}>Horas por modelo</h2></div>
                </div>
                {chartData.byModel.map(([name, min], index) => (
                  <HBar key={name} label={name} min={min} max={chartData.byModel[0]?.[1] ?? 1} color="#4ADE80" index={index} costRate={costRate} />
                ))}
              </div>
              {chartData.byMonth.length > 1 && (
                <div className="nm-avr-chart-card" style={{ '--d': '200ms' } as CSSProperties}>
                  <div className="panel-header" style={{ marginBottom: 6 }}>
                    <div><span className="panel-kicker">Historico</span><h2 style={{ fontSize: '0.92rem' }}>Horas detenidas por mes</h2></div>
                  </div>
                  {chartData.byMonth.map(([month, min], index) => {
                    const [year, mm] = month.split('-')
                    const maxMonth = Math.max(...chartData.byMonth.map(([, value]) => value), 1)
                    return (
                      <HBar key={month} label={`${mm}-${year}`} min={min} max={maxMonth} color="#A78BFA" index={index} costRate={costRate} />
                    )
                  })}
                </div>
              )}
            </div>

            <div className="nm-avr-chart-card" style={{ marginBottom: 14, '--d': '200ms' } as CSSProperties}>
              <div className="panel-header" style={{ marginBottom: 8 }}>
                <div><span className="panel-kicker">Composicion</span><h2 style={{ fontSize: '0.92rem' }}>Distribucion por tipo de evento</h2></div>
              </div>
              {(() => {
                const totalTipoMin = chartData.byTipo.reduce((sum, [, min]) => sum + min, 0)
                return (
                  <>
                    <div className="nm-avr-stack">
                      {chartData.byTipo.map(([category, min]) => (
                        <i
                          key={category}
                          title={`${tipoLabel(t, category)}: ${minutes(Math.round(min))}`}
                          style={{ width: `${(min / Math.max(totalTipoMin, 1)) * 100}%`, background: TIPO_CATEGORIES[category as keyof typeof TIPO_CATEGORIES]?.color ?? '#94A3B8' }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                      {chartData.byTipo.map(([category, min]) => {
                        const cat = TIPO_CATEGORIES[category as keyof typeof TIPO_CATEGORIES]
                        return (
                          <small key={category} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--nm-muted)' }}>
                            <i style={{ width: 10, height: 10, borderRadius: 3, background: cat?.color ?? '#94A3B8', display: 'inline-block' }} />
                            {tipoLabel(t, category)}: {minutes(Math.round(min))} ({totalTipoMin ? Math.round((min / totalTipoMin) * 100) : 0}%)
                          </small>
                        )
                      })}
                    </div>
                  </>
                )
              })()}
            </div>

            {insightsQuery.data && (
              <div className="nm-avr-chart-card" style={{ marginBottom: 14, '--d': '280ms' } as CSSProperties}>
                <div className="panel-header" style={{ marginBottom: 10 }}>
                  <div>
                    <span className="panel-kicker">Analisis inteligente</span>
                    <h2 style={{ fontSize: '0.95rem' }}>Patrones de averias: recurrencias, tendencias y equipos en riesgo</h2>
                  </div>
                  <span className="panel-tag">
                    {insightsQuery.data.averias_analizadas} averias analizadas / {insightsQuery.data.days} dias
                  </span>
                </div>

                {insightsQuery.data.equipos_riesgo.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 14 }}>
                    {insightsQuery.data.equipos_riesgo.slice(0, 4).map((equipo) => {
                      const color = equipo.nivel === 'CRITICO' ? '#F87171' : equipo.nivel === 'ALTO' ? '#FBBF24' : '#94A3B8'
                      return (
                        <article key={equipo.equipment_id} style={{ border: `1px solid ${color}55`, borderLeft: `3px solid ${color}`, borderRadius: 10, padding: '10px 12px', background: `${color}0D` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <strong style={{ color: 'var(--nm-text)' }}>{equipo.equipment_id}</strong>
                            <span className="panel-tag" style={{ borderColor: color, color }}>{equipo.nivel}</span>
                          </div>
                          <small style={{ color: 'var(--nm-muted)', display: 'block', lineHeight: 1.45 }}>
                            {equipo.model ?? ''} · {equipo.razones.join(' · ')}
                          </small>
                        </article>
                      )
                    })}
                  </div>
                )}

                {insightsQuery.data.tendencias_sistema.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    {insightsQuery.data.tendencias_sistema.slice(0, 6).map((trend) => {
                      const up = trend.direccion === 'SUBE'
                      const color = up ? '#F87171' : trend.direccion === 'BAJA' ? '#4ADE80' : '#94A3B8'
                      return (
                        <span key={trend.sistema} className="panel-tag" style={{ borderColor: `${color}88`, color }}>
                          {up ? '▲' : trend.direccion === 'BAJA' ? '▼' : '•'} {trend.sistema}: {trend.primera_mitad}→{trend.segunda_mitad} averias
                        </span>
                      )
                    })}
                  </div>
                )}

                {insightsQuery.data.recurrentes.length ? insightsQuery.data.recurrentes.slice(0, 8).map((patron) => {
                  const key = `${patron.equipment_id}|${patron.sistema}`
                  const isOpen = openInsight === key
                  const trendColor = patron.tendencia === 'EN AUMENTO' ? '#F87171' : patron.tendencia === 'A LA BAJA' ? '#4ADE80' : '#94A3B8'
                  return (
                    <div key={key} style={{ borderTop: '1px solid rgba(148,163,184,0.14)' }}>
                      <button
                        type="button"
                        onClick={() => setOpenInsight(isOpen ? null : key)}
                        style={{
                          display: 'flex', width: '100%', alignItems: 'center', gap: 10, padding: '9px 4px',
                          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--nm-text)', fontSize: '0.82rem',
                        }}
                      >
                        <ChevronDown size={14} className="nm-avr-chevron" style={isOpen ? { transform: 'rotate(180deg)', color: '#7DD3FC' } : undefined} />
                        <strong>{patron.equipment_id}</strong>
                        <span style={{ color: 'var(--nm-muted)' }}>{patron.sistema}</span>
                        <span className="panel-tag">{patron.eventos} veces</span>
                        <span className="panel-tag" style={{ borderColor: trendColor, color: trendColor }}>{patron.tendencia}</span>
                        <span style={{ marginLeft: 'auto', color: 'var(--nm-muted)', fontSize: '0.74rem', whiteSpace: 'nowrap' }}>
                          {patron.gap_promedio_dias != null ? `cada ~${patron.gap_promedio_dias} dias / ` : ''}ultima {formatFecha(patron.ultima_fecha)}
                        </span>
                      </button>
                      {isOpen && (
                        <div style={{ padding: '2px 4px 12px 28px', animation: 'nm-avr-fade-up 0.25s both' }}>
                          {patron.ultima_descripcion && (
                            <p style={{ color: 'var(--nm-text)', fontSize: '0.8rem', margin: '0 0 8px' }}>
                              Ultimo evento: {patron.ultima_descripcion}
                            </p>
                          )}
                          <p style={{ color: 'var(--nm-muted)', fontSize: '0.8rem', margin: '0 0 6px', lineHeight: 1.5 }}>
                            <strong style={{ color: '#FBBF24' }}>Causa probable:</strong> {patron.causa_probable}
                          </p>
                          <p style={{ color: 'var(--nm-muted)', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
                            <strong style={{ color: '#4ADE80' }}>Solucion sugerida:</strong> {patron.solucion_sugerida}
                            <span className="panel-tag" style={{ marginLeft: 8 }}>confianza {patron.confianza}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )
                }) : (
                  <small style={{ color: 'var(--nm-muted)' }}>Sin fallas recurrentes detectadas en la ventana analizada.</small>
                )}
              </div>
            )}

            <div className="panel-header"><div><span className="panel-kicker">Flota</span><h2>Tabla global de equipos</h2></div><span className="panel-tag">{sortedEquipment.length} equipos / clic para desplegar detalle</span></div>
            <div className="nm-avr-table-wrap">
              <table className="nm-avr-table">
                <thead>
                  <tr>
                    <th style={{ width: 28 }} />
                    <th>Equipo</th>
                    <th>Modelo</th>
                    <th>Estado</th>
                    <th>Tipo dominante</th>
                    <th style={{ textAlign: 'right' }}>Eventos</th>
                    <th style={{ textAlign: 'right' }}>Horas detenidas</th>
                    <th style={{ textAlign: 'right' }}>Costo</th>
                    <th style={{ textAlign: 'right' }}>Disp. fisica</th>
                    <th>Sistema principal</th>
                    <th>Ultimo evento</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEquipment.map((item) => {
                    const estado = latestEstado.get(item.equipment_id) ?? 'OP'
                    const accent = tipoColor(item.tipo_principal)
                    const isOpen = expandedId === item.equipment_id
                    const equipEvents = chartData.filtered.filter((event) => event.equipment_id === item.equipment_id)
                    return (
                      <Fragment key={item.equipment_id}>
                        <tr
                          className={`nm-avr-row ${isOpen ? 'is-open' : ''}`}
                          style={{ background: `${accent}${isOpen ? '1F' : '0D'}`, '--c': accent } as CSSProperties}
                          onClick={() => setExpandedId(isOpen ? null : item.equipment_id)}
                        >
                          <td><ChevronDown size={15} className="nm-avr-chevron" /></td>
                          <td style={{ fontWeight: 700 }}>{item.equipment_id}</td>
                          <td>{item.model ?? 'Sin modelo'}</td>
                          <td><EstadoChip estado={estado} /></td>
                          <td><TipoChip tipo={item.tipo_principal} t={t} /></td>
                          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {item.events}{item.criticas ? ` (${item.criticas} crit.)` : ''}
                          </td>
                          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{minutes(Math.round(item.total_min))}</td>
                          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--nm-muted)' }}>{formatMoney(item.costo_usd)}</td>
                          <td style={{
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 700,
                            color: item.disponibilidad_pct >= 90 ? '#4ADE80' : item.disponibilidad_pct >= 80 ? '#FBBF24' : '#F87171',
                          }}>
                            {item.disponibilidad_pct.toLocaleString('es-CL')}%
                          </td>
                          <td>{item.sistemas[0]?.name ?? '-'}</td>
                          <td style={{ color: 'var(--nm-muted)', whiteSpace: 'nowrap' }}>
                            {formatFecha(item.last_event)}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={11} className="nm-avr-detail-cell">
                              <div style={{ padding: '4px 8px 10px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0 8px' }}>
                                  {item.tipos.map((tipo) => (
                                    <TipoChip key={tipo.name} tipo={tipo.name} suffix={`· ${minutes(Math.round(tipo.min))}`} t={t} />
                                  ))}
                                  {item.sistemas.slice(0, 5).map((sistema) => (
                                    <span key={sistema.name} className="panel-tag">
                                      {sistema.name}: {minutes(Math.round(sistema.min))}
                                    </span>
                                  ))}
                                </div>
                                {equipEvents.length ? equipEvents.map((event) => (
                                  <div key={event.id} className="nm-avr-detail-event">
                                    <small>{formatFecha(event.inicio ?? event.fecha)}</small>
                                    <span><TipoChip tipo={event.tipo} t={t} /></span>
                                    <small>{event.sistema ?? '-'}</small>
                                    <span className="nm-avr-desc">{event.descripcion ?? '-'}</span>
                                    <small style={{ textAlign: 'right' }}>
                                      {event.duracion_min != null ? minutes(Math.round(event.duracion_min)) : '-'}
                                    </small>
                                    <span><EstadoChip estado={event.estado ?? 'OP'} /></span>
                                  </div>
                                )) : (
                                  <small style={{ color: 'var(--nm-muted)' }}>Sin eventos con los filtros actuales.</small>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
