import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Factory, Gauge, Route, Timer } from 'lucide-react'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { ExecutiveKpiCard } from '../components/kpi/ExecutiveKpiCard'
import { getLoadingUnitDistanceCycle, getLoadingUnitHourly, getLoadingUnitRanking, getLoadingUnitRoutes, getShiftExport } from '../lib/api'
import { useModuleT } from '../i18n/useModuleT'
import { loadingUnitsT } from '../i18n/modules/loadingUnits'

function tons(value: number) {
  return `${Math.round(value).toLocaleString('es-CL')} t`
}

function number(value: number, digits = 0) {
  return value.toLocaleString('es-CL', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

async function downloadCsv(setLoading: (value: boolean) => void) {
  setLoading(true)
  try {
    const blob = await getShiftExport('loading')
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'northmine_loading_units.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  } finally {
    setLoading(false)
  }
}

function UnitRow({ label, value, max, meta }: { label: string; value: number; max: number; meta: string }) {
  return (
    <article style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>{label}</strong><span>{meta}</span></div>
      <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', marginTop: 7, overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: `${Math.min(100, value / Math.max(max, 1) * 100)}%`, background: 'linear-gradient(90deg, #00D4FF, #00FF88)' }} /></div>
    </article>
  )
}

export function LoadingUnitsPage() {
  const t = useModuleT(loadingUnitsT)
  const [exporting, setExporting] = useState(false)
  const query = useQuery({
    queryKey: ['stage17-loading-units'],
    queryFn: async () => {
      const [ranking, hourly, distance, routes] = await Promise.all([
        getLoadingUnitRanking(),
        getLoadingUnitHourly(),
        getLoadingUnitDistanceCycle(),
        getLoadingUnitRoutes(),
      ])
      return { ranking, hourly, distance, routes }
    },
  })

  if (query.isLoading) return <LoadingState label={t.loading_label} />
  if (query.isError || !query.data) return <ErrorState detail={t.error_detail} />

  const data = query.data
  const top = data.ranking.items[0]
  const tonMax = Math.max(...data.ranking.items.map((item) => item.toneladas), 1)
  const distanceMax = Math.max(...data.distance.items.map((item) => item.distance_km), 1)
  const routeMax = Math.max(...data.routes.items.map((item) => item.toneladas), 1)
  const hourlyTotal = data.hourly.items.reduce((acc, item) => acc + item.toneladas, 0)

  return (
    <div className="module-page">
      <ModuleHeader
        icon={Factory}
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        meta="API /api/loading-units/*"
        actions={<button className="command-button command-button-secondary" type="button" onClick={() => downloadCsv(setExporting)} disabled={exporting}><Download size={15} /> {exporting ? t.exporting : t.export_csv}</button>}
      />

      <section className="kpi-grid compact">
        <ExecutiveKpiCard title={t.kpi_tonnage_title} value={tons(data.ranking.total_toneladas)} subtitle={t.kpi_tonnage_subtitle(data.ranking.count)} trend={t.kpi_tonnage_trend} tone="green" icon={Factory} />
        <ExecutiveKpiCard title={t.kpi_performance_title} value={`${number(data.ranking.rendimiento_promedio_tph, 1)} tph`} subtitle={t.kpi_performance_subtitle} trend={t.kpi_performance_trend} tone="cyan" icon={Gauge} />
        <ExecutiveKpiCard title={t.kpi_top_unit_title} value={top?.carguio_id ?? '-'} subtitle={top ? tons(top.toneladas) : t.kpi_top_unit_no_data} trend={top ? t.kpi_top_unit_trend(top.ciclos) : '-'} tone="green" icon={Timer} />
        <ExecutiveKpiCard title={t.kpi_distance_title} value={`${number(data.distance.items.reduce((acc, item) => acc + item.distance_km, 0), 1)} km`} subtitle={t.kpi_distance_subtitle} trend={t.kpi_distance_trend(number(hourlyTotal, 0))} tone="slate" icon={Route} />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header"><div><span className="panel-kicker">{t.ranking_kicker}</span><h2>{t.ranking_title}</h2></div><span className="panel-tag">{t.ranking_tag(data.ranking.count)}</span></div>
          {data.ranking.items.map((item) => <UnitRow key={item.carguio_id} label={item.carguio_id} value={item.toneladas} max={tonMax} meta={`${tons(item.toneladas)} / ${number(item.rendimiento_tph, 1)} tph`} />)}
        </div>
        <div className="panel">
          <div className="panel-header"><div><span className="panel-kicker">{t.distance_kicker}</span><h2>{t.distance_title}</h2></div><span className="panel-tag">{t.distance_tag}</span></div>
          {data.distance.items.map((item) => <UnitRow key={item.carguio_id} label={item.carguio_id} value={item.distance_km} max={distanceMax} meta={`${number(item.avg_distance_km, 2)} km/ciclo / ${number(item.toneladas_por_ciclo, 1)} t`} />)}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header"><div><span className="panel-kicker">{t.routes_kicker}</span><h2>{t.routes_title}</h2></div><span className="panel-tag">{t.routes_tag(Math.min(data.routes.items.length, 12))}</span></div>
        {data.routes.items.slice(0, 12).map((item) => <UnitRow key={`${item.carguio_id}-${item.origin}-${item.destination}`} label={item.carguio_id ?? 'UC'} value={item.toneladas} max={routeMax} meta={`${item.origin} -> ${item.destination} / ${tons(item.toneladas)} / ${number(item.avg_distance_km, 2)} km`} />)}
      </section>
    </div>
  )
}
