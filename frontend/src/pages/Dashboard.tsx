import { type CSSProperties, useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  CalendarDays,
  Gauge,
  Goal,
  Mountain,
  Target,
  TrendingUp,
} from 'lucide-react'
import type { AuthSession } from '../lib/api'
import { getFleetDistance, getLoadingUnitDistanceCycle, northmineApi } from '../lib/api'
import { getSmartAlerts } from '../services/alertsService'
import { getFleetStatus } from '../services/fleetService'
import { getLoadingUnitsSummary } from '../services/loadingUnitsService'
import { getProductionShift } from '../services/productionService'
import { getDashboardSummary, getHealth } from '../services/dashboardService'
import { getCurrentShiftCommandCenter } from '../services/currentShiftService'
import { ExecutiveKpiCard } from '../components/kpi/ExecutiveKpiCard'
import { ProductionTrendChart } from '../components/charts/ProductionTrendChart'
import { AnalysisFilterBar } from '../components/filters/AnalysisFilterBar'
import { useAnalysisFilters } from '../hooks/useAnalysisFilters'
import type { SectionId } from '../components/layout/Sidebar'
import { ExecutiveInsightCard } from '../components/dashboard/ExecutiveInsightCard'
import { buildOperationalInsights } from '../lib/operationalInsights'
import { useModuleT } from '../i18n/useModuleT'
import { dashboardT, type DashboardT } from '../i18n/modules/dashboard'

function formatTons(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return '-'
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}`
  return Math.round(value).toLocaleString('es-CL')
}

function formatTonsWithUnit(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return '-'
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} Mt`
  return `${Math.round(value).toLocaleString('es-CL')} t`
}

function formatNumber(value?: number | null, digits = 0) {
  if (value === undefined || value === null || Number.isNaN(value)) return '-'
  return value.toLocaleString('es-CL', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function formatPct(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return '-'
  return `${value.toFixed(1)}%`
}

function formatSignedPct(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return '-'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function formatSignedTons(value: number) {
  const sign = value >= 0 ? '+' : '-'
  return `${sign}${formatTonsWithUnit(Math.abs(value))}`
}

function clampPct(value?: number | null, max = 160) {
  if (value === undefined || value === null || Number.isNaN(value)) return 0
  return Math.max(0, Math.min(value, max))
}

function meterStyle(value?: number | null, max = 160): CSSProperties {
  return { '--meter-value': `${clampPct(value, max)}%` } as CSSProperties
}

function sectionLabel(section: SectionId, t: DashboardT) {
  return t.section_label[section]
}

interface Props {
  session: AuthSession
  section: SectionId
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-page executive-command-center dashboard-skeleton" aria-busy="true">
      <section className="decision-panel skeleton-panel">
        <span className="skeleton-line short" />
        <span className="skeleton-line title" />
        <span className="skeleton-bar" />
      </section>
      <section className="executive-kpi-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <article key={index} className="kpi-card skeleton-card">
            <span className="skeleton-line short" />
            <span className="skeleton-line value" />
            <span className="skeleton-line" />
          </article>
        ))}
      </section>
      <section className="command-main-grid">
        <div className="panel skeleton-chart" />
        <div className="panel skeleton-inspector" />
      </section>
    </div>
  )
}

export function Dashboard({ session, section }: Props) {
  const t = useModuleT(dashboardT)
  const analysisFilters = useAnalysisFilters({}, 'northmine:filters:dashboard')
  const { appliedFilters } = analysisFilters
  const [
    summaryQuery,
    alertsQuery,
    healthQuery,
    productionQuery,
    currentShiftQuery,
    fleetQuery,
    loadingQuery,
    fleetDistanceQuery,
    loadingDistanceQuery,
  ] = useQueries({
    queries: [
      { queryKey: ['dashboard-summary', appliedFilters], queryFn: () => getDashboardSummary(appliedFilters), refetchInterval: 60000 },
      { queryKey: ['smart-alerts', appliedFilters], queryFn: () => getSmartAlerts(appliedFilters), refetchInterval: 60000 },
      { queryKey: ['health-inline'], queryFn: getHealth, refetchInterval: 30000 },
      { queryKey: ['dashboard-production-shift', appliedFilters], queryFn: () => getProductionShift('ACTUAL', appliedFilters), refetchInterval: 60000 },
      { queryKey: ['dashboard-current-shift-command'], queryFn: getCurrentShiftCommandCenter, refetchInterval: 60000 },
      { queryKey: ['dashboard-fleet-status', appliedFilters], queryFn: () => getFleetStatus('ACTUAL', appliedFilters), refetchInterval: 60000 },
      { queryKey: ['dashboard-loading-units', appliedFilters], queryFn: () => getLoadingUnitsSummary('ACTUAL', appliedFilters), refetchInterval: 60000 },
      { queryKey: ['dashboard-fleet-distance'], queryFn: getFleetDistance, refetchInterval: 120000 },
      { queryKey: ['dashboard-loading-distance'], queryFn: getLoadingUnitDistanceCycle, refetchInterval: 120000 },
    ],
  })
  const monthlyTargetDate = appliedFilters.endDate || appliedFilters.startDate || currentShiftQuery.data?.fecha || summaryQuery.data?.period.to
  const monthlyTargetQuery = useQuery({
    queryKey: ['dashboard-monthly-target', monthlyTargetDate, 'F01'],
    queryFn: () => northmineApi.monthlyTarget({ date: monthlyTargetDate, sector: 'F01' }),
    enabled: Boolean(monthlyTargetDate),
    refetchInterval: 60000,
  })

  const summary = summaryQuery.data
  const alerts = alertsQuery.data?.items ?? []

  const intelligence = useMemo(() => {
    if (!summary) return null
    return buildOperationalInsights({
      summary,
      alerts,
      production: productionQuery.data,
      currentShift: currentShiftQuery.data,
      fleet: fleetQuery.data,
      loading: loadingQuery.data,
      fleetDistance: fleetDistanceQuery.data,
      loadingUnitDistance: loadingDistanceQuery.data,
    })
  }, [
    alerts,
    currentShiftQuery.data,
    fleetDistanceQuery.data,
    fleetQuery.data,
    loadingDistanceQuery.data,
    loadingQuery.data,
    productionQuery.data,
    summary,
  ])

  if (summaryQuery.isLoading) {
    return <DashboardSkeleton />
  }

  if (summaryQuery.isError || !summary || !intelligence) {
    const err = summaryQuery.error as any
    const is401 = err?.status === 401 || err?.response?.status === 401
    const isNetwork = !err?.status && !err?.response
    return (
      <div className="panel error-panel">
        <h2>{is401 ? t.error_title_401 : t.error_title_generic}</h2>
        <p>
          {is401
            ? t.error_message_401
            : isNetwork
              ? t.error_message_network
              : t.error_message_server}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: 12, padding: '8px 18px', borderRadius: 6, border: '1px solid var(--border-mid)', background: 'transparent', color: 'var(--data-cyan)', cursor: 'pointer', fontSize: 13 }}
        >
          {t.reload_button}
        </button>
      </div>
    )
  }

  if (section !== 'dashboard') {
    return (
      <div className="section-placeholder">
        <BarChart3 size={34} />
        <span>{sectionLabel(section, t)}</span>
        <h2>{t.section_placeholder_title}</h2>
        <p>{t.section_placeholder_desc}</p>
      </div>
    )
  }

  const kpis = summary.kpis
  const currentCommand = currentShiftQuery.data
  const monthlyTarget = monthlyTargetQuery.data
  const targetDailyRows = monthlyTarget?.daily_breakdown ?? []
  const currentShift = summary.current_shift
  const latestDay = summary.daily.length ? summary.daily[summary.daily.length - 1] : undefined
  const previousDay = summary.daily.length > 1 ? summary.daily[summary.daily.length - 2] : undefined
  const operationalDay = currentCommand?.fecha || currentShift.fecha || latestDay?.fecha
  const targetDay = targetDailyRows.find((row) => row.date === operationalDay)
    ?? [...targetDailyRows].reverse().find((row) => !row.is_future)
  const monthlyPlanAvailable = Boolean(
    monthlyTarget?.monthly_target_f01_tonnes && monthlyTarget.monthly_target_f01_tonnes > 0 && monthlyTarget.status !== 'SIN_DATOS'
  ) || Boolean((kpis.meta_configurada ?? true) && kpis.meta_acumulada > 0 && kpis.meta_mensual > 0)
  const monthReal = monthlyTarget?.mov_real_acumulado ?? kpis.tonelaje_total
  const monthF02 = monthlyTarget?.mov_f02_acumulado ?? 0
  const monthTotalWithF02 = monthlyTarget?.mov_total_con_f02 ?? monthReal
  const monthlyTargetTotal = monthlyTarget?.monthly_target_f01_tonnes ?? kpis.meta_mensual
  const dailyTargetF01 = monthlyTarget?.daily_target_f01_tonnes ?? targetDay?.f01_programmed_tonnes ?? latestDay?.plan ?? 0
  const latestDayReal = targetDay?.f01_real_tonnes ?? latestDay?.real
  const latestDayCompliance = targetDay?.f01_cumplimiento_pct ?? (
    dailyTargetF01 > 0 && latestDayReal !== undefined ? (latestDayReal / dailyTargetF01) * 100 : latestDay?.cumplimiento ?? null
  )
  const latestDayPlanAvailable = Boolean(dailyTargetF01 > 0)
  const dayDeltaPct = latestDay && previousDay && previousDay.real
    ? ((latestDay.real - previousDay.real) / previousDay.real) * 100
    : latestDay && latestDay.cumplimiento !== null
      ? latestDay.cumplimiento - 100
      : 0
  const dayComplianceDelta = latestDayCompliance !== null ? latestDayCompliance - 100 : dayDeltaPct
  const targetPeriodEnd = monthlyTarget?.period.end_date ? new Date(`${monthlyTarget.period.end_date}T00:00:00`) : null
  const targetMonthEnd = monthlyTarget?.period.month_end_date ? new Date(`${monthlyTarget.period.month_end_date}T00:00:00`) : null
  const targetElapsedDays = targetPeriodEnd ? targetPeriodEnd.getDate() : (kpis.dias_con_datos ?? summary.period.days_elapsed)
  const targetMonthDays = targetMonthEnd ? targetMonthEnd.getDate() : Math.max(summary.period.days_elapsed + kpis.dias_restantes, summary.period.days_elapsed)
  const elapsedTargetRows = targetDailyRows.filter((row) => !row.is_future)
  const planAccumulatedToDate = elapsedTargetRows.length
    ? elapsedTargetRows.reduce((acc, row) => acc + row.f01_programmed_tonnes, 0)
    : dailyTargetF01 * targetElapsedDays
  const accumulatedGap = monthReal - planAccumulatedToDate
  const accumulatedCompliance = planAccumulatedToDate > 0 ? (monthReal / planAccumulatedToDate) * 100 : null
  const remainingDays = Math.max(targetMonthDays - targetElapsedDays, 0)
  const remainingToMonthlyTarget = Math.max(monthlyTargetTotal - monthReal, 0)
  const requiredDailyToGreen = remainingDays > 0 ? remainingToMonthlyTarget / remainingDays : 0
  const currentDailyAverage = targetElapsedDays > 0 ? monthReal / targetElapsedDays : 0
  const monthlyProjection = monthlyTarget && targetElapsedDays > 0
    ? (monthReal / targetElapsedDays) * targetMonthDays
    : kpis.proyeccion_fin_mes
  const breach = monthlyPlanAvailable ? accumulatedGap : null
  const projectedGap = monthlyPlanAvailable ? monthlyProjection - monthlyTargetTotal : null
  const requiredVsCurrentPct = requiredDailyToGreen > 0 ? (currentDailyAverage / requiredDailyToGreen) * 100 : monthlyPlanAvailable ? 160 : 0
  const projectionCompletionPct = monthlyTargetTotal > 0 ? (monthlyProjection / monthlyTargetTotal) * 100 : 0
  const accumulatedGapPct = planAccumulatedToDate > 0 ? (Math.abs(accumulatedGap) / planAccumulatedToDate) * 100 : 0
  const greenStatusKey = !monthlyPlanAvailable
    ? 'no_plan'
    : (accumulatedGap >= 0 && (projectedGap ?? 0) >= 0)
      ? 'on_green'
      : (projectedGap ?? 0) >= 0
        ? 'recoverable'
        : 'at_risk'
  const greenStatus = {
    no_plan: t.green_status_no_plan,
    on_green: t.green_status_on_green,
    recoverable: t.green_status_recoverable,
    at_risk: t.green_status_at_risk,
  }[greenStatusKey]
  const greenTone = greenStatusKey === 'on_green' ? 'green' : greenStatusKey === 'recoverable' ? 'amber' : greenStatusKey === 'at_risk' ? 'red' : 'slate'
  const greenSummary = monthlyPlanAvailable
    ? t.green_summary(greenStatus, formatTonsWithUnit(requiredDailyToGreen), formatTonsWithUnit(monthlyTargetTotal), formatTonsWithUnit(currentDailyAverage))
    : t.hero_configure_plan
  const dailyChartData = targetDailyRows.length
    ? targetDailyRows
        .filter((row) => !row.is_future)
        .map((row) => ({
          fecha: row.date,
          plan: row.f01_programmed_tonnes,
          real: row.f01_real_tonnes,
          diferencia: row.f01_difference_tonnes,
          cumplimiento: row.f01_cumplimiento_pct,
        }))
    : summary.daily
  const currentCompliance = currentCommand?.cumplimiento_pct ?? productionQuery.data?.cumplimiento_pct ?? kpis.cumplimiento_pct
  const productionShiftTons = currentCommand?.toneladas_turno ?? productionQuery.data?.toneladas_turno ?? currentShift.tonelaje
  const productionShiftMeta = currentCommand?.meta_turno ?? productionQuery.data?.meta_turno
  const shiftElapsedPct = Math.min(Math.max(currentCommand?.elapsed_pct ?? 100, 0), 100)
  const shiftInProgress = Boolean(currentCommand && shiftElapsedPct > 0 && shiftElapsedPct < 98 && productionShiftMeta)
  const shiftExpectedNow = shiftInProgress && productionShiftMeta ? productionShiftMeta * (shiftElapsedPct / 100) : productionShiftMeta ?? 0
  const shiftPaceCompliance = shiftExpectedNow > 0 ? (productionShiftTons / shiftExpectedNow) * 100 : currentCompliance
  const shiftProjectedFinal = currentCommand?.projection?.proyeccion_final ?? null
  const shiftProjectedGap = currentCommand?.projection?.diferencia_proyectada ?? (
    shiftProjectedFinal !== null && productionShiftMeta ? shiftProjectedFinal - productionShiftMeta : null
  )
  const shiftOnTrack = shiftInProgress
    ? (shiftProjectedGap !== null ? shiftProjectedGap >= 0 : shiftPaceCompliance >= 95)
    : currentCompliance >= 95
  const dataSourceLabel = productionQuery.data?.data_source === 'REAL'
    ? `REAL ${productionQuery.data.source_system ?? 'WENCO'}`
    : productionQuery.data?.data_source ?? summary.mode.toUpperCase()
  const alertStatusLabel = alertsQuery.isError ? t.status_partial : alertsQuery.isFetching ? t.status_syncing : t.status_ok
  const dataConfidence = [
    { label: t.confidence_backend, value: healthQuery.data?.status === 'ok' ? t.status_online : t.status_checking },
    { label: t.confidence_shift_data, value: dataSourceLabel },
    { label: t.confidence_monthly_plan, value: monthlyPlanAvailable ? `${monthlyTarget?.data_source ?? t.status_configured} F01` : t.status_not_configured },
    { label: t.confidence_f02_apart, value: monthF02 > 0 ? formatTonsWithUnit(monthF02) : t.status_no_f02 },
    { label: t.confidence_alerts, value: alertStatusLabel },
    { label: t.confidence_updated, value: new Date(summary.generated_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) },
  ]

  const operationalKpiCards = [
    {
      title: t.kpi_shift_title,
      value: formatTons(productionShiftTons),
      unit: Math.abs(productionShiftTons) >= 1_000_000 ? 'Mt' : 't',
      subtitle: t.kpi_shift_subtitle(
        currentCommand?.turno ?? currentShift.turno,
        formatNumber(currentCommand?.ciclos ?? currentShift.ciclos),
        shiftInProgress ? formatPct(shiftElapsedPct) : null,
      ),
      trend: t.kpi_shift_trend(formatPct(currentCompliance), shiftInProgress),
      trendDirection: shiftOnTrack ? 'up' as const : shiftPaceCompliance >= 90 ? 'flat' as const : 'down' as const,
      status: shiftInProgress ? (shiftOnTrack ? t.kpi_status_on_track : t.kpi_status_close_risk) : currentCompliance >= 95 ? t.kpi_status_in_control : t.kpi_status_attention,
      comparison: shiftInProgress
        ? shiftProjectedFinal !== null
          ? t.kpi_comparison_projected(formatTonsWithUnit(shiftProjectedFinal))
          : t.kpi_comparison_expected_now(formatTonsWithUnit(shiftExpectedNow))
        : productionShiftMeta ? t.kpi_comparison_target(formatTonsWithUnit(productionShiftMeta)) : t.kpi_comparison_shift_target,
      tone: shiftOnTrack ? 'green' as const : 'amber' as const,
      icon: Gauge,
    },
    {
      title: t.kpi_day_title,
      value: formatTons(latestDayReal),
      unit: latestDayReal && Math.abs(latestDayReal) >= 1_000_000 ? 'Mt' : 't',
      subtitle: operationalDay ? t.kpi_day_subtitle(new Date(`${operationalDay}T00:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })) : t.kpi_day_subtitle_no_data,
      trend: latestDayPlanAvailable ? formatSignedPct(dayComplianceDelta) : t.kpi_day_no_plan,
      trendDirection: latestDayPlanAvailable ? (dayComplianceDelta >= 1 ? 'up' as const : dayComplianceDelta <= -1 ? 'down' as const : 'flat' as const) : 'flat' as const,
      status: latestDayPlanAvailable ? ((latestDayCompliance ?? 0) >= 100 ? t.kpi_day_status_over_plan : (latestDayCompliance ?? 0) >= 90 ? t.kpi_day_status_preventive : t.kpi_day_status_critical) : t.kpi_day_status_no_daily_plan,
      comparison: latestDayPlanAvailable ? t.kpi_day_comparison_daily_target(formatTonsWithUnit(dailyTargetF01)) : t.kpi_day_comparison_real_only,
      tone: latestDayPlanAvailable ? ((latestDayCompliance ?? 0) >= 100 ? 'green' as const : 'amber' as const) : 'slate' as const,
      icon: CalendarDays,
    },
    {
      title: t.kpi_accumulated_title,
      value: formatTons(monthReal),
      unit: Math.abs(monthReal) >= 1_000_000 ? 'Mt' : 't',
      subtitle: t.kpi_accumulated_subtitle(targetElapsedDays),
      trend: monthlyPlanAvailable ? formatPct(accumulatedCompliance) : t.kpi_accumulated_no_plan,
      trendDirection: monthlyPlanAvailable ? ((accumulatedCompliance ?? 0) >= 100 ? 'up' as const : (accumulatedCompliance ?? 0) >= 95 ? 'flat' as const : 'down' as const) : 'flat' as const,
      status: monthlyPlanAvailable ? ((accumulatedCompliance ?? 0) >= 100 ? t.kpi_accumulated_status_over : t.kpi_accumulated_status_under) : t.kpi_accumulated_status_not_configured,
      comparison: t.kpi_accumulated_comparison(formatTonsWithUnit(planAccumulatedToDate)),
      tone: monthlyPlanAvailable ? ((accumulatedCompliance ?? 0) >= 100 ? 'cyan' as const : 'amber' as const) : 'slate' as const,
      icon: Mountain,
    },
  ]
  const monthlyKpiCards = monthlyPlanAvailable ? [
    {
      title: t.monthly_kpi_planned_title,
      value: formatTons(planAccumulatedToDate),
      unit: Math.abs(planAccumulatedToDate) >= 1_000_000 ? 'Mt' : undefined,
      subtitle: t.monthly_kpi_planned_subtitle(targetElapsedDays),
      trend: t.monthly_kpi_planned_trend(formatTonsWithUnit(dailyTargetF01)),
      trendDirection: 'flat' as const,
      status: t.monthly_kpi_planned_status,
      comparison: t.monthly_kpi_planned_comparison(formatTonsWithUnit(monthlyTargetTotal)),
      tone: 'slate' as const,
      icon: Target,
    },
    {
      title: t.monthly_kpi_diff_title,
      value: formatSignedTons(accumulatedGap),
      subtitle: t.monthly_kpi_diff_subtitle,
      trend: accumulatedGap >= 0 ? t.monthly_kpi_diff_trend_over : t.monthly_kpi_diff_trend_recover,
      trendDirection: accumulatedGap >= 0 ? 'up' as const : 'down' as const,
      status: accumulatedGap >= 0 ? t.monthly_kpi_diff_status_green : Math.abs(accumulatedGap) < dailyTargetF01 ? t.monthly_kpi_diff_status_preventive : t.monthly_kpi_diff_status_critical,
      comparison: t.monthly_kpi_diff_comparison(formatPct(accumulatedCompliance)),
      tone: accumulatedGap >= 0 ? 'green' as const : 'red' as const,
      icon: Goal,
    },
    {
      title: t.monthly_kpi_required_title,
      value: formatTons(requiredDailyToGreen),
      unit: 't/dia',
      subtitle: t.monthly_kpi_required_subtitle(remainingDays),
      trend: currentDailyAverage >= requiredDailyToGreen ? t.monthly_kpi_required_trend_ok : t.monthly_kpi_required_trend_raise,
      trendDirection: currentDailyAverage >= requiredDailyToGreen ? 'up' as const : 'down' as const,
      status: currentDailyAverage >= requiredDailyToGreen ? t.monthly_kpi_required_status_ok : t.monthly_kpi_required_status_risk,
      comparison: t.monthly_kpi_required_comparison(formatTonsWithUnit(currentDailyAverage)),
      tone: currentDailyAverage >= requiredDailyToGreen ? 'green' as const : 'amber' as const,
      icon: TrendingUp,
    },
  ] : [
    {
      title: t.monthly_kpi_no_plan_title,
      value: t.monthly_kpi_no_plan_value,
      subtitle: t.monthly_kpi_no_plan_subtitle,
      trend: t.monthly_kpi_no_plan_trend,
      trendDirection: 'flat' as const,
      status: t.monthly_kpi_no_plan_status,
      comparison: t.monthly_kpi_no_plan_comparison,
      tone: 'slate' as const,
      icon: Target,
      featured: true,
    },
  ]
  const kpiCards = [...operationalKpiCards, ...monthlyKpiCards]
  const monthPlanDrivers = [
    {
      label: t.driver_f01_label,
      value: formatTonsWithUnit(monthReal),
      meta: t.driver_f01_meta(formatTonsWithUnit(planAccumulatedToDate)),
      tone: accumulatedGap >= 0 ? 'is-positive' : 'is-negative',
      meter: accumulatedCompliance ?? 0,
    },
    {
      label: t.driver_f02_label,
      value: formatTonsWithUnit(monthF02),
      meta: t.driver_f02_meta(formatTonsWithUnit(monthTotalWithF02)),
      tone: monthF02 > 0 ? 'is-info' : 'is-neutral',
      meter: monthF02 > 0 ? 100 : 0,
    },
    {
      label: t.driver_projection_label,
      value: formatTonsWithUnit(monthlyProjection),
      meta: t.driver_projection_meta(formatSignedTons(projectedGap ?? 0)),
      tone: (projectedGap ?? 0) >= 0 ? 'is-positive' : 'is-negative',
      meter: projectionCompletionPct,
    },
  ]
  const planCauseRows = intelligence.lowPerformers.slice(0, 4)
  const standbyRows = intelligence.standbyJustifications.slice(0, 6)
  const maxCauseImpact = Math.max(...planCauseRows.map((item) => Math.max(item.estimatedImpactTons, 0)), 1)
  const nextActions = [
    monthlyPlanAvailable
      ? currentDailyAverage >= requiredDailyToGreen
        ? t.action_maintain_rate(formatTonsWithUnit(requiredDailyToGreen))
        : t.action_raise_rate(formatTonsWithUnit(requiredDailyToGreen))
      : t.action_configure_plan,
    intelligence.lowPerformers[0]
      ? t.action_correct_equipment(intelligence.lowPerformers[0].equipment, formatTonsWithUnit(intelligence.lowPerformers[0].estimatedImpactTons))
      : t.action_maintain_loading,
    shiftOnTrack ? t.action_maintain_shift : t.action_recover_shift,
  ].filter((item, index, array) => array.indexOf(item) === index)

  return (
    <div className="dashboard-page executive-command-center">
      <AnalysisFilterBar
        title="Filtros dashboard"
        advancedMode="inline"
        compactMode
        fields={['startDate', 'endDate', 'shift', 'phase', 'origin', 'destination', 'material', 'caexId', 'loadingUnitId', 'model', 'status', 'severity']}
        loading={summaryQuery.isFetching || productionQuery.isFetching || fleetQuery.isFetching || loadingQuery.isFetching || monthlyTargetQuery.isFetching}
        showEmptySummary={false}
        {...analysisFilters}
      />

      <section className="dashboard-data-confidence" aria-label="Estado de datos del dashboard">
        {dataConfidence.map((item) => (
          <div
            key={item.label}
            className={`confidence-chip ${
              /ONLINE|REAL|OK/i.test(item.value) ? 'is-live' : /NO|PARCIAL|VERIFICANDO|SIN/i.test(item.value) ? 'is-warning' : ''
            }`}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </section>

      <section className={`plan-performance-hero tone-${greenTone}`}>
        <div className="plan-hero-ambient" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="plan-hero-main">
          <span className="hero-kicker">Plan & Performance Center</span>
          <h2>Que necesito para cerrar en numeros verdes</h2>
          <p>{greenSummary}</p>
          <div className="plan-hero-actions">
            {nextActions.slice(0, 3).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <div className={`plan-hero-status is-${greenTone}`}>
          <span>Estado cierre F01</span>
          <strong>{greenStatus}</strong>
          <div className="plan-radial-meter" style={meterStyle(accumulatedCompliance, 160)} aria-hidden="true">
            <span>{monthlyPlanAvailable ? formatPct(accumulatedCompliance) : '--'}</span>
          </div>
          <small>{monthlyPlanAvailable ? `${formatPct(accumulatedCompliance)} vs acumulado` : 'Plan requerido'}</small>
        </div>
        <div className="plan-hero-metrics">
          <div className="plan-hero-metric is-required" style={meterStyle(requiredVsCurrentPct, 160)}>
            <span>Requerido restante</span>
            <strong>{formatTonsWithUnit(requiredDailyToGreen)}/dia</strong>
            <i className="plan-meter"><b /></i>
            <small>Ritmo actual vs requerido</small>
          </div>
          <div className="plan-hero-metric is-current" style={meterStyle(projectionCompletionPct, 160)}>
            <span>Promedio actual</span>
            <strong>{formatTonsWithUnit(currentDailyAverage)}/dia</strong>
            <i className="plan-meter"><b /></i>
            <small>Proyeccion contra meta mes</small>
          </div>
          <div className={`plan-hero-metric ${accumulatedGap >= 0 ? 'is-positive' : 'is-negative'}`} style={meterStyle(accumulatedGapPct, 100)}>
            <span>Diferencia acumulada</span>
            <strong>{formatSignedTons(accumulatedGap)}</strong>
            <i className="plan-meter"><b /></i>
            <small>{accumulatedGap >= 0 ? 'Sobre ritmo acumulado' : 'Brecha acumulada'}</small>
          </div>
        </div>
        <div className="plan-market-strip" aria-label="Pulso de cumplimiento mensual">
          <span className={accumulatedGap >= 0 ? 'is-up' : 'is-down'}><b>F01</b>{formatSignedTons(accumulatedGap)}</span>
          <span className={(projectedGap ?? 0) >= 0 ? 'is-up' : 'is-down'}><b>Proy.</b>{formatSignedTons(projectedGap ?? 0)}</span>
          <span className="is-info"><b>F02</b>{formatTonsWithUnit(monthF02)}</span>
        </div>
      </section>

      <section className="executive-kpi-grid">
        {kpiCards.map((card) => (
          <ExecutiveKpiCard key={card.title} {...card} />
        ))}
      </section>

      <section className="plan-board-grid">
        <div className="plan-board-card">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Cumplimiento acumulado</span>
              <h2>F01 / F02 / Proyeccion</h2>
            </div>
            <span className="panel-tag">{monthlyTarget?.data_source ?? summary.mode.toUpperCase()}</span>
          </div>
          <div className="plan-driver-list">
            {monthPlanDrivers.map((item) => (
              <article key={item.label} className={item.tone} style={meterStyle(item.meter, 160)}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.meta}</small>
                <i className="plan-driver-meter"><b /></i>
              </article>
            ))}
          </div>
        </div>

        <div className="plan-board-card">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Causas que pueden romper el plan</span>
              <h2>Prioridad ejecutiva</h2>
            </div>
            <span className="panel-tag">{planCauseRows.length} focos</span>
          </div>
          <div className="plan-cause-list">
            {planCauseRows.length ? planCauseRows.map((item) => (
              <article
                key={`${item.type}-${item.equipment}`}
                className={item.deviationPct < -15 ? 'is-high' : 'is-medium'}
                style={meterStyle((Math.max(item.estimatedImpactTons, 0) / maxCauseImpact) * 100, 100)}
              >
                <strong>{item.equipment}</strong>
                <span>{item.type} / {formatSignedPct(item.deviationPct)} vs referencia</span>
                <small>Impacto estimado {formatTonsWithUnit(item.estimatedImpactTons)} - {item.detail}</small>
              </article>
            )) : (
              <div className="executive-empty-state">Sin desviaciones relevantes contra referencia.</div>
            )}
          </div>
        </div>

        <div className="plan-board-card standby-justification-card">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Standby justificado</span>
              <h2>Flota fuera de rendimiento</h2>
            </div>
            <span className="panel-tag">{standbyRows.length} equipos</span>
          </div>
          {standbyRows.length ? (
            <div className="standby-justification-list">
              {standbyRows.map((item) => (
                <article key={`${item.type}-${item.equipment}`}>
                  <div>
                    <strong>{item.equipment}</strong>
                    <span>{item.type}</span>
                  </div>
                  <small>{item.reason}</small>
                  <em>
                    {item.operator ? `Operador ${item.operator}` : 'Sin operador registrado'}
                    {item.minutesInactive !== null && item.minutesInactive !== undefined
                      ? ` · ${item.minutesInactive} min sin ciclo`
                      : ''}
                  </em>
                </article>
              ))}
            </div>
          ) : (
            <div className="executive-empty-state">
              Sin equipos en standby WENCO. Los equipos sin aporte se evaluan como bajo rendimiento o mantencion.
            </div>
          )}
          <p className="standby-justification-note">
            Estos equipos se excluyen del ranking de bajo rendimiento porque WENCO los registra como standby/subestado de gestion de flota.
          </p>
        </div>
      </section>

      <ProductionTrendChart daily={dailyChartData} hourly={summary.hourly_shift} planAvailable={monthlyPlanAvailable} />

      <section className="plan-support-grid">
        <div className="executive-insight-stack">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Lectura ejecutiva</span>
              <h2>Que explica la desviacion</h2>
            </div>
            <span className="panel-tag">{intelligence.statusLabel}</span>
          </div>
          {intelligence.insights.slice(0, 3).map((insight) => (
            <ExecutiveInsightCard key={insight.id} insight={insight} />
          ))}
          {!intelligence.insights.length && (
            <div className="executive-empty-state">Operacion sin desviaciones ejecutivas relevantes.</div>
          )}
        </div>
        <div className="plan-board-card">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Notas de alcance</span>
              <h2>No duplica el Cockpit</h2>
            </div>
          </div>
          <div className="plan-note-list">
            <span>Cockpit: operar el turno y equipos en vivo.</span>
            <span>Dashboard: confirmar cumplimiento de plan y cierre mensual.</span>
            <span>F02 se informa aparte y se suma solo como total operacional.</span>
          </div>
        </div>
      </section>
    </div>
  )
}
