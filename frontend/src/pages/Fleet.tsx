import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { CheckCircle2, Clipboard, Gauge, Medal, ShieldCheck, Timer, Truck } from 'lucide-react'
import { getFleetFull } from '../services/fleetService'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import { ExecutiveKpiCard } from '../components/kpi/ExecutiveKpiCard'
import { EquipmentDetailDrawer } from '../components/equipment/detail/EquipmentDetailDrawer'
import { axisLabel, formatNumber, formatTons, premiumPalette, tooltipBase } from '../components/charts/premium/chartTheme'
import type { FleetFullRankingItem, FleetFullResponse } from '../lib/api'
import { AnalysisFilterBar } from '../components/filters/AnalysisFilterBar'
import { useAnalysisFilters } from '../hooks/useAnalysisFilters'

type SortKey = keyof Pick<FleetFullRankingItem, 'rank' | 'caex_id' | 'modelo' | 'toneladas' | 'ciclos' | 'tph' | 'eficiencia_pct' | 'estado'>
type SortDirection = 'asc' | 'desc'

const statusFilters = ['TODOS', 'ACTIVO', 'SIN ACTIVIDAD', 'MANTENCION', 'DEMORA']
const statusColors: Record<string, string> = {
  ACTIVO: '#00FF88',
  'SIN ACTIVIDAD': '#FFD100',
  MANTENCION: '#FF2D55',
  DEMORA: 'rgba(255,255,255,0.36)',
}

function efficiencyTone(value: number) {
  if (value >= 85) return 'success'
  if (value >= 70) return 'warning'
  return 'critical'
}

function statusMark(status: string) {
  const normalized = status.toUpperCase()
  if (normalized.includes('MANT') || normalized.includes('SIN ACTIVIDAD')) return 'NO OPERATIVO'
  if (normalized.includes('DEMORA')) return 'REVISAR'
  return 'OPERATIVO'
}

function buildFleetStatusText(data: FleetFullResponse) {
  const groups = data.ranking.reduce<Record<string, FleetFullRankingItem[]>>((acc, item) => {
    acc[item.modelo] = acc[item.modelo] ? [...acc[item.modelo], item] : [item]
    return acc
  }, {})
  const generatedAt = new Date().toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const lines = [
    `*NORTHMINE - Status CAEX*`,
    `Generado: ${generatedAt}`,
    `Fuente: ${data.source.toUpperCase()} / Ventana ${data.dias} dias`,
    `Resumen: ${data.estado_flota.activo} activos, ${data.estado_flota.sin_actividad} sin actividad, ${data.estado_flota.mantencion} mantencion, ${data.estado_flota.demora} demora`,
    '',
  ]

  Object.entries(groups).forEach(([model, items]) => {
    lines.push(`*${model} (${items.length})*`)
    items
      .sort((a, b) => a.caex_id.localeCompare(b.caex_id))
      .forEach((item) => {
        lines.push(`${item.caex_id}= ${statusMark(item.estado)} / ${item.estado} / ${formatTons(item.toneladas)} / ${formatNumber(item.ciclos)} ciclos`)
      })
    lines.push('')
  })

  lines.push('Nota: /api/fleet/full expone ranking CAEX. UC y apoyo deben integrarse a este status cuando el backend entregue esas familias.')
  return lines.join('\n')
}

function buildStatusOption(data: FleetFullResponse): EChartsOption {
  const rows = [
    { name: 'ACTIVO', value: data.estado_flota.activo, color: statusColors.ACTIVO },
    { name: 'SIN ACTIVIDAD', value: data.estado_flota.sin_actividad, color: statusColors['SIN ACTIVIDAD'] },
    { name: 'MANTENCION', value: data.estado_flota.mantencion, color: statusColors.MANTENCION },
    { name: 'DEMORA', value: data.estado_flota.demora, color: statusColors.DEMORA },
  ]
  const total = rows.reduce((acc, item) => acc + item.value, 0)

  return {
    color: rows.map((item) => item.color),
    animationDuration: 850,
    tooltip: {
      ...tooltipBase(),
      formatter: (params: unknown) => {
        const row = params as { name: string; value: number }
        return `<strong>${row.name}</strong><br/>${row.value} equipos (${formatNumber(row.value / Math.max(total, 1) * 100, 1)}%)`
      },
    },
    legend: { bottom: 0, textStyle: { color: premiumPalette.muted, fontSize: 11 } },
    series: [
      {
        type: 'pie',
        radius: ['52%', '76%'],
        center: ['50%', '43%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#020403', borderWidth: 2 },
        label: { color: premiumPalette.text, formatter: '{b}\n{c}' },
        data: rows.map((item) => ({ name: item.name, value: item.value })),
      },
    ],
  } as EChartsOption
}

function buildModelOption(data: FleetFullResponse): EChartsOption {
  const rows = [...data.por_modelo].sort((a, b) => a.eficiencia_pct - b.eficiencia_pct)
  return {
    animationDuration: 850,
    grid: { top: 16, right: 34, bottom: 28, left: 100 },
    tooltip: {
      ...tooltipBase(),
      formatter: (params: unknown) => {
        const row = params as { dataIndex: number }
        const item = rows[row.dataIndex]
        return `<strong>${item.modelo}</strong><br/>${item.equipos} equipos<br/>Mejor CAEX: ${item.mejor_caex}<br/>Nominal ${item.t_ciclo_nominal} t/ciclo · Real ${item.t_ciclo_real} t/ciclo`
      },
    },
    xAxis: {
      type: 'value',
      max: 100,
      splitLine: { lineStyle: { color: premiumPalette.grid } },
      axisLabel: { ...axisLabel, formatter: (value: number) => `${value}%` },
    },
    yAxis: {
      type: 'category',
      data: rows.map((item) => item.modelo),
      axisLine: { lineStyle: { color: premiumPalette.grid } },
      axisTick: { show: false },
      axisLabel,
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 24,
        data: rows.map((item) => ({
          value: item.eficiencia_pct,
          itemStyle: { borderRadius: [0, 7, 7, 0], color: item.eficiencia_pct >= 90 ? '#00FF88' : '#00D4FF' },
        })),
        label: {
          show: true,
          position: 'right',
          color: premiumPalette.text,
          formatter: (params: { dataIndex: number }) => {
            const item = rows[params.dataIndex]
            return `${item.eficiencia_pct}% · ${item.equipos} eq · avg ${item.t_ciclo_real} t/ciclo`
          },
        },
      },
    ],
  } as EChartsOption
}

function buildCycleOption(data: FleetFullResponse): EChartsOption {
  const rows = [...data.tiempo_ciclos].sort((a, b) => a.tiempo_ciclo_min - b.tiempo_ciclo_min)
  return {
    animationDuration: 850,
    grid: { top: 18, right: 28, bottom: 30, left: 86 },
    tooltip: tooltipBase(),
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: premiumPalette.grid } },
      axisLabel: { ...axisLabel, formatter: (value: number) => `${value}m` },
    },
    yAxis: {
      type: 'category',
      data: rows.map((item) => item.caex_id),
      axisLine: { lineStyle: { color: premiumPalette.grid } },
      axisTick: { show: false },
      axisLabel,
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 22,
        data: rows.map((item) => ({
          value: item.tiempo_ciclo_min,
          itemStyle: {
            borderRadius: [0, 7, 7, 0],
            color: item.tiempo_ciclo_min > 16.25 ? '#FF2D55' : item.tiempo_ciclo_min < 12.5 ? '#00FF88' : '#FFD100',
          },
        })),
        markLine: {
          symbol: 'none',
          lineStyle: { color: '#FFFFFF', type: 'dashed' },
          label: { color: premiumPalette.text, formatter: 'Prom 12.5m' },
          data: [{ xAxis: 12.5 }],
        },
        label: {
          show: true,
          position: 'right',
          color: premiumPalette.text,
          formatter: (params: { value: number }) => `${formatNumber(params.value, 1)} min`,
        },
      },
    ],
  } as EChartsOption
}

export function Fleet() {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null)
  const [status, setStatus] = useState('TODOS')
  const [search, setSearch] = useState('')
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const analysisFilters = useAnalysisFilters({}, 'northmine:filters:fleet')
  const { appliedFilters } = analysisFilters
  const query = useQuery({ queryKey: ['fleet-full', 7, appliedFilters], queryFn: () => getFleetFull(7, appliedFilters) })

  const statusOption = useMemo(() => query.data ? buildStatusOption(query.data) : undefined, [query.data])
  const modelOption = useMemo(() => query.data ? buildModelOption(query.data) : undefined, [query.data])
  const cycleOption = useMemo(() => query.data ? buildCycleOption(query.data) : undefined, [query.data])
  const fleetStatusText = useMemo(() => query.data ? buildFleetStatusText(query.data) : '', [query.data])

  const filtered = useMemo(() => {
    const rows = query.data?.ranking ?? []
    const normalizedSearch = search.trim().toUpperCase()
    const filteredRows = rows.filter((item) => {
      const matchesStatus = status === 'TODOS' || item.estado === status
      const matchesSearch = !normalizedSearch || item.caex_id.includes(normalizedSearch) || item.modelo.includes(normalizedSearch)
      return matchesStatus && matchesSearch
    })

    return [...filteredRows].sort((a, b) => {
      const left = a[sortKey]
      const right = b[sortKey]
      const direction = sortDirection === 'asc' ? 1 : -1
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction
      return String(left).localeCompare(String(right)) * direction
    })
  }, [query.data?.ranking, search, sortDirection, sortKey, status])

  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visibleRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const topTons = query.data?.top5[0]?.toneladas ?? 1

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortKey(key)
    setSortDirection(key === 'rank' ? 'asc' : 'desc')
  }

  if (query.isLoading) return <LoadingState label="Cargando flota completa..." />
  if (query.isError || !query.data) return <ErrorState detail="No se pudo cargar /api/fleet/full." />

  const data = query.data
  const copyFleetStatus = async () => {
    try {
      await navigator.clipboard.writeText(fleetStatusText)
      setCopyMessage('Status copiado para WhatsApp.')
    } catch {
      setCopyMessage('No se pudo copiar automaticamente. Selecciona el texto manualmente.')
    }
  }

  return (
    <>
      <div className="module-page fleet-full-page">
        <ModuleHeader
          icon={Truck}
          eyebrow="Flota completa"
          title="Ranking CAEX y eficiencia operacional"
          description="Ranking CAEX con estado, eficiencia por modelo y tiempos entre ciclos desde datos reales."
          meta={`${data.dias} dias`}
          actions={
            <div className="filter-bar">
              {statusFilters.map((filter) => (
                <button key={filter} className={status === filter ? 'active' : ''} onClick={() => { setStatus(filter); setPage(1) }}>
                  {filter}
                </button>
              ))}
            </div>
          }
        />

        <AnalysisFilterBar
          title="Filtros flota"
          fields={['startDate', 'endDate', 'shift', 'caexId', 'model', 'status', 'operatorId', 'origin', 'destination']}
          loading={query.isFetching}
          {...analysisFilters}
        />

        <section className="kpi-grid compact">
          <ExecutiveKpiCard title="CAEX totales" value={`${data.resumen.total_caex}`} subtitle="Flota operacional" trend="100% cubierta" tone="cyan" icon={Truck} />
          <ExecutiveKpiCard title="Disponibilidad" value={`${data.resumen.disponibilidad.toFixed(1)}%`} subtitle="Fisica estimada" trend={`${data.estado_flota.mantencion} mant.`} tone="green" icon={ShieldCheck} />
          <ExecutiveKpiCard title="Prom/ciclo" value={`${data.resumen.prom_ciclo} t`} subtitle="Toneladas promedio" trend="flota" tone="slate" icon={Gauge} />
          <ExecutiveKpiCard title="Ciclos/hora" value={`${data.resumen.ciclos_hora}`} subtitle="Promedio flota" trend="operacional" tone="amber" icon={Timer} />
        </section>

        <section className="fleet-status-board panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Status final de turno</span>
              <h2>CAEX operativo copiable</h2>
            </div>
            <div className="fleet-status-actions">
              <span className="panel-tag">REAL / {data.source.toUpperCase()}</span>
              <button className="command-button command-button-secondary" type="button" onClick={copyFleetStatus}>
                <Clipboard size={15} /> Copiar para WhatsApp
              </button>
            </div>
          </div>
          <div className="fleet-status-summary">
            <span><CheckCircle2 size={14} /> {data.estado_flota.activo} activos</span>
            <span>{data.estado_flota.sin_actividad} sin actividad</span>
            <span>{data.estado_flota.mantencion} mantencion</span>
            <span>{data.estado_flota.demora} demora</span>
          </div>
          <pre className="fleet-status-copy" aria-label="Status CAEX copiable">{fleetStatusText}</pre>
          {copyMessage && <small className="fleet-status-message">{copyMessage}</small>}
        </section>

        <section className="panel fleet-podium-panel">
          <div className="panel-header">
            <div><span className="panel-kicker">Top 5 CAEX</span><h2>Podio operacional</h2></div>
            <span className="panel-tag">Click abre detalle</span>
          </div>
          <div className="fleet-podium-grid">
            {data.top5.map((item, index) => (
              <button key={item.caex_id} className={`fleet-podium-card podium-${index + 1}`} type="button" onClick={() => setSelectedEquipmentId(item.caex_id)}>
                <span className="podium-rank">{index < 3 ? <Medal size={18} /> : `${index + 1}.`}</span>
                <span><strong>{item.caex_id}</strong><small>{item.modelo}</small></span>
                <span><strong>{formatTons(item.toneladas)}</strong><small>{formatNumber(item.ciclos)} ciclos</small></span>
                <span className="fleet-inline-progress"><i style={{ width: `${item.toneladas / topTons * 100}%` }} /></span>
                <b className={`fleet-status-pill fleet-status-${item.estado.toLowerCase().replace(/\s+/g, '-')}`}>{item.estado}</b>
              </button>
            ))}
          </div>
        </section>

        <section className="two-column fleet-full-grid">
          <div className="panel">
            <div className="panel-header"><div><span className="panel-kicker">Estado</span><h2>Distribucion de flota</h2></div><span className="panel-tag">Click filtra</span></div>
            <div className="fleet-chart">
              {statusOption && (
                <ReactECharts
                  option={statusOption}
                  notMerge
                  lazyUpdate
                  style={{ width: '100%', height: '100%' }}
                  onEvents={{ click: (params: { name?: string }) => { if (params.name) { setStatus(params.name); setPage(1) } } }}
                />
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><div><span className="panel-kicker">Modelo</span><h2>Eficiencia por modelo</h2></div></div>
            <div className="fleet-chart">
              {modelOption && <ReactECharts option={modelOption} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} />}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div><span className="panel-kicker">Ranking completo</span><h2>38 CAEX</h2></div>
            <div className="fleet-table-tools">
              <input value={search} onChange={(event) => { setSearch(event.target.value.toUpperCase()); setPage(1) }} placeholder="Buscar CAEX o modelo" />
              <span className="panel-tag">{filtered.length} visibles</span>
            </div>
          </div>
          {!visibleRows.length ? <EmptyState /> : (
            <>
              <div className="table-wrap fleet-ranking-table">
                <table>
                  <thead>
                    <tr>
                      {[
                        ['rank', '#'],
                        ['caex_id', 'CAEX'],
                        ['modelo', 'Modelo'],
                        ['toneladas', 'Tonelaje'],
                        ['ciclos', 'Ciclos'],
                        ['tph', 'T/Hora'],
                        ['eficiencia_pct', 'Efic%'],
                        ['estado', 'Estado'],
                      ].map(([key, label]) => (
                        <th key={key}>
                          <button type="button" onClick={() => handleSort(key as SortKey)}>
                            {label} {sortKey === key ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((item) => (
                      <tr key={item.caex_id} onClick={() => setSelectedEquipmentId(item.caex_id)}>
                        <td>{item.rank}</td>
                        <td><strong>{item.caex_id}</strong></td>
                        <td>{item.modelo}</td>
                        <td>
                          <div className="fleet-ton-cell">
                            <span>{formatTons(item.toneladas)}</span>
                            <i><b style={{ width: `${item.toneladas / topTons * 100}%` }} /></i>
                          </div>
                        </td>
                        <td>{formatNumber(item.ciclos)}</td>
                        <td>{formatNumber(item.tph, 1)}</td>
                        <td><span className={`efficiency-pill efficiency-${efficiencyTone(item.eficiencia_pct)}`}>{item.eficiencia_pct}%</span></td>
                        <td><span className={`fleet-status-pill fleet-status-${item.estado.toLowerCase().replace(/\s+/g, '-')}`}>{item.estado}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="fleet-pagination">
                <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button>
                <span>Pagina {page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Siguiente</button>
              </div>
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-header"><div><span className="panel-kicker">Ciclos lentos</span><h2>Top 15 mayor tiempo entre ciclos</h2></div><span className="panel-tag">Promedio 12.5 min</span></div>
          <div className="fleet-chart tall">
            {cycleOption && (
              <ReactECharts
                option={cycleOption}
                notMerge
                lazyUpdate
                style={{ width: '100%', height: '100%' }}
                onEvents={{ click: (params: { name?: string }) => params.name && setSelectedEquipmentId(params.name) }}
              />
            )}
          </div>
        </section>
      </div>

      <EquipmentDetailDrawer
        equipmentId={selectedEquipmentId}
        open={Boolean(selectedEquipmentId)}
        onClose={() => setSelectedEquipmentId(null)}
      />
    </>
  )
}
