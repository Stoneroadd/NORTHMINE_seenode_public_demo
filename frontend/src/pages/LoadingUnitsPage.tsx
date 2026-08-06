import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Factory, Gauge, Route, Timer } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { ExecutiveKpiCard } from '../components/kpi/ExecutiveKpiCard'
import { getLoadingUnitDistanceCycle, getLoadingUnitHourly, getLoadingUnitRanking, getLoadingUnitRoutes, getShiftExport } from '../lib/api'
import { useModuleT } from '../i18n/useModuleT'
import { loadingUnitsT } from '../i18n/modules/loadingUnits'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { useAgentWidget } from '../lib/agentRegistry/useAgentWidget'

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

function AnimatedMetric({ value, digits = 0, suffix = '', delay = 0 }: { value: number; digits?: number; suffix?: string; delay?: number }) {
  const reducedMotion = useReducedMotion()
  const { value: animated, ref } = useAnimatedNumber(value, {
    durationMs: 900 + delay,
    initialValue: 0,
    enabled: !reducedMotion,
  })
  return <span ref={ref}>{number(animated, digits)}{suffix}</span>
}

interface UnitRowProps {
  label: string
  value: number
  max: number
  index: number
  primaryValue: number
  primaryDigits?: number
  primarySuffix: string
  secondaryValue?: number
  secondaryDigits?: number
  secondarySuffix?: string
  context?: string
  tone?: 'cyan' | 'green' | 'purple'
}

function UnitRow({ label, value, max, index, primaryValue, primaryDigits = 0, primarySuffix, secondaryValue, secondaryDigits = 1, secondarySuffix = '', context, tone = 'cyan' }: UnitRowProps) {
  const reducedMotion = useReducedMotion()
  const percent = Math.min(100, value / Math.max(max, 1) * 100)
  const delay = Math.min(index * 0.07, 0.56)

  return (
    <motion.article
      className={`nm-loading-row is-${tone}`}
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay, ease: 'easeOut' }}
    >
      <div className="nm-loading-row-head">
        <strong>{label}</strong>
        <span>
          {context && <small>{context}</small>}
          <b><AnimatedMetric value={primaryValue} digits={primaryDigits} suffix={primarySuffix} delay={index * 35} /></b>
          {typeof secondaryValue === 'number' && <em>/ <AnimatedMetric value={secondaryValue} digits={secondaryDigits} suffix={secondarySuffix} delay={index * 35} /></em>}
        </span>
      </div>
      <div className="nm-loading-track" aria-hidden="true">
        <motion.i
          initial={reducedMotion ? false : { width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </motion.article>
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
    refetchInterval: 60000,
  })

  const loadingDataRef = useRef(query.data)
  loadingDataRef.current = query.data
  useAgentWidget({
    id: 'loading-rate-chart',
    moduleId: 'carguio',
    type: 'table',
    label: 'Tasa de carguío por pala',
    description: 'Toneladas, ciclos y rendimiento (t/h) de cada unidad de carguio del turno.',
    supportedActions: ['focus_widget', 'explain_widget'],
    getSnapshot: () => {
      const items = loadingDataRef.current?.ranking.items ?? []
      return {
        widgetId: 'loading-rate-chart',
        type: 'table',
        label: 'Tasa de carguío por pala',
        updatedAt: new Date().toISOString(),
        rowCount: items.length,
        totalToneladas: loadingDataRef.current?.ranking.total_toneladas ?? 0,
        rendimientoPromedioTph: loadingDataRef.current?.ranking.rendimiento_promedio_tph ?? 0,
        rows: items.map((item) => ({ id: item.carguio_id, toneladas: item.toneladas, rendimientoTph: item.rendimiento_tph, estado: item.estado })),
      }
    },
  })

  if (query.isLoading) return <LoadingState label={t.loading_label} />
  if (query.isError || !query.data) return <ErrorState detail={t.error_detail} onRetry={() => query.refetch()} />

  const data = query.data
  const top = data.ranking.items[0]
  const tonMax = Math.max(...data.ranking.items.map((item) => item.toneladas), 1)
  const distanceMax = Math.max(...data.distance.items.map((item) => item.distance_km), 1)
  const routeMax = Math.max(...data.routes.items.map((item) => item.toneladas), 1)
  const hourlyTotal = data.hourly.items.reduce((acc, item) => acc + item.toneladas, 0)

  return (
    <div className="module-page loading-units-page">
      <ModuleHeader
        icon={Factory}
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        meta="API /api/loading-units/*"
        actions={<button className="command-button command-button-secondary" type="button" onClick={() => downloadCsv(setExporting)} disabled={exporting}><Download size={15} /> {exporting ? t.exporting : t.export_csv}</button>}
      />

      <section className="kpi-grid compact loading-kpi-grid">
        <ExecutiveKpiCard title={t.kpi_tonnage_title} value={tons(data.ranking.total_toneladas)} subtitle={t.kpi_tonnage_subtitle(data.ranking.count)} trend={t.kpi_tonnage_trend} tone="green" icon={Factory} />
        <ExecutiveKpiCard title={t.kpi_performance_title} value={`${number(data.ranking.rendimiento_promedio_tph, 1)} tph`} subtitle={t.kpi_performance_subtitle} trend={t.kpi_performance_trend} tone="cyan" icon={Gauge} />
        <ExecutiveKpiCard title={t.kpi_top_unit_title} value={top?.carguio_id ?? '-'} subtitle={top ? tons(top.toneladas) : t.kpi_top_unit_no_data} trend={top ? t.kpi_top_unit_trend(top.ciclos) : '-'} tone="green" icon={Timer} />
        <ExecutiveKpiCard title={t.kpi_distance_title} value={`${number(data.distance.items.reduce((acc, item) => acc + item.distance_km, 0), 1)} km`} subtitle={t.kpi_distance_subtitle} trend={t.kpi_distance_trend(number(hourlyTotal, 0))} tone="slate" icon={Route} />
      </section>

      <section className="two-column loading-visual-grid">
        <div className="panel loading-animated-panel">
          <div className="panel-header"><div><span className="panel-kicker">{t.ranking_kicker}</span><h2>{t.ranking_title}</h2></div><span className="panel-tag">{t.ranking_tag(data.ranking.count)}</span></div>
          <div className="nm-loading-list">
            {data.ranking.items.map((item, index) => <UnitRow key={item.carguio_id} index={index} label={item.carguio_id} value={item.toneladas} max={tonMax} primaryValue={item.toneladas} primarySuffix=" t" secondaryValue={item.rendimiento_tph} secondaryDigits={1} secondarySuffix=" tph" tone="cyan" />)}
          </div>
        </div>
        <div className="panel loading-animated-panel">
          <div className="panel-header"><div><span className="panel-kicker">{t.distance_kicker}</span><h2>{t.distance_title}</h2></div><span className="panel-tag">{t.distance_tag}</span></div>
          <div className="nm-loading-list">
            {data.distance.items.map((item, index) => <UnitRow key={item.carguio_id} index={index} label={item.carguio_id} value={item.distance_km} max={distanceMax} primaryValue={item.avg_distance_km} primaryDigits={2} primarySuffix=" km/ciclo" secondaryValue={item.toneladas_por_ciclo} secondaryDigits={1} secondarySuffix=" t" tone="green" />)}
          </div>
        </div>
      </section>

      <section className="panel loading-animated-panel loading-routes-panel">
        <div className="panel-header"><div><span className="panel-kicker">{t.routes_kicker}</span><h2>{t.routes_title}</h2></div><span className="panel-tag">{t.routes_tag(Math.min(data.routes.items.length, 12))}</span></div>
        <div className="nm-loading-list nm-loading-route-list">
          {data.routes.items.slice(0, 12).map((item, index) => <UnitRow key={`${item.carguio_id}-${item.origin}-${item.destination}`} index={index} label={item.carguio_id ?? 'UC'} value={item.toneladas} max={routeMax} context={`${item.origin} → ${item.destination}`} primaryValue={item.toneladas} primarySuffix=" t" secondaryValue={item.avg_distance_km} secondaryDigits={2} secondarySuffix=" km" tone="purple" />)}
        </div>
      </section>
    </div>
  )
}
