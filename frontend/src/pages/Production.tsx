import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCcw, Target, TrendingUp } from 'lucide-react'
import { ApiError } from '../lib/api'
import { getProductionShift } from '../services/productionService'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { ExecutiveKpiCard } from '../components/kpi/ExecutiveKpiCard'
import { PremiumGaugeChart, PremiumHeatmapChart, PremiumLineAreaChart } from '../components/charts/premium'
import { useAppStore } from '../store'
import { useModuleT } from '../i18n/useModuleT'
import { productionT, type ProductionT } from '../i18n/modules/production'
import { formatHourLabel } from '../lib/time/operationalHour'
import { useAgentWidget } from '../lib/agentRegistry/useAgentWidget'
import type { AgentWidgetSnapshot } from '../lib/agentRegistry/types'

function tons(value: number) {
  return `${Math.round(value).toLocaleString('es-CL')} t`
}

function signedTons(value: number) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${tons(value)}`
}

function productionState(hasTarget: boolean, currentGap: number | null, projectedGap: number | null, t: ProductionT) {
  if (!hasTarget) {
    return {
      tone: 'slate',
      label: t.sin_plan_label,
      title: t.sin_plan_title,
      message: t.sin_plan_message,
    }
  }
  if ((projectedGap ?? -1) >= 0 && (currentGap ?? 0) >= 0) {
    return {
      tone: 'green',
      label: t.verde_label,
      title: t.verde_title,
      message: t.verde_message,
    }
  }
  if ((projectedGap ?? -1) >= 0) {
    return {
      tone: 'amber',
      label: t.amber_label,
      title: t.amber_title,
      message: t.amber_message,
    }
  }
  return {
    tone: 'red',
    label: t.red_label,
    title: t.red_title,
    message: t.red_message,
  }
}

export function Production() {
  const t = useModuleT(productionT)
  const [chartGuidance, setChartGuidance] = useState<string | null>(null)
  const token = useAppStore((state) => state.usuario?.token)
  const query = useQuery({
    queryKey: ['production-shift', 'ACTUAL'],
    queryFn: () => getProductionShift('ACTUAL'),
    enabled: Boolean(token),
    refetchInterval: 60000,
  })

  // Instrumentacion del Agent UI Registry (Etapa 2): las hooks deben
  // llamarse antes de cualquier return temprano (loading/error), por eso
  // van aca arriba con un ref que siempre apunta al ultimo `query.data`
  // disponible - el snapshot nunca se queda con datos obsoletos ni rompe
  // las reglas de hooks de React.
  const dataRef = useRef(query.data)
  dataRef.current = query.data

  const hourlyChartSnapshot = (): AgentWidgetSnapshot => {
    const rows = dataRef.current?.produccion_acumulada ?? []
    const values = rows.map((row) => row.toneladas)
    return {
      widgetId: 'production-hourly-chart',
      type: 'chart',
      label: t.chart_toneladas_hora_title,
      updatedAt: new Date().toISOString(),
      series: [{
        name: t.chart_toneladas_hora_title,
        unit: 't',
        summary: values.length
          ? { latest: values[values.length - 1], average: Math.round(values.reduce((a, b) => a + b, 0) / values.length), minimum: Math.min(...values), maximum: Math.max(...values) }
          : null,
      }],
    }
  }

  const complianceSnapshot = (): AgentWidgetSnapshot => {
    const current = dataRef.current
    const hasTargetNow = current ? current.meta_configurada !== false && current.meta_turno > 0 : false
    return {
      widgetId: 'production-plan-compliance',
      type: 'kpi',
      label: t.kpi_cumplimiento,
      value: hasTargetNow && current ? Number(current.cumplimiento_pct.toFixed(1)) : 0,
      unit: '%',
      target: 100,
      status: !hasTargetNow ? undefined : (current!.cumplimiento_pct >= 100 ? 'ok' : current!.cumplimiento_pct >= 90 ? 'warning' : 'critical'),
      updatedAt: new Date().toISOString(),
    }
  }

  const hourlyChartWidget = useAgentWidget({
    id: 'production-hourly-chart',
    moduleId: 'produccion',
    type: 'chart',
    label: t.chart_toneladas_hora_title,
    description: 'Toneladas producidas por hora del turno actual, acumulado y meta.',
    supportedActions: ['focus_widget', 'explain_widget', 'highlight_series', 'highlight_range', 'highlight_point', 'focus_anomaly', 'clear_highlight'],
    agentGuidance: { preferredEffect: 'spotlight', canHighlightSeries: true, canHighlightPoint: true, canHighlightRange: true },
    performSemanticAction: (action) => {
      setChartGuidance(action === 'clear_highlight' ? null : action)
      if (action !== 'clear_highlight') window.setTimeout(() => setChartGuidance(null), 1500)
      return true
    },
    getSnapshot: hourlyChartSnapshot,
  })

  useAgentWidget({
    id: 'production-plan-compliance',
    moduleId: 'produccion',
    type: 'kpi',
    label: t.kpi_cumplimiento,
    description: 'Cumplimiento de plan del turno actual contra la meta configurada.',
    supportedActions: ['explain_widget'],
    getSnapshot: complianceSnapshot,
  })

  if (!token) {
    return <ErrorState detail={t.error_no_session} />
  }

  if (query.isLoading) return <LoadingState label={t.loading} />
  if (query.isError || !query.data) {
    const detail = query.error instanceof ApiError && (query.error.status === 401 || query.error.status === 403)
      ? `${t.error_prefix} ${t.error_session_invalid}`
      : t.error_generic
    return <ErrorState detail={`${detail} ${t.error_no_demo_suffix}`} onRetry={() => query.refetch()} />
  }

  const data = query.data
  const dataSource = data.data_source ?? (data.source === 'demo' ? 'DEMO' : 'REAL')
  const sourceLabel = data.stale ? t.source_cache : dataSource === 'DEMO' ? t.source_demo : t.source_real
  const lastRecord = data.last_real_record ? new Date(data.last_real_record).toLocaleString('es-CL') : t.sin_registro
  const sourceSystem = data.source_system ?? data.source
  const hasProductionRows = data.produccion_acumulada.length > 0
  const hasTarget = data.meta_configurada !== false && data.meta_turno > 0
  const projectedFinal = data.proyeccion_fin_turno ?? data.toneladas_turno
  const projectedGap = data.brecha_proyectada_ton ?? (hasTarget ? projectedFinal - data.meta_turno : null)
  const projectionModelLabel = data.proyeccion_modelo === 'regresion_lineal_ols' && typeof data.proyeccion_r2 === 'number'
    ? t.proyeccion_modelo_regresion(data.proyeccion_r2.toFixed(2))
    : data.proyeccion_modelo
      ? t.proyeccion_modelo_ritmo
      : null
  const expectedNow = data.expected_tonnes_now ?? null
  const currentGap = data.actual_vs_expected_ton ?? null
  const isProjectedGreen = hasTarget && projectedGap !== null && projectedGap >= 0
  const targetLabel = hasTarget ? tons(data.meta_turno) : t.sin_meta_configurada
  const dailyTargetLabel = hasTarget && data.daily_target_tonnes ? t.plan_diario(tons(data.daily_target_tonnes)) : t.sin_plan_diario
  const projectionLabel = hasTarget
    ? isProjectedGreen ? t.proyeccion_sobre_meta : t.proyeccion_riesgo
    : t.sin_evaluacion
  const hourlyChartData = data.produccion_acumulada.map((item) => ({
    label: formatHourLabel(item.hora),
    toneladas: item.toneladas,
    acumulado: item.acumulado,
    meta: item.meta ?? 0,
  }))
  const bestLabel = data.mejor_hora ? formatHourLabel(data.mejor_hora.hora) : undefined
  const worstLabel = data.peor_hora ? formatHourLabel(data.peor_hora.hora) : undefined
  const state = productionState(hasTarget, currentGap, projectedGap, t)
  const elapsedLabel = typeof data.elapsed_pct === 'number' ? t.avance_pct(data.elapsed_pct.toFixed(1)) : t.avance_no_disponible
  const remainingTonnes = hasTarget ? Math.max(0, data.meta_turno - data.toneladas_turno) : null
  const requiredRate = data.ritmo_requerido_tph ?? null
  const actionItems = [
    hasTarget && remainingTonnes !== null
      ? (remainingTonnes > 0 ? t.faltan_meta(tons(remainingTonnes)) : t.meta_superada)
      : t.configurar_meta,
    requiredRate !== null && remainingTonnes !== null && remainingTonnes > 0
      ? t.ritmo_requerido(Math.round(requiredRate).toLocaleString('es-CL'))
      : isProjectedGreen ? t.mantener_ritmo : t.validar_ritmo,
    bestLabel ? t.mejor_hora_registrada(bestLabel, tons(data.mejor_hora?.toneladas ?? 0)) : t.esperando_mejor_hora,
  ]

  return (
    <div className="module-page">
      <ModuleHeader
        icon={Activity}
        eyebrow={t.header_eyebrow}
        title={t.header_title}
        description={t.header_desc}
        meta={t.header_meta(sourceLabel, sourceSystem, data.turno_actual, lastRecord)}
        actions={
          <button type="button" className="command-button command-button-secondary" onClick={() => query.refetch()}>
            <RefreshCcw size={15} className={query.isFetching ? 'is-spinning' : undefined} />
            {t.actualizar}
          </button>
        }
      />

      {!!data.warnings?.length && (
        <section className="cockpit-source-stale">
          {data.warnings.slice(0, 2).join(' ')}
        </section>
      )}

      <section className={`production-command-read panel is-${state.tone}`}>
        <div className="production-command-main">
          <span className="panel-kicker">{t.lectura_ejecutiva}</span>
          <h2>{state.title}</h2>
          <p>{state.message}</p>
          <div className="production-command-tags">
            <span>{sourceLabel}</span>
            <span>{data.turno_actual}</span>
            <span>{elapsedLabel}</span>
            <span>{t.registro_label(lastRecord)}</span>
          </div>
        </div>
        <div className="production-command-score">
          <span className={`production-state-pill is-${state.tone}`}>
            {state.tone === 'green' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            {state.label}
          </span>
          <strong>{tons(projectedFinal)}</strong>
          <small>{t.proyeccion_fin_turno}</small>
          {projectionModelLabel && <span className="production-projection-model">{projectionModelLabel}</span>}
          {hasTarget && projectedGap !== null && <em>{t.vs_meta(signedTons(projectedGap))}</em>}
        </div>
        <div className="production-command-actions">
          <strong>{t.que_hacer_ahora}</strong>
          {actionItems.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

      {!hasProductionRows && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">{t.sin_ciclos_kicker}</span>
              <h2>{t.sin_produccion_title(data.fecha, data.turno_actual)}</h2>
            </div>
            <span className="panel-tag">{data.status ?? 'NO_DATA'}</span>
          </div>
          <p className="report-summary">
            {t.sin_produccion_message(sourceSystem)}
          </p>
        </section>
      )}

      <section className="kpi-grid compact">
        <ExecutiveKpiCard
          title={t.kpi_toneladas_turno}
          value={tons(data.toneladas_turno)}
          subtitle={t.kpi_meta_turno(targetLabel)}
          trend={data.tendencia}
          status={typeof data.elapsed_pct === 'number' ? t.avance_pct(data.elapsed_pct.toFixed(1)) : undefined}
          tone="green"
          icon={TrendingUp}
          featured
        />
        <ExecutiveKpiCard
          title={t.kpi_proyeccion_cierre}
          value={tons(projectedFinal)}
          subtitle={hasTarget && projectedGap !== null ? t.kpi_vs_meta_final(signedTons(projectedGap)) : t.kpi_meta_no_evaluable}
          trend={projectionLabel}
          trendDirection={isProjectedGreen ? 'up' : hasTarget ? 'down' : 'flat'}
          tone={isProjectedGreen ? 'green' : hasTarget ? 'amber' : 'slate'}
          icon={Activity}
        />
        <ExecutiveKpiCard
          title={t.kpi_cumplimiento}
          value={hasTarget ? `${data.cumplimiento_pct.toFixed(1)}%` : t.kpi_sin_meta}
          subtitle={t.kpi_contra_meta_final(dailyTargetLabel)}
          trend={typeof data.ritmo_actual_tph === 'number' ? `${Math.round(data.ritmo_actual_tph).toLocaleString('es-CL')} t/h` : undefined}
          trendDirection={isProjectedGreen ? 'up' : 'flat'}
          tone={hasTarget ? 'cyan' : 'slate'}
          icon={Target}
        />
        <ExecutiveKpiCard
          title={t.kpi_brecha_hora}
          value={currentGap === null ? t.kpi_sin_meta : signedTons(currentGap)}
          subtitle={expectedNow === null ? t.kpi_esperado_no_disponible : t.kpi_esperado(tons(expectedNow))}
          trend={currentGap === null ? t.kpi_no_evaluable : currentGap >= 0 ? t.kpi_sobre_ritmo : t.kpi_bajo_ritmo}
          trendDirection={currentGap === null ? 'flat' : currentGap >= 0 ? 'up' : 'down'}
          tone={currentGap === null ? 'slate' : currentGap >= 0 ? 'green' : 'red'}
          icon={Clock3}
        />
        <ExecutiveKpiCard title={t.kpi_mejor_hora} value={data.mejor_hora ? formatHourLabel(data.mejor_hora.hora) : '-'} subtitle={data.mejor_hora ? tons(data.mejor_hora.toneladas) : t.kpi_sin_data} trend={t.kpi_pico} tone="cyan" icon={Clock3} />
      </section>

      {hasProductionRows && <section className="chart-grid">
        <div className={`panel ${chartGuidance ? 'is-agent-data-highlight' : ''}`} ref={hourlyChartWidget.ref} data-agent-highlight={chartGuidance ?? undefined}>
          <div className="panel-header">
            <div>
              <span className="panel-kicker">{t.chart_toneladas_hora_kicker}</span>
              <h2>{t.chart_toneladas_hora_title}</h2>
            </div>
            <span className="panel-tag">{t.chart_zoom_activo}</span>
          </div>
          <PremiumLineAreaChart
            data={hourlyChartData}
            bestLabel={bestLabel}
            worstLabel={worstLabel}
          />
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">{t.chart_cumplimiento_kicker}</span>
              <h2>{t.chart_cumplimiento_title}</h2>
            </div>
            <span className="panel-tag">{t.chart_turno_tag(data.turno_actual)}</span>
          </div>
          <PremiumGaugeChart
            value={hasTarget ? data.cumplimiento_pct : 0}
            current={data.toneladas_turno}
            meta={hasTarget ? data.meta_turno : 0}
            breach={hasTarget ? data.brecha_ton : 0}
          />
        </div>
      </section>}

      {hasProductionRows && <section className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">{t.chart_heatmap_kicker}</span>
            <h2>{t.chart_heatmap_title}</h2>
          </div>
          <span className="panel-tag">{t.chart_heatmap_tag}</span>
        </div>
        <PremiumHeatmapChart data={data.heatmap ?? []} />
      </section>}
    </div>
  )
}
