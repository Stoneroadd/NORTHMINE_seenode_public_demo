import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { AlertTriangle, BookOpen, ClipboardCheck, Download, ShieldAlert, Target, Timer, Trophy, Users } from 'lucide-react'
import { AnalysisFilterBar } from '../components/filters/AnalysisFilterBar'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import { OperatorDelayPatternPanel } from '../components/operator-ranking/OperatorDelayPatternPanel'
import { OperatorAuditDrawer } from '../components/operator-ranking/OperatorAuditDrawer'
import { OperatorMethodologyModal } from '../components/operator-ranking/OperatorMethodologyModal'
import { OperatorRankingDrawer } from '../components/operator-ranking/OperatorRankingDrawer'
import { OperatorRankingKpis } from '../components/operator-ranking/OperatorRankingKpis'
import { OperatorRankingTable } from '../components/operator-ranking/OperatorRankingTable'
import { OperatorRiskBadge } from '../components/operator-ranking/OperatorRiskBadge'
import { OperatorTrendChart } from '../components/operator-ranking/OperatorTrendChart'
import { useAnalysisFilters } from '../hooks/useAnalysisFilters'
import {
  exportOperatorRankingCsv,
  getOperatorDelayPatterns,
  getOperatorRankingGlobal,
  getOperatorRankingTrends,
} from '../services/operatorRankingService'
import type { OperatorRankingItem } from '../types/operatorRanking'
import { axisLabel, formatNumber, premiumPalette, tooltipBase, useChartPaletteKey } from '../components/charts/premium/chartTheme'
import { useModuleT } from '../i18n/useModuleT'
import { operatorRankingT, type OperatorRankingT } from '../i18n/modules/operatorRanking'
import { useAgentWidget } from '../lib/agentRegistry/useAgentWidget'
import { useAgentEntityHandler } from '../lib/agentRegistry/useAgentEntityHandler'
import { formatTons } from '../lib/format'

function formatHours(value: number) {
  return `${Math.round((value || 0) / 60).toLocaleString('es-CL')} h`
}

function cleanCause(t: OperatorRankingT, value: string) {
  return String(value || t.sin_causa).replace(/^O\d+\s/, '').replace(/^S\d+\s/, '')
}

function dataModeLabel(t: OperatorRankingT, mode?: string) {
  if (mode === 'real_wenco_sql') return 'REAL WENCO / SQL'
  return mode ? mode.toUpperCase() : t.sin_modo
}

function scoreColor(score: number) {
  if (score >= 90) return premiumPalette.mineral
  if (score >= 80) return premiumPalette.cyan
  if (score >= 70) return premiumPalette.amber
  if (score >= 60) return '#FF8A00'
  return premiumPalette.red
}

function buildScoreBars(items: OperatorRankingItem[]): EChartsOption {
  const rows = [...items].sort((a, b) => a.score_global - b.score_global)
  return {
    animationDuration: 850,
    grid: { top: 18, right: 36, bottom: 32, left: 116 },
    tooltip: tooltipBase(),
    xAxis: {
      type: 'value',
      max: 100,
      splitLine: { lineStyle: { color: premiumPalette.grid } },
      axisLabel: { ...axisLabel, formatter: (value: number) => `${value}` },
    },
    yAxis: {
      type: 'category',
      data: rows.map((item) => item.operator_name),
      axisLabel,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: premiumPalette.grid } },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 22,
        data: rows.map((item) => ({
          value: item.score_global,
          itemStyle: { color: scoreColor(item.score_global), borderRadius: [0, 7, 7, 0] },
        })),
        label: {
          show: true,
          position: 'right',
          color: premiumPalette.text,
          formatter: (params: unknown) => {
            const value = Number((params as { value?: unknown }).value ?? 0)
            return formatNumber(value, 1)
          },
        },
      },
    ],
  }
}

function buildScatter(t: OperatorRankingT, items: OperatorRankingItem[]): EChartsOption {
  return {
    animationDuration: 850,
    grid: { top: 28, right: 28, bottom: 42, left: 54 },
    tooltip: {
      ...tooltipBase(),
      formatter: (params: unknown) => {
        const row = params as { data: [number, number, number, string] }
        return t.chart_tooltip_scatter(row.data[3], row.data[0], row.data[1], row.data[2])
      },
    },
    xAxis: {
      type: 'value',
      name: t.chart_productividad,
      max: 105,
      axisLabel: { ...axisLabel, formatter: (value: number) => `${value}%` },
      splitLine: { lineStyle: { color: premiumPalette.grid } },
    },
    yAxis: {
      type: 'value',
      name: t.chart_demoras,
      axisLabel: { ...axisLabel, formatter: (value: number) => `${Math.round(value)}m` },
      splitLine: { lineStyle: { color: premiumPalette.grid } },
    },
    series: [
      {
        type: 'scatter',
        symbolSize: (value: unknown) => {
          const row = value as [number, number, number]
          return Math.max(10, Math.min(28, row[2] / 3.5))
        },
        data: items.map((item) => [item.productividad_score, item.manageable_delay_minutes, item.score_global, item.operator_name]),
        itemStyle: { color: '#FFCC33', shadowBlur: 12, shadowColor: 'rgba(255,204,51,0.35)' },
      },
    ],
  }
}

function riskRank(item: OperatorRankingItem) {
  const risk = String(item.risk_level || '').toUpperCase()
  if (risk === 'CRITICO') return 4
  if (risk === 'RIESGO_ALTO') return 3
  if (risk === 'SEGUIMIENTO') return 2
  if (risk === 'BUENO') return 1
  return 0
}

function buildOperatorExecutiveRead(items: OperatorRankingItem[]) {
  const best = [...items].sort((a, b) => b.score_global - a.score_global)[0] ?? null
  const risk = [...items].sort((a, b) => {
    const riskDiff = riskRank(b) - riskRank(a)
    if (riskDiff !== 0) return riskDiff
    return b.lost_tons_estimated - a.lost_tons_estimated
  })[0] ?? null
  const delayLeader = [...items].sort((a, b) => b.manageable_delay_minutes - a.manageable_delay_minutes)[0] ?? null
  const scoreSpread = items.length
    ? Math.max(...items.map((item) => item.score_global)) - Math.min(...items.map((item) => item.score_global))
    : 0

  return { best, risk, delayLeader, scoreSpread }
}

function priorityScore(item: OperatorRankingItem) {
  return riskRank(item) * 1_000_000
    + Number(item.lost_tons_estimated || 0) * 3
    + Number(item.manageable_delay_minutes || 0)
    + Math.max(0, 100 - Number(item.score_global || 0)) * 100
}

function buildOperatorPriorities(items: OperatorRankingItem[]) {
  return [...items]
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, 5)
}

function buildProductivityComparison(items: OperatorRankingItem[]) {
  const productiveRows = items.filter((item) =>
    Number(item.toneladas_reales || 0) > 0 || Number(item.ciclos || 0) > 0 || Number(item.tph || 0) > 0
  )
  const maxTph = Math.max(1, ...productiveRows.map((item) => Number(item.tph || 0)))
  const top = [...productiveRows]
    .sort((a, b) =>
      Number(b.tph || 0) - Number(a.tph || 0)
      || Number(b.toneladas_reales || 0) - Number(a.toneladas_reales || 0)
      || Number(b.productividad_score || 0) - Number(a.productividad_score || 0)
    )
    .slice(0, 5)
  const low = [...productiveRows]
    .sort((a, b) =>
      Number(a.productividad_score || 0) - Number(b.productividad_score || 0)
      || Number(a.tph || 0) - Number(b.tph || 0)
      || Number(b.lost_tons_estimated || 0) - Number(a.lost_tons_estimated || 0)
    )
    .slice(0, 5)

  return { top, low, maxTph }
}

function OperatorProductivityComparison({
  t,
  top,
  low,
  maxTph,
  onSelect,
}: {
  t: OperatorRankingT
  top: OperatorRankingItem[]
  low: OperatorRankingItem[]
  maxTph: number
  onSelect: (item: OperatorRankingItem) => void
}) {
  if (!top.length && !low.length) return null

  const renderRow = (item: OperatorRankingItem, index: number, mode: 'top' | 'low') => {
    const tph = Number(item.tph || 0)
    const pct = Math.max(4, Math.min(100, (tph / maxTph) * 100))
    return (
      <button key={`${mode}-${item.operator_id}`} type="button" className={`operator-productivity-row is-${mode}`} onClick={() => onSelect(item)}>
        <span className="operator-productivity-rank">#{index + 1}</span>
        <span className="operator-productivity-person">
          <strong>{item.operator_name}</strong>
          <small>{item.operator_id} / {item.frequent_equipment_id}</small>
        </span>
        <span className="operator-productivity-main">
          <strong>{formatNumber(tph, 0)} tph</strong>
          <small>{formatTons(item.toneladas_reales)} / {Math.round(item.ciclos || 0).toLocaleString('es-CL')} {t.tabla_ciclos}</small>
        </span>
        <span className="operator-productivity-score">
          <strong>{formatNumber(item.productividad_score, 1)}%</strong>
          <small>{t.prod_score_label}</small>
        </span>
        <span className="operator-productivity-track" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
        {mode === 'low' && (
          <span className="operator-productivity-impact">
            {formatTons(item.lost_tons_estimated)} {t.prod_impacto_suffix}
          </span>
        )}
      </button>
    )
  }

  return (
    <section className="panel operator-productivity-ranking">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">{t.prod_kicker}</span>
          <h2>{t.prod_titulo}</h2>
        </div>
        <span className="panel-tag">{t.prod_tag}</span>
      </div>
      <div className="operator-productivity-grid">
        <div className="operator-productivity-column is-top">
          <div className="operator-productivity-title">
            <Trophy size={18} />
            <div><strong>{t.prod_top_titulo}</strong><small>{t.prod_top_subtitulo}</small></div>
          </div>
          <div className="operator-productivity-list">
            {top.map((item, index) => renderRow(item, index, 'top'))}
          </div>
        </div>
        <div className="operator-productivity-column is-low">
          <div className="operator-productivity-title">
            <AlertTriangle size={18} />
            <div><strong>{t.prod_low_titulo}</strong><small>{t.prod_low_subtitulo}</small></div>
          </div>
          <div className="operator-productivity-list">
            {low.map((item, index) => renderRow(item, index, 'low'))}
          </div>
        </div>
      </div>
      <p className="operator-productivity-note">
        {t.prod_nota}
      </p>
    </section>
  )
}

function OperatorPriorityBoard({
  t,
  items,
  onSelect,
  onAudit,
}: {
  t: OperatorRankingT
  items: OperatorRankingItem[]
  onSelect: (item: OperatorRankingItem) => void
  onAudit: (item: OperatorRankingItem) => void
}) {
  if (!items.length) return null

  return (
    <section className="panel operator-priority-board">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">{t.priority_kicker}</span>
          <h2>{t.priority_titulo}</h2>
        </div>
        <span className="panel-tag">{t.priority_tag(items.length)}</span>
      </div>
      <div className="operator-priority-grid">
        {items.map((item, index) => (
          <article key={item.operator_id} className="operator-priority-card">
            <button type="button" className="operator-priority-main" onClick={() => onSelect(item)}>
              <span className="operator-priority-rank">#{index + 1}</span>
              <div>
                <strong>{item.operator_name}</strong>
                <small>{item.operator_id} / {item.frequent_equipment_id}</small>
              </div>
              <OperatorRiskBadge level={item.risk_level} />
            </button>
            <div className="operator-priority-metrics">
              <span><strong>{formatTons(item.toneladas_reales)}</strong><small>{t.priority_metric_produccion}</small></span>
              <span><strong>{formatNumber(item.score_global, 1)}</strong><small>{t.priority_metric_score}</small></span>
              <span><strong>{formatHours(item.manageable_delay_minutes)}</strong><small>{t.priority_metric_demoras}</small></span>
              <span><strong>{formatTons(item.lost_tons_estimated)}</strong><small>{t.priority_metric_impacto}</small></span>
            </div>
            <div className="operator-priority-cause">
              <span>{cleanCause(t, item.main_loss_cause)}</span>
              <p>{item.recommendation}</p>
            </div>
            <button type="button" className="command-button command-button-secondary" onClick={() => onAudit(item)}>
              <ClipboardCheck size={15} /> {t.priority_btn_auditar}
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

function buildCauseDonut(items: OperatorRankingItem[]): EChartsOption {
  const totals = new Map<string, number>()
  items.forEach((item) => totals.set(item.main_loss_cause, (totals.get(item.main_loss_cause) ?? 0) + item.lost_tons_estimated))
  const data = [...totals.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  return {
    color: [premiumPalette.amber, premiumPalette.cyan, premiumPalette.mineral, '#FF8A00', premiumPalette.red, premiumPalette.slate],
    animationDuration: 850,
    tooltip: tooltipBase(),
    legend: { bottom: 0, textStyle: { color: premiumPalette.muted, fontSize: 11 } },
    series: [
      {
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '43%'],
        itemStyle: { borderRadius: 6, borderColor: '#020403', borderWidth: 2 },
        label: { color: premiumPalette.text, formatter: '{b}\n{d}%' },
        data,
      },
    ],
  }
}

function buildDelayHeatmap(t: OperatorRankingT, items: OperatorRankingItem[]): EChartsOption {
  const categories = [t.heatmap_cat_bano, t.heatmap_cat_colacion, t.heatmap_cat_cambio, t.heatmap_cat_petroleo, t.heatmap_cat_sin_postura]
  const rows = items.slice(0, 10)
  const data = rows.flatMap((item, y) => [
    [0, y, item.bathroom_minutes],
    [1, y, item.lunch_minutes],
    [2, y, item.shift_change_minutes],
    [3, y, item.fueling_minutes],
    [4, y, item.no_assignment_minutes],
  ])
  const max = Math.max(1, ...data.map((row) => Number(row[2])))
  return {
    animationDuration: 850,
    grid: { top: 32, right: 22, bottom: 30, left: 112 },
    tooltip: tooltipBase(),
    xAxis: { type: 'category', data: categories, axisLabel, axisTick: { show: false } },
    yAxis: { type: 'category', data: rows.map((item) => item.operator_name), axisLabel, axisTick: { show: false } },
    visualMap: {
      min: 0,
      max,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: -2,
      textStyle: { color: premiumPalette.muted },
      inRange: { color: ['rgba(0,255,136,0.12)', '#FFCC33', '#FF8A00', '#FF2D55'] },
    },
    series: [{ type: 'heatmap', data, label: { show: false }, emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 1 } } }],
  }
}

export function OperatorRanking() {
  const t = useModuleT(operatorRankingT)
  const analysisFilters = useAnalysisFilters({}, 'northmine:filters:operator-ranking')
  const { appliedFilters } = analysisFilters
  const [selectedOperator, setSelectedOperator] = useState<OperatorRankingItem | null>(null)
  const [auditOperator, setAuditOperator] = useState<OperatorRankingItem | null>(null)
  const [methodologyOpen, setMethodologyOpen] = useState(false)

  const rankingQuery = useQuery({
    queryKey: ['operator-ranking-global', appliedFilters],
    queryFn: () => getOperatorRankingGlobal(appliedFilters),
  })
  const trendsQuery = useQuery({
    queryKey: ['operator-ranking-trends', appliedFilters],
    queryFn: () => getOperatorRankingTrends(appliedFilters),
  })
  const patternsQuery = useQuery({
    queryKey: ['operator-ranking-patterns', appliedFilters],
    queryFn: () => getOperatorDelayPatterns(appliedFilters),
  })

  const items = rankingQuery.data?.items ?? []
  const executive = useMemo(() => buildOperatorExecutiveRead(items), [items])
  const priorityItems = useMemo(() => buildOperatorPriorities(items), [items])
  const productivityComparison = useMemo(() => buildProductivityComparison(items), [items])
  const dataMode = rankingQuery.data?.data_mode
  const themeId = useChartPaletteKey()
  const scoreBars = useMemo(() => buildScoreBars(items), [items, themeId])
  const scatter = useMemo(() => buildScatter(t, items), [items, t, themeId])
  const donut = useMemo(() => buildCauseDonut(items), [items, themeId])
  const heatmap = useMemo(() => buildDelayHeatmap(t, items), [items, t, themeId])

  const exportCsv = async () => {
    const blob = await exportOperatorRankingCsv(appliedFilters)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `northmine_ranking_operadores_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const selectById = (operatorId: string) => {
    const operator = items.find((item) => item.operator_id === operatorId)
    if (operator) setSelectedOperator(operator)
  }

  // Instrumentacion (Etapa 2.5): solo metricas operacionales autorizadas -
  // nunca se construye ni se expone una evaluacion laboral/psicologica/
  // disciplinaria a partir de esto (restriccion explicita del brief).
  useAgentWidget({
    id: 'operator-ranking-table',
    moduleId: 'operatorRanking',
    type: 'table',
    label: 'Ranking de operadores',
    description: 'Score operacional (productividad/disponibilidad/utilizacion/demoras/seguridad) por operador, solo metricas autorizadas.',
    supportedActions: ['focus_widget', 'explain_widget'],
    getSnapshot: () => ({
      widgetId: 'operator-ranking-table',
      type: 'table',
      label: 'Ranking de operadores',
      updatedAt: new Date().toISOString(),
      dataMode: dataMode ?? null,
      rowCount: items.length,
      rows: items.slice(0, 20).map((item) => ({
        operatorId: item.operator_id,
        rank: item.rank,
        scoreGlobal: item.score_global,
      })),
    }),
  })
  useAgentEntityHandler('operator', {
    select: (entityId) => selectById(entityId),
    open: (entityId) => selectById(entityId),
    isOpen: (entityId) => selectedOperator?.operator_id === entityId,
  })

  if (rankingQuery.isLoading) return <LoadingState label={t.cargando_ranking} />
  if (rankingQuery.isError || !rankingQuery.data) return <ErrorState detail={t.error_cargar_ranking} onRetry={() => rankingQuery.refetch()} />

  return (
    <>
      <div className="module-page operator-ranking-page">
        <ModuleHeader
          icon={Users}
          eyebrow={t.eyebrow}
          title={t.titulo}
          description={t.descripcion}
          meta={dataModeLabel(t, dataMode)}
          actions={
            <div className="operator-ranking-actions">
              <button
                type="button"
                className="command-button command-button-secondary"
                aria-haspopup="dialog"
                aria-expanded={methodologyOpen}
                aria-controls="operator-methodology-dialog"
                onClick={() => setMethodologyOpen(true)}
              >
                <BookOpen size={15} /> {t.btn_metodologia}
              </button>
              <button type="button" className="command-button command-button-secondary" onClick={exportCsv}>
                <Download size={15} /> {t.btn_exportar}
              </button>
            </div>
          }
        />

        <div className="operator-ethics-note">
          <ShieldAlert size={18} />
          <span>{t.ethics_note}</span>
        </div>

        <AnalysisFilterBar
          title={t.filtros_titulo}
          fields={['startDate', 'endDate', 'shift', 'operatorId', 'equipmentId', 'loadingUnitId', 'model', 'phase', 'origin', 'destination', 'material', 'delayCategory', 'severity', 'recurrenceLevel']}
          compactMode
          showEmptySummary={false}
          loading={rankingQuery.isFetching}
          {...analysisFilters}
        />

        <section className="operator-command-panel panel">
          <div className="operator-command-copy">
            <span className="panel-kicker">{t.cmd_kicker}</span>
            <h2>
              {executive.risk
                ? t.cmd_titulo_riesgo(executive.risk.operator_name)
                : t.cmd_titulo_sin_riesgo}
            </h2>
            <p>
              {executive.risk
                ? t.cmd_texto_riesgo(cleanCause(t, executive.risk.main_loss_cause), formatTons(executive.risk.lost_tons_estimated), formatHours(executive.risk.manageable_delay_minutes))
                : t.cmd_texto_sin_riesgo}
            </p>
            <div className="operator-command-actions">
              <span><Trophy size={14} /> {t.cmd_mejor_score(executive.best?.operator_name ?? '-')}</span>
              <span><AlertTriangle size={14} /> {t.cmd_foco(rankingQuery.data.summary.high_risk_count)}</span>
              <span><Timer size={14} /> {t.cmd_demoras(formatHours(rankingQuery.data.summary.manageable_delay_minutes))}</span>
              <span><Users size={14} /> {t.cmd_mayor_demora(executive.delayLeader?.operator_name ?? '-')}</span>
              <span><Target size={14} /> {t.cmd_causa(cleanCause(t, rankingQuery.data.summary.main_loss_cause))}</span>
            </div>
          </div>
          <div className="operator-command-next">
            <span>{t.cmd_next_titulo}</span>
            <strong>{executive.risk?.recommendation ?? t.cmd_next_fallback}</strong>
            <small>
              {t.cmd_next_small(formatNumber(executive.scoreSpread, 1))}
            </small>
            {executive.risk && (
              <button type="button" className="command-button command-button-secondary" onClick={() => setAuditOperator(executive.risk)}>
                <ClipboardCheck size={15} /> {t.cmd_btn_auditar_foco}
              </button>
            )}
          </div>
        </section>

        <OperatorRankingKpis summary={rankingQuery.data.summary} />

        <OperatorProductivityComparison
          t={t}
          top={productivityComparison.top}
          low={productivityComparison.low}
          maxTph={productivityComparison.maxTph}
          onSelect={setSelectedOperator}
        />

        <OperatorPriorityBoard t={t} items={priorityItems} onSelect={setSelectedOperator} onAudit={setAuditOperator} />

        <section className="panel">
          <div className="panel-header">
            <div><span className="panel-kicker">{t.ranking_kicker}</span><h2>{t.ranking_titulo}</h2></div>
            <span className="panel-tag">{t.ranking_tag(rankingQuery.data.count)}</span>
          </div>
          {items.length ? <OperatorRankingTable items={items} onSelect={setSelectedOperator} onAudit={setAuditOperator} /> : <EmptyState />}
        </section>

        <section className="operator-ranking-focus-grid">
          <OperatorDelayPatternPanel patterns={patternsQuery.data?.items ?? []} onSelectOperator={selectById} />
          <div className="panel">
            <div className="panel-header"><div><span className="panel-kicker">{t.score_kicker}</span><h2>{t.score_titulo}</h2></div></div>
            <div className="operator-chart is-focus-chart">{items.length ? <ReactECharts option={scoreBars} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} /> : <EmptyState />}</div>
          </div>
        </section>

        <section className="two-column operator-ranking-chart-grid">
          <div className="panel">
            <div className="panel-header"><div><span className="panel-kicker">{t.correlacion_kicker}</span><h2>{t.correlacion_titulo}</h2></div></div>
            <div className="operator-chart">{items.length ? <ReactECharts option={scatter} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} /> : <EmptyState />}</div>
          </div>
          <div className="panel">
            <div className="panel-header"><div><span className="panel-kicker">{t.impacto_kicker}</span><h2>{t.impacto_titulo}</h2></div></div>
            <div className="operator-chart">{items.length ? <ReactECharts option={donut} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} /> : <EmptyState />}</div>
          </div>
        </section>

        <section className="two-column operator-ranking-chart-grid">
          <div className="panel">
            <div className="panel-header"><div><span className="panel-kicker">{t.heatmap_kicker}</span><h2>{t.heatmap_titulo}</h2></div></div>
            <div className="operator-chart">{items.length ? <ReactECharts option={heatmap} notMerge lazyUpdate style={{ width: '100%', height: '100%' }} /> : <EmptyState />}</div>
          </div>
          <div className="panel">
            <div className="panel-header">
              <div><span className="panel-kicker">{t.evolucion_kicker}</span><h2>{t.evolucion_titulo}</h2></div>
              <span className="panel-tag">{t.evolucion_tag(trendsQuery.data?.count ?? 0)}</span>
            </div>
            {trendsQuery.data?.items.length ? <OperatorTrendChart points={trendsQuery.data.items} height={330} /> : <EmptyState />}
          </div>
        </section>

      </div>

      <OperatorMethodologyModal open={methodologyOpen} onClose={() => setMethodologyOpen(false)} />

      <OperatorAuditDrawer
        operator={auditOperator}
        filters={appliedFilters}
        open={Boolean(auditOperator)}
        onClose={() => setAuditOperator(null)}
      />

      <OperatorRankingDrawer
        operator={selectedOperator}
        filters={appliedFilters}
        open={Boolean(selectedOperator)}
        onClose={() => setSelectedOperator(null)}
      />
    </>
  )
}
