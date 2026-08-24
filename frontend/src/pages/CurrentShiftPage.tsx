import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, Download, FileText, Filter, Gauge, History, Timer, Truck } from 'lucide-react'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import { ExecutiveKpiCard } from '../components/kpi/ExecutiveKpiCard'
import { EquipmentActivityModal, type EquipmentActivityTarget } from '../components/shift/EquipmentActivityModal'
import { EQUIPMENT_ACTIVITY_DIALOG_ID } from '../components/shift/equipmentActivityA11y'
import { getEquipmentImage, getEquipmentLabel } from '../data/equipmentAssets'
import {
  getCurrentShift,
  getCycleAnomalies,
  getDispatchFilters,
  getShiftCaexRanking,
  getShiftExport,
  getShiftExportXlsx,
  getShiftLoadingUnits,
  getShiftReportDates,
  getShiftReportSnapshot,
  type CycleAnomaly,
} from '../lib/api'
import { downloadShiftPdfReport } from '../lib/shiftReportPdf'
import { buildShiftNarrative } from '../lib/shiftNarrative'
import { useModuleT } from '../i18n/useModuleT'
import { currentShiftT } from '../i18n/modules/currentShift'
import { shiftNarrativeT } from '../i18n/modules/shiftNarrative'
import { useAgentWidget } from '../lib/agentRegistry/useAgentWidget'

function tons(value: number) {
  return `${Math.round(value).toLocaleString('es-CL')} t`
}

function pct(value: number) {
  return `${value.toFixed(1)}%`
}

function min(value: number) {
  if (value < 60) return `${value} min`
  return `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, '0')}m`
}

function routeLabel(item: {
  origen_principal?: string | null
  destino_principal?: string | null
  avg_distance_km?: number | null
}, t: { sin_origen: string; sin_destino: string }): string | undefined {
  if (!item.origen_principal && !item.destino_principal) return undefined
  const route = `${item.origen_principal ?? t.sin_origen} → ${item.destino_principal ?? t.sin_destino}`
  if (item.avg_distance_km == null) return route
  return `${route} · ${item.avg_distance_km.toLocaleString('es-CL', { maximumFractionDigits: 1 })} km/ciclo`
}

function EquipmentImage({ id, model }: { id: string; model?: string }) {
  const image = getEquipmentImage(id, model)
  const label = getEquipmentLabel(id, model)

  return <img src={image} alt={label} loading="lazy" />
}

async function downloadCsv(kind: 'shift' | 'caex' | 'loading', setLoading: (value: boolean) => void) {
  setLoading(true)
  try {
    const blob = await getShiftExport(kind)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `northmine_${kind}_export.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  } finally {
    setLoading(false)
  }
}

async function downloadXlsx(kind: 'shift' | 'caex' | 'loading', setLoading: (value: boolean) => void) {
  setLoading(true)
  try {
    const blob = await getShiftExportXlsx(kind)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `northmine_${kind}_export.xlsx`
    anchor.click()
    URL.revokeObjectURL(url)
  } finally {
    setLoading(false)
  }
}

function BarRow({ label, value, max, meta }: { label: string; value: number; max: number; meta?: string }) {
  return (
    <div className="nm-shift-hour-row">
      <strong>{label}</strong>
      <span className="nm-shift-hour-track">
        <i style={{ width: `${Math.min(100, value / Math.max(max, 1) * 100)}%` }} />
      </span>
      <span className="nm-shift-hour-meta">{meta ?? tons(value)}</span>
    </div>
  )
}

function AnomalyBadge({ anomaly, ucAnomalyCount }: { anomaly?: CycleAnomaly; ucAnomalyCount?: number }) {
  const t = useModuleT(currentShiftT)
  if (anomaly) {
    const color = anomaly.severidad === 'CRITICA' ? '#F87171' : '#FBBF24'
    const label = anomaly.tipo === 'gap_abierto'
      ? `${t.sin_ciclo_hace} ${Math.round(anomaly.gap_min)} min ${t.esperado_min(Math.round(anomaly.esperado_min))}`
      : `${t.hueco_de} ${Math.round(anomaly.gap_min)} min ${t.esperado_min(Math.round(anomaly.esperado_min))}`
    return (
      <small
        className="nm-shift-equip-fuel"
        style={{ color, display: 'flex', alignItems: 'center', gap: 3 }}
        title={t.anomalia_ciclo_title(label)}
      >
        <AlertTriangle size={11} /> {label}
      </small>
    )
  }
  if (ucAnomalyCount) {
    return (
      <small
        className="nm-shift-equip-fuel"
        style={{ color: '#FBBF24', display: 'flex', alignItems: 'center', gap: 3 }}
        title={t.caex_uc_anomalo_title(ucAnomalyCount)}
      >
        <AlertTriangle size={11} /> {t.caex_en_anomalia(ucAnomalyCount)}
      </small>
    )
  }
  return null
}

function EquipmentRow({
  id,
  model,
  value,
  max,
  meta,
  sub,
  rank,
  anomaly,
  ucAnomalyCount,
  onOpenActivity,
  activityOpen,
}: {
  id: string
  model?: string
  value: number
  max: number
  meta: string
  sub?: string
  rank?: number
  anomaly?: CycleAnomaly
  ucAnomalyCount?: number
  onOpenActivity?: () => void
  activityOpen?: boolean
}) {
  const t = useModuleT(currentShiftT)
  return (
    <div
      className={`nm-shift-equip-row ${onOpenActivity ? 'is-clickable' : ''} ${anomaly ? 'is-anomaly' : ''}`}
      role={onOpenActivity ? 'button' : undefined}
      tabIndex={onOpenActivity ? 0 : undefined}
      onClick={onOpenActivity}
      onKeyDown={(event) => {
        if (onOpenActivity && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onOpenActivity()
        }
      }}
      aria-label={onOpenActivity ? t.ver_actividad_wenco(id) : undefined}
      aria-haspopup={onOpenActivity ? 'dialog' : undefined}
      aria-controls={onOpenActivity ? EQUIPMENT_ACTIVITY_DIALOG_ID : undefined}
      aria-expanded={onOpenActivity ? Boolean(activityOpen) : undefined}
    >
      <span className="nm-shift-equip-visual">
        <EquipmentImage id={id} model={model} />
      </span>
      <div className="nm-shift-equip-main">
        <div className="nm-shift-equip-title">
          <strong>{rank ? `${rank}. ` : ''}{id}</strong>
          {model && <span>{model}</span>}
        </div>
        <span className="nm-shift-equip-bar">
          <i style={{ width: `${Math.min(100, value / Math.max(max, 1) * 100)}%` }} />
        </span>
        {sub && <small>{sub}</small>}
        <AnomalyBadge anomaly={anomaly} ucAnomalyCount={ucAnomalyCount} />
      </div>
      <span className="nm-shift-equip-meta">{meta}</span>
    </div>
  )
}

export function CurrentShiftPage() {
  const t = useModuleT(currentShiftT)
  const tNarrative = useModuleT(shiftNarrativeT)
  const [exporting, setExporting] = useState(false)
  const [exportingXlsx, setExportingXlsx] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [activityTarget, setActivityTarget] = useState<EquipmentActivityTarget | null>(null)
  const [historicOpen, setHistoricOpen] = useState(false)
  const [historicSelection, setHistoricSelection] = useState('')
  const [historicBusy, setHistoricBusy] = useState(false)
  const [historicMessage, setHistoricMessage] = useState<string | null>(null)

  // Filtro de despacho: acota fecha/turno/UC/CAEX/fase/malla para la
  // deteccion de anomalias de ciclo (control en tiempo real).
  const [dispatchOpen, setDispatchOpen] = useState(false)
  const [filterFecha, setFilterFecha] = useState('')
  const [filterTurno, setFilterTurno] = useState('')
  const [filterCarguio, setFilterCarguio] = useState('')
  const [filterCaex, setFilterCaex] = useState('')
  const [filterFase, setFilterFase] = useState('')
  const [filterMalla, setFilterMalla] = useState('')

  const dispatchFiltersQuery = useQuery({
    queryKey: ['dispatch-filters'],
    queryFn: () => getDispatchFilters(30),
    staleTime: 300000,
  })

  const anomaliesQuery = useQuery({
    queryKey: ['cycle-anomalies', filterFecha, filterTurno, filterCarguio, filterCaex, filterFase, filterMalla],
    queryFn: () => getCycleAnomalies({
      fecha: filterFecha || undefined,
      turno: filterTurno || undefined,
      carguio_id: filterCarguio || undefined,
      caex_id: filterCaex || undefined,
      fase: filterFase || undefined,
      malla: filterMalla || undefined,
    }),
    refetchInterval: filterFecha ? false : 60000,
  })

  const anomalyByCaex = useMemo(() => {
    const map = new Map<string, CycleAnomaly>()
    for (const anomaly of anomaliesQuery.data?.anomalias ?? []) {
      const current = map.get(anomaly.equipment_id)
      if (!current || anomaly.gap_min > current.gap_min) map.set(anomaly.equipment_id, anomaly)
    }
    return map
  }, [anomaliesQuery.data])

  const anomalyCountByUc = useMemo(() => {
    const map = new Map<string, number>()
    for (const anomaly of anomaliesQuery.data?.anomalias ?? []) {
      if (!anomaly.carguio_id) continue
      map.set(anomaly.carguio_id, (map.get(anomaly.carguio_id) ?? 0) + 1)
    }
    return map
  }, [anomaliesQuery.data])

  const hasActiveFilters = Boolean(filterFecha || filterTurno || filterCarguio || filterCaex || filterFase || filterMalla)
  const clearFilters = () => {
    setFilterFecha(''); setFilterTurno(''); setFilterCarguio(''); setFilterCaex(''); setFilterFase(''); setFilterMalla('')
  }

  const datesQuery = useQuery({
    queryKey: ['shift-report-dates'],
    queryFn: getShiftReportDates,
    enabled: historicOpen,
    staleTime: 300000,
  })

  const handleHistoricPdf = async () => {
    if (!historicSelection) return
    const [fecha, turno] = historicSelection.split('|')
    setHistoricBusy(true)
    setHistoricMessage(null)
    try {
      const snapshot = await getShiftReportSnapshot(fecha, turno)
      if (!snapshot.ciclos) {
        setHistoricMessage(t.sin_ciclos_para(fecha, turno))
        return
      }
      await downloadShiftPdfReport({
        current: snapshot,
        caex: snapshot.caex,
        loadingUnits: snapshot.loading_units,
      })
      setHistoricMessage(t.reporte_generado(fecha, turno, snapshot.ciclos))
    } catch {
      setHistoricMessage(t.reporte_error)
    } finally {
      setHistoricBusy(false)
    }
  }
  const query = useQuery({
    queryKey: ['stage17-current-shift'],
    queryFn: async () => {
      const [current, caex, loadingUnits] = await Promise.all([
        getCurrentShift(),
        getShiftCaexRanking(),
        getShiftLoadingUnits(),
      ])
      return { current, caex: caex.items, loadingUnits: loadingUnits.items }
    },
    refetchInterval: 60000,
  })

  const hourlyMax = useMemo(() => Math.max(...(query.data?.current.hourly.map((item) => item.toneladas) ?? [1]), 1), [query.data?.current.hourly])
  const caexMax = useMemo(() => Math.max(...(query.data?.caex.map((item) => item.toneladas) ?? [1]), 1), [query.data?.caex])
  const loadingMax = useMemo(() => Math.max(...(query.data?.loadingUnits.map((item) => item.toneladas) ?? [1]), 1), [query.data?.loadingUnits])

  const shiftDataRef = useRef(query.data)
  shiftDataRef.current = query.data
  useAgentWidget({
    id: 'shift-summary',
    moduleId: 'turno',
    type: 'kpi',
    label: 'Resumen de turno',
    description: 'Produccion real vs meta, equipos activos y cumplimiento del turno en curso.',
    supportedActions: ['explain_widget'],
    getSnapshot: () => {
      const current = shiftDataRef.current?.current
      return {
        widgetId: 'shift-summary',
        type: 'kpi',
        label: 'Resumen de turno',
        updatedAt: new Date().toISOString(),
        turno: current?.turno ?? null,
        fecha: current?.fecha ?? null,
        toneladas: current?.toneladas_turno ?? 0,
        meta: current?.meta_turno ?? 0,
        cumplimientoPct: current?.cumplimiento_pct ?? 0,
        brechaTon: current?.brecha_ton ?? 0,
        caexActivos: current?.caex_activos ?? 0,
        caexSinActividad: current?.caex_sin_actividad ?? 0,
        value: current?.cumplimiento_pct ?? 0,
        unit: '%',
        status: !current ? undefined : current.cumplimiento_pct >= 100 ? 'ok' : current.cumplimiento_pct >= 90 ? 'warning' : 'critical',
      }
    },
  })

  if (query.isLoading) return <LoadingState label={t.cargando_turno} />
  if (query.isError || !query.data) return <ErrorState detail={t.error_turno} onRetry={() => query.refetch()} />

  const data = query.data.current
  const lowAverage = data.caex_bajo_promedio ?? []
  const tone = data.cumplimiento_pct >= 95 ? 'green' : data.cumplimiento_pct >= 80 ? 'amber' : 'red'
  const narrative = buildShiftNarrative({
    t: tNarrative,
    data,
    caex: query.data.caex,
    lowAverageCount: lowAverage.length,
    anomalies: anomaliesQuery.data?.anomalias ?? [],
  })

  const handlePdf = async () => {
    if (!query.data) return
    setExportingPdf(true)
    try {
      await downloadShiftPdfReport({
        current: query.data.current,
        caex: query.data.caex,
        loadingUnits: query.data.loadingUnits,
      })
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="module-page current-shift-page">
      <ModuleHeader
        icon={Activity}
        eyebrow={t.eyebrow}
        title={`${data.shift_label}${t.title_suffix}`}
        description={t.descripcion(data.fecha, data.elapsed_minutes)}
        actions={
          <>
            <button className="command-button" type="button" onClick={handlePdf} disabled={exportingPdf}>
              <FileText size={15} /> {exportingPdf ? t.generando : t.reporte_pdf}
            </button>
            <button
              className={`command-button command-button-secondary ${dispatchOpen ? 'is-active' : ''}`}
              type="button"
              onClick={() => setDispatchOpen((open) => !open)}
            >
              <Filter size={15} /> {t.filtro_despacho}
              {anomaliesQuery.data && anomaliesQuery.data.anomalias.length > 0 && (
                <span className="panel-tag" style={{ marginLeft: 4, borderColor: '#F87171', color: '#F87171' }}>
                  {anomaliesQuery.data.anomalias.length}
                </span>
              )}
            </button>
            <button
              className={`command-button command-button-secondary ${historicOpen ? 'is-active' : ''}`}
              type="button"
              onClick={() => setHistoricOpen((open) => !open)}
            >
              <History size={15} /> {t.reportes_anteriores}
            </button>
            <button className="command-button command-button-secondary" type="button" onClick={() => downloadCsv('shift', setExporting)} disabled={exporting}>
              <Download size={15} /> {exporting ? t.exportando : t.export_csv}
            </button>
            <button className="command-button command-button-secondary" type="button" onClick={() => downloadXlsx('shift', setExportingXlsx)} disabled={exportingXlsx}>
              <Download size={15} /> {exportingXlsx ? t.exportando : t.export_excel}
            </button>
          </>
        }
      />

      {historicOpen && (
        <section className="panel" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <strong style={{ color: 'var(--nm-text)', fontSize: '0.88rem' }}>{t.imprimir_reporte_anterior}</strong>
          <select
            value={historicSelection}
            onChange={(event) => setHistoricSelection(event.target.value)}
            style={{
              background: 'rgba(8,22,38,0.6)', color: 'var(--nm-text)', border: '1px solid rgba(125,211,252,0.25)',
              borderRadius: 8, padding: '7px 10px', fontSize: '0.82rem', minWidth: 260,
            }}
          >
            <option value="">{t.selecciona_fecha_turno}</option>
            {(datesQuery.data?.items ?? []).map((item) => (
              <option key={`${item.fecha}|${item.turno}`} value={`${item.fecha}|${item.turno}`}>
                {t.turno_ciclos(item.fecha, item.turno, item.ciclos)}
              </option>
            ))}
          </select>
          <button
            className="command-button"
            type="button"
            onClick={handleHistoricPdf}
            disabled={historicBusy || !historicSelection}
          >
            <FileText size={15} /> {historicBusy ? t.generando : t.generar_pdf}
          </button>
          {datesQuery.isLoading && <small style={{ color: 'var(--nm-muted)' }}>{t.cargando_turnos}</small>}
          {historicMessage && <small style={{ color: 'var(--nm-muted)' }}>{historicMessage}</small>}
        </section>
      )}

      {dispatchOpen && (
        <section className="panel">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: anomaliesQuery.data ? 12 : 0 }}>
            <strong style={{ color: 'var(--nm-text)', fontSize: '0.86rem' }}>{t.filtro_despacho_label}</strong>
            {[
              { value: filterFecha, set: setFilterFecha, options: dispatchFiltersQuery.data?.fechas ?? [], placeholder: t.fecha_hoy },
              { value: filterTurno, set: setFilterTurno, options: dispatchFiltersQuery.data?.turnos ?? [], placeholder: t.turno_placeholder },
              { value: filterCarguio, set: setFilterCarguio, options: dispatchFiltersQuery.data?.carguio_ids ?? [], placeholder: t.uc_placeholder },
              { value: filterCaex, set: setFilterCaex, options: dispatchFiltersQuery.data?.caex_ids ?? [], placeholder: t.caex_placeholder },
              { value: filterFase, set: setFilterFase, options: dispatchFiltersQuery.data?.fases ?? [], placeholder: t.fase_placeholder },
              { value: filterMalla, set: setFilterMalla, options: dispatchFiltersQuery.data?.mallas ?? [], placeholder: t.malla_placeholder },
            ].map((filter, index) => (
              <select
                key={index}
                value={filter.value}
                onChange={(event) => filter.set(event.target.value)}
                style={{
                  background: 'rgba(8,22,38,0.6)', color: 'var(--nm-text)', border: '1px solid rgba(125,211,252,0.25)',
                  borderRadius: 8, padding: '6px 8px', fontSize: '0.8rem',
                }}
              >
                <option value="">{filter.placeholder}</option>
                {filter.options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ))}
            {hasActiveFilters && (
              <button className="command-button command-button-secondary" type="button" onClick={clearFilters}>
                {t.limpiar}
              </button>
            )}
            <span className="panel-tag">{anomaliesQuery.data?.modo === 'historico' ? t.revision_historica : t.en_vivo}</span>
          </div>

          {anomaliesQuery.isLoading && <small style={{ color: 'var(--nm-muted)' }}>{t.calculando_anomalias}</small>}
          {anomaliesQuery.data && (
            <>
              <p style={{ color: 'var(--nm-muted)', fontSize: '0.78rem', margin: '0 0 8px', lineHeight: 1.5 }}>
                {anomaliesQuery.data.nota}
              </p>
              {anomaliesQuery.data.anomalias.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
                  {anomaliesQuery.data.anomalias.slice(0, 12).map((anomaly) => {
                    const color = anomaly.severidad === 'CRITICA' ? '#F87171' : '#FBBF24'
                    return (
                      <article
                        key={`${anomaly.equipment_id}-${anomaly.inicio}`}
                        style={{ border: `1px solid ${color}55`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '8px 10px', background: `${color}0D` }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: 'var(--nm-text)' }}>{anomaly.equipment_id}</strong>
                          <span className="panel-tag" style={{ borderColor: color, color }}>{anomaly.severidad}</span>
                        </div>
                        <small style={{ color: 'var(--nm-muted)', display: 'block', marginTop: 2 }}>
                          {anomaly.model} {anomaly.carguio_id ? t.uc_prefix(anomaly.carguio_id) : ''}
                        </small>
                        <small style={{ color, display: 'block', marginTop: 2 }}>
                          {anomaly.tipo === 'gap_abierto' ? t.sin_ciclo_hace : t.hueco_de} {Math.round(anomaly.gap_min)} min
                          {' '}{t.esperado_min(Math.round(anomaly.esperado_min))}
                        </small>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <EmptyState title={t.sin_anomalias} />
              )}
            </>
          )}
        </section>
      )}

      <section className="kpi-grid compact">
        <ExecutiveKpiCard title={t.kpi_ton_turno} value={tons(data.toneladas_turno)} subtitle={t.kpi_ton_turno_sub} trend={tons(data.brecha_ton)} tone={tone} icon={Activity} />
        <ExecutiveKpiCard title={t.kpi_cumplimiento} value={pct(data.cumplimiento_pct)} subtitle={t.kpi_cumplimiento_sub} trend={tons(data.meta_turno)} tone={tone} icon={Gauge} />
        <ExecutiveKpiCard title={t.kpi_ciclos} value={data.ciclos.toLocaleString('es-CL')} subtitle={t.kpi_ciclos_sub} trend={t.kpi_ciclos_trend(data.promedio_ton_ciclo)} tone="cyan" icon={Timer} />
        <ExecutiveKpiCard title={t.kpi_caex_activos} value={`${data.caex_activos}`} subtitle={t.kpi_caex_sin_actividad(data.caex_sin_actividad)} trend={t.kpi_caex_averia(data.caex_posible_averia)} tone={data.caex_posible_averia ? 'amber' : 'green'} icon={Truck} />
      </section>

      <section className="nm-shift-overview-grid">
        <div className="panel nm-shift-narrative-panel">
          <div className="panel-header">
            <div><span className="panel-kicker">{t.resumen_ejecutivo}</span><h2>{t.lectura_del_turno}</h2></div>
            <span className="panel-tag">{t.generado_automaticamente}</span>
          </div>
          <div className="nm-shift-narrative">
            {narrative.map((paragraph, index) => (
              <p key={index} className={index === 0 ? 'is-primary' : undefined}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
        <div className="panel nm-shift-hourly-panel">
          <div className="panel-header"><div><span className="panel-kicker">{t.hora_a_hora}</span><h2>{t.tonelaje_del_turno}</h2></div><span className="panel-tag">{data.turno}</span></div>
          <div className="nm-shift-hourly-list">
            {data.hourly.length ? data.hourly.map((item) => <BarRow key={item.label} label={item.label} value={item.toneladas} max={hourlyMax} meta={`${tons(item.toneladas)} / ${t.ciclos_ton(item.ciclos)}`} />) : <EmptyState title={t.sin_datos_evaluacion} />}
          </div>
        </div>
        <div className="panel nm-shift-review-panel">
          <div className="panel-header"><div><span className="panel-kicker">{t.bajo_promedio}</span><h2>{t.caex_a_revisar}</h2></div><span className="panel-tag">{t.equipos_count(lowAverage.length)}</span></div>
          <div className="nm-shift-review-list">
            {!lowAverage.length ? <EmptyState title={t.sin_datos_evaluacion} /> : lowAverage.map((item) => (
              <article
                key={item.caex_id}
                className="operational-alert-row alert-severity-alta nm-shift-alert-row is-clickable"
                role="button"
                tabIndex={0}
                onClick={() => setActivityTarget({ id: item.caex_id, model: item.modelo, type: 'truck' })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setActivityTarget({ id: item.caex_id, model: item.modelo, type: 'truck' })
                  }
                }}
                aria-label={t.ver_actividad_wenco(item.caex_id)}
                aria-haspopup="dialog"
                aria-controls={EQUIPMENT_ACTIVITY_DIALOG_ID}
                aria-expanded={activityTarget?.type === 'truck' && activityTarget.id === item.caex_id}
              >
                <span className="nm-shift-equip-visual">
                  <EquipmentImage id={item.caex_id} model={item.modelo} />
                </span>
                <div><h3>{item.caex_id}</h3><p>{item.modelo} / {tons(item.toneladas)} / {t.pct_del_promedio(item.porcentaje_promedio)}</p>{routeLabel(item, t) && <small>{routeLabel(item, t)}</small>}<small>{t.ultima_actividad_hace(min(item.minutos_sin_actividad))}</small><AnomalyBadge anomaly={anomalyByCaex.get(item.caex_id)} /></div>
                <span className="panel-tag">{item.estado}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="two-column nm-shift-equipment-grid">
        <div className="panel nm-shift-list-panel">
          <div className="panel-header"><div><span className="panel-kicker">{t.carguio}</span><h2>{t.rendimiento_por_uc}</h2></div><span className="panel-tag">{t.unidades_count(query.data.loadingUnits.length)}</span></div>
          <div className="nm-shift-equipment-list">
            {query.data.loadingUnits.map((item) => (
              <EquipmentRow
                key={item.carguio_id}
                id={item.carguio_id}
                model={item.modelo}
                value={item.toneladas}
                max={loadingMax}
                meta={`${tons(item.toneladas)} / ${item.rendimiento_tph.toLocaleString('es-CL')} tph`}
                sub={[routeLabel(item, t) ?? item.ubicacion, item.operador].filter(Boolean).join(' / ')}
                ucAnomalyCount={anomalyCountByUc.get(item.carguio_id)}
                onOpenActivity={() => setActivityTarget({ id: item.carguio_id, model: item.modelo, type: 'loader' })}
                activityOpen={activityTarget?.type === 'loader' && activityTarget.id === item.carguio_id}
              />
            ))}
          </div>
        </div>
        <div className="panel nm-shift-list-panel">
          <div className="panel-header"><div><span className="panel-kicker">{t.ranking_caex}</span><h2>{t.tonelaje_del_turno}</h2></div><span className="panel-tag">{t.top_12}</span></div>
          <div className="nm-shift-equipment-list">
            {query.data.caex.slice(0, 12).map((item) => (
              <EquipmentRow
                key={item.caex_id}
                id={item.caex_id}
                model={item.modelo}
                value={item.toneladas}
                max={caexMax}
                meta={`${tons(item.toneladas)} / ${t.ciclos_ton(item.ciclos)}`}
                sub={routeLabel(item, t)}
                rank={item.rank}
                anomaly={anomalyByCaex.get(item.caex_id)}
                onOpenActivity={() => setActivityTarget({ id: item.caex_id, model: item.modelo, type: 'truck' })}
                activityOpen={activityTarget?.type === 'truck' && activityTarget.id === item.caex_id}
              />
            ))}
          </div>
        </div>
      </section>

      {(data.caex_model_routes?.length ?? 0) > 0 && (
        <section className="panel">
          <div className="panel-header">
            <div><span className="panel-kicker">{t.rutas_por_modelo}</span><h2>{t.origen_destino_distancia}</h2></div>
            <span className="panel-tag">{t.modelos_count(data.caex_model_routes!.length)}</span>
          </div>
          <div className="nm-model-routes">
            {data.caex_model_routes!.map((group) => (
              <details key={group.modelo} className="nm-model-route-card">
                <summary>
                  <span className="nm-shift-equip-visual">
                    <EquipmentImage id="CAEX" model={group.modelo} />
                  </span>
                  <div>
                    <strong>{group.modelo}</strong>
                    <small>
                      {t.equipos_ton_desc(group.equipos, tons(group.toneladas), group.ciclos)}
                      {group.avg_distance_km != null ? ` / ${group.avg_distance_km.toLocaleString('es-CL', { maximumFractionDigits: 1 })} km/ciclo` : ''}
                    </small>
                  </div>
                  <span
                    className="nm-model-route-count"
                    title={`${group.rutas.length} rutas`}
                    aria-label={`${group.rutas.length} rutas`}
                  >
                    {group.rutas.length}
                  </span>
                </summary>
                <div className="nm-model-route-list">
                  {group.rutas.map((ruta) => (
                    <div key={`${ruta.origen}-${ruta.destino}`} className="nm-model-route-line">
                      <span className="nm-model-route-path">
                        <b>{ruta.fase}</b>
                        <small>{t.banco_malla(ruta.banco, ruta.malla)}</small>
                        <em>→ {ruta.destino}</em>
                      </span>
                      <span className="nm-model-route-stats">
                        <b>{tons(ruta.toneladas)}</b>
                        <small>
                          {t.desc_count(ruta.ciclos)}
                          {ruta.avg_distance_km != null ? ` · ${ruta.avg_distance_km.toLocaleString('es-CL', { maximumFractionDigits: 1 })} km/ciclo` : ''}
                        </small>
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {activityTarget && (
        <EquipmentActivityModal target={activityTarget} onClose={() => setActivityTarget(null)} />
      )}
    </div>
  )
}
