import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { Activity, Clock3, Download, Gauge, RadioTower, Timer, Truck } from 'lucide-react'
import { getCurrentShiftCommandCenter } from '../services/currentShiftService'
import { NorthmineAI } from '../components/ai/NorthmineAI'
import { secureApi } from '../lib/secureApi'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { ExecutiveKpiCard } from '../components/kpi/ExecutiveKpiCard'
import { EquipmentVisualCard } from '../components/equipment/EquipmentVisualCard'
import { EquipmentDetailDrawer } from '../components/equipment/detail/EquipmentDetailDrawer'
import { CommandButton } from '../components/ui/CommandButton'
import { axisLabel, formatNumber, formatTons, premiumPalette, tooltipBase } from '../components/charts/premium/chartTheme'
import type { CurrentShiftCaexStatus, CurrentShiftCommandCenter, CurrentShiftLoadingUnit } from '../lib/api'

const loaderColors = ['#00D4FF', '#00FF88', '#FFD100', '#FF6B00', '#7AA7C7']

function formatPct(value: number) {
  return `${value.toFixed(1)}%`
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function useClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return now
}

function stateClass(state: string) {
  if (state === 'OPERATIVO') return 'success'
  if (state === 'POSIBLE AVERIA') return 'critical'
  return 'warning'
}

function caexStateLabel(items: CurrentShiftCaexStatus[]) {
  return {
    operativos: items.filter((item) => item.estado === 'OPERATIVO').length,
    sinActividad: items.filter((item) => item.estado === 'SIN ACTIVIDAD').length,
    posibleAveria: items.filter((item) => item.estado === 'POSIBLE AVERIA').length,
  }
}

function activeCaexModels(items: CurrentShiftCaexStatus[]) {
  const models = [...new Set(
    items
      .filter((item) => item.estado === 'OPERATIVO')
      .map((item) => item.modelo)
      .filter(Boolean),
  )]
  return models.length ? models.join(' · ') : 'Sin modelos operativos'
}

function buildHourlyOption(data: CurrentShiftCommandCenter): EChartsOption {
  return {
    color: [premiumPalette.cyan, premiumPalette.mineral],
    animationDuration: 900,
    animationEasing: 'cubicOut',
    grid: { top: 28, right: 24, bottom: 42, left: 72 },
    tooltip: {
      ...tooltipBase(),
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params : [params]
        const first = rows[0] as { axisValue?: string }
        return [
          `<strong>${first?.axisValue ?? ''}</strong>`,
          ...rows.map((row) => {
            const current = row as { marker: string; seriesName: string; value: number }
            const value = current.seriesName === 'Acumulado' ? formatTons(current.value) : formatNumber(current.value)
            return `${current.marker}${current.seriesName}: <strong>${value}</strong>`
          }),
        ].join('<br/>')
      },
    },
    legend: { top: 0, right: 0, textStyle: { color: premiumPalette.muted, fontSize: 11 } },
    xAxis: {
      type: 'category',
      data: data.hourly.map((item) => item.label),
      axisLine: { lineStyle: { color: premiumPalette.grid } },
      axisTick: { show: false },
      axisLabel,
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: premiumPalette.grid } },
      axisLabel: { ...axisLabel, formatter: (value: number) => formatNumber(value) },
    },
    series: [
      {
        name: 'Toneladas',
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: {
          borderRadius: [7, 7, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#00D4FF' },
              { offset: 1, color: 'rgba(0,212,255,0.20)' },
            ],
          },
        },
        data: data.hourly.map((item) => item.toneladas),
      },
      {
        name: 'Acumulado',
        type: 'line',
        smooth: true,
        symbolSize: 6,
        lineStyle: { width: 3, color: '#00FF88', type: 'dashed' },
        data: data.hourly.map((item) => item.acumulado),
      },
    ],
  } as EChartsOption
}

function buildLoaderStackOption(data: CurrentShiftCommandCenter): EChartsOption {
  const labels = data.hourly.map((item) => item.label)
  const loaders = data.loading_units.map((item) => item.carguio_id)

  return {
    color: loaderColors,
    animationDuration: 850,
    animationEasing: 'cubicOut',
    grid: { top: 32, right: 18, bottom: 42, left: 72 },
    tooltip: tooltipBase(),
    legend: { top: 0, right: 0, textStyle: { color: premiumPalette.muted, fontSize: 11 } },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: premiumPalette.grid } },
      axisTick: { show: false },
      axisLabel,
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: premiumPalette.grid } },
      axisLabel: { ...axisLabel, formatter: (value: number) => formatNumber(value) },
    },
    series: loaders.map((loaderId) => ({
      name: loaderId,
      type: 'bar',
      stack: 'loader',
      barMaxWidth: 30,
      emphasis: { focus: 'series' },
      data: labels.map((label) => {
        const point = data.loader_hourly.find((item) => item.carguio_id === loaderId && item.label === label)
        return point?.toneladas ?? 0
      }),
    })),
  } as EChartsOption
}

function CaexRealtimePanel({ items, metaPct }: { items: CurrentShiftCaexStatus[]; metaPct: number }) {
  const counts = caexStateLabel(items)

  return (
    <section className="panel current-shift-equipment-panel">
      <div className="panel-header">
        <div><span className="panel-kicker">CAEX tiempo real</span><h2>Estado de flota</h2></div>
        <span className="panel-tag">{items.length} equipos</span>
      </div>
      <div className="shift-state-counters">
        <span className="state-success">Operativos <strong>{counts.operativos}</strong></span>
        <span className="state-warning">Sin actividad <strong>{counts.sinActividad}</strong></span>
        <span className="state-critical">Posible averia <strong>{counts.posibleAveria}</strong></span>
      </div>
      <div className="shift-caex-list">
        {items.slice(0, 18).map((item) => (
          <article key={item.caex_id} className={`shift-caex-row shift-state-${stateClass(item.estado)}`}>
            <span className="pulse-dot" />
            <div>
              <strong>{item.caex_id}</strong>
              <small>{item.modelo} / {item.ciclos} ciclos</small>
            </div>
            <span>Hace {formatMinutes(item.minutos_sin_actividad)}</span>
          </article>
        ))}
      </div>
      <div className="shift-meta-progress">
        <div><span>Avance vs meta turno</span><strong>{formatPct(metaPct)}</strong></div>
        <i><b style={{ width: `${Math.min(metaPct, 100)}%` }} /></i>
      </div>
    </section>
  )
}

function LoadingRealtimePanel({
  items,
  selectedEquipmentId,
  onSelect,
}: {
  items: CurrentShiftLoadingUnit[]
  selectedEquipmentId: string | null
  onSelect: (equipmentId: string) => void
}) {
  return (
    <section className="panel current-shift-equipment-panel">
      <div className="panel-header">
        <div><span className="panel-kicker">Palas y cargadores</span><h2>Unidades de carguio</h2></div>
        <span className="panel-tag">Click abre detalle</span>
      </div>
      <div className="shift-loader-grid">
        {items.map((item) => (
          <EquipmentVisualCard
            key={item.carguio_id}
            equipmentId={item.carguio_id}
            model={item.modelo}
            state={item.estado}
            toneladas={item.toneladas}
            ciclos={item.ciclos}
            tph={item.rendimiento_tph}
            operator={item.operador}
            location={item.ubicacion}
            onClick={() => onSelect(item.carguio_id)}
            selected={selectedEquipmentId === item.carguio_id}
          />
        ))}
      </div>
    </section>
  )
}

export function CurrentShift() {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null)
  const [loadingPDF, setLoadingPDF] = useState(false)
  const now = useClock()
  const query = useQuery({
    queryKey: ['current-shift-command-center'],
    queryFn: getCurrentShiftCommandCenter,
    refetchInterval: 60000,
  })

  const hourlyOption = useMemo(() => query.data ? buildHourlyOption(query.data) : undefined, [query.data])
  const loaderOption = useMemo(() => query.data ? buildLoaderStackOption(query.data) : undefined, [query.data])

  if (query.isLoading) return <LoadingState label="Cargando turno actual..." />
  if (query.isError || !query.data) return <ErrorState detail="No se pudo cargar /api/current-shift/command-center." />

  const data = query.data
  const activeModels = activeCaexModels(data.caex_status)
  const elapsedMinutes = Math.max(
    data.elapsed_minutes,
    Math.min(720, Math.floor((now.getTime() - new Date(data.started_at).getTime()) / 60000)),
  )
  const shiftTone = data.cumplimiento_pct >= 95 ? 'green' : data.cumplimiento_pct >= 80 ? 'amber' : 'red'

  const handleExportPDF = async () => {
    setLoadingPDF(true)
    try {
      const response = await secureApi.get<Blob>(`/api/report/shift-pdf?fecha=${encodeURIComponent(data.fecha)}&turno=${encodeURIComponent(data.turno)}`, {
        responseType: 'blob',
      })
      const blob = response.data
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `NORTHMINE_Turno_${data.turno}_${data.fecha}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoadingPDF(false)
    }
  }

  return (
    <>
      <div className="module-page current-shift-page">
        <ModuleHeader
          icon={Clock3}
          eyebrow="Turno Actual"
          title={data.shift_label}
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <CommandButton variant="secondary" onClick={() => { window.location.href = '/prediccion' }}>
                🤖 Ver Predicción ML
              </CommandButton>
              <CommandButton variant="industrial" icon={Download} loading={loadingPDF} onClick={handleExportPDF}>
                {loadingPDF ? 'Generando...' : 'Exportar PDF'}
              </CommandButton>
            </div>
          }
          description={`${new Date(data.started_at).toLocaleDateString('es-CL')} · ${new Date(data.started_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} -> ${new Date(data.ends_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`}
          meta={`Transcurrido ${formatMinutes(elapsedMinutes)} · ${now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
        />

        <section className={`current-shift-hero current-shift-${shiftTone} nm-turno-hero nm-turno-hero-${shiftTone}`}>
          <span className="nm-turno-hero-overlay" aria-hidden="true" />
          <div className="nm-turno-hero-copy">
            <span className="hero-kicker nm-turno-hero-kicker">Respuesta operacional inmediata</span>
            <h2 className="nm-turno-hero-title">{data.cumplimiento_pct >= 95 ? 'Vamos bien hoy' : data.cumplimiento_pct >= 80 ? 'Turno en seguimiento' : 'Turno bajo meta'}</h2>
            <p className="nm-turno-hero-subtitle">{formatTons(data.toneladas_turno)} producidas contra meta {formatTons(data.meta_turno)}.</p>
          </div>
          <strong className="nm-turno-hero-percentage">{formatPct(data.cumplimiento_pct)}</strong>
        </section>

        <section className="kpi-grid compact">
          <ExecutiveKpiCard title="Producción turno" value={formatTons(data.toneladas_turno)} subtitle={`Meta turno ${formatTons(data.meta_turno)}`} trend={formatTons(data.brecha_ton)} tone={shiftTone} icon={Activity} />
          <ExecutiveKpiCard title="Cumplimiento" value={formatPct(data.cumplimiento_pct)} subtitle="Avance contra meta del turno" trend={data.cumplimiento_pct >= 100 ? 'Óptimo' : data.projection.status} tone={shiftTone} icon={Gauge} />
          <ExecutiveKpiCard title="Ciclos" value={data.ciclos.toLocaleString('es-CL')} subtitle="Ciclos registrados en el turno" trend="turno" tone="cyan" icon={Timer} />
          <ExecutiveKpiCard title="CAEX activos" value={`${data.caex_activos}`} subtitle={`Modelos: ${activeModels}`} trend={`${data.caex_posible_averia} en revisión`} tone={data.caex_posible_averia > 0 ? 'amber' : 'green'} icon={Truck} />
          <ExecutiveKpiCard title="Promedio CAEX circuito" value={data.promedio_ton_ciclo.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} subtitle={`Modelos operativos: ${activeModels}`} trend="promedio turno" tone="slate" icon={RadioTower} />
        </section>

        <section className="two-column current-shift-equipment-grid">
          <CaexRealtimePanel items={data.caex_status} metaPct={data.cumplimiento_pct} />
          <LoadingRealtimePanel items={data.loading_units} selectedEquipmentId={selectedEquipmentId} onSelect={setSelectedEquipmentId} />
        </section>

        <section className="panel">
          <div className="panel-header">
            <div><span className="panel-kicker">Hora a hora</span><h2>Tonelaje y acumulado del turno</h2></div>
            <span className="panel-tag">Eje {data.turno === 'NOCHE' ? '19:00 -> 06:00' : '07:00 -> 18:00'}</span>
          </div>
          <div className="current-shift-chart">
            {hourlyOption && <ReactECharts option={hourlyOption} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} />}
          </div>
        </section>

        <section className="two-column current-shift-bottom-grid">
          <div className="panel">
            <div className="panel-header">
              <div><span className="panel-kicker">Resumen horario</span><h2>Tabla por hora</h2></div>
              <span className="panel-tag">{data.hourly[0]?.label} inicio</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Hora</th><th>Total(t)</th><th>Ciclos</th><th>Prom t/ciclo</th><th>Acumulado</th></tr></thead>
                <tbody>
                  {data.hourly.map((item) => (
                    <tr key={item.label}>
                      <td><strong>{item.label}</strong></td>
                      <td>{formatTons(item.toneladas)}</td>
                      <td>{item.ciclos.toLocaleString('es-CL')}</td>
                      <td>{item.promedio_ton_ciclo.toLocaleString('es-CL')}</td>
                      <td>{formatTons(item.acumulado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div><span className="panel-kicker">Produccion por pala</span><h2>Barras apiladas hora a hora</h2></div>
              <span className="panel-tag">Mismo eje del turno</span>
            </div>
            <div className="current-shift-chart compact-chart">
              {loaderOption && <ReactECharts option={loaderOption} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} />}
            </div>
          </div>
        </section>

        <section className={`panel shift-projection-panel ${data.projection.status === 'SOBRE META' ? 'projection-ok' : 'projection-risk'}`}>
          <div className="panel-header">
            <div><span className="panel-kicker">Proyeccion operacional</span><h2>{data.projection.model}</h2></div>
            <span className="panel-tag">{data.projection.status}</span>
          </div>
          <div className="shift-projection-grid">
            <span><small>Produccion actual</small><strong>{formatTons(data.projection.produccion_actual)}</strong></span>
            <span><small>Proyeccion final</small><strong>{formatTons(data.projection.proyeccion_final)}</strong></span>
            <span><small>Meta turno</small><strong>{formatTons(data.projection.meta_turno)}</strong></span>
            <span><small>Ritmo actual</small><strong>{formatTons(data.projection.ritmo_actual_tph)}/h</strong></span>
          </div>
          <div className="shift-meta-progress">
            <div><span>Tiempo transcurrido</span><strong>{formatPct(data.projection.elapsed_pct)}</strong></div>
            <i><b style={{ width: `${Math.min(data.projection.elapsed_pct, 100)}%` }} /></i>
          </div>
        </section>


      <NorthmineAI
        tipo="turno"
        label="Analizar turno"
        contexto={{
          turno: data.turno,
          fecha: data.fecha,
          hora_inicio: data.started_at ? new Date(data.started_at).getHours() : '',
          hora_fin: data.ends_at ? new Date(data.ends_at).getHours() : '',
          ton_turno: data.toneladas_turno,
          meta_turno: data.meta_turno,
          pct_meta: data.cumplimiento_pct,
          caex_activos: data.caex_activos,
          ciclos: data.ciclos,
          prom_ciclo: data.promedio_ton_ciclo,
          palas_activas: data.loading_units.length,
          n_alertas: data.caex_sin_actividad + data.caex_posible_averia,
          n_criticas: data.caex_posible_averia,
        }}
      />
      </div>

      <EquipmentDetailDrawer
        equipmentId={selectedEquipmentId}
        open={Boolean(selectedEquipmentId)}
        onClose={() => setSelectedEquipmentId(null)}
      />
    </>
  )
}
