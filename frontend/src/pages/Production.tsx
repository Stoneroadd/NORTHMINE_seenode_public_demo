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

function tons(value: number) {
  return `${Math.round(value).toLocaleString('es-CL')} t`
}

function signedTons(value: number) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${tons(value)}`
}

function productionState(hasTarget: boolean, currentGap: number | null, projectedGap: number | null) {
  if (!hasTarget) {
    return {
      tone: 'slate',
      label: 'Sin plan',
      title: 'Meta no configurada',
      message: 'La produccion real se muestra desde WENCO, pero no se evalua cumplimiento sin meta de turno.',
    }
  }
  if ((projectedGap ?? -1) >= 0 && (currentGap ?? 0) >= 0) {
    return {
      tone: 'green',
      label: 'En verde',
      title: 'Ritmo suficiente para cerrar sobre meta',
      message: 'Mantener continuidad de carguio y vigilar horas valle para no perder la ventaja proyectada.',
    }
  }
  if ((projectedGap ?? -1) >= 0) {
    return {
      tone: 'amber',
      label: 'Preventivo',
      title: 'La proyeccion llega, pero el turno requiere control',
      message: 'Revisar continuidad horaria y asignacion CAEX antes de que la brecha a esta hora se convierta en riesgo.',
    }
  }
  return {
    tone: 'red',
    label: 'Riesgo',
    title: 'La proyeccion queda bajo meta',
    message: 'Priorizar carguio critico, CAEX disponibles y restricciones de destino para recuperar toneladas dentro del turno.',
  }
}

export function Production() {
  const token = useAppStore((state) => state.usuario?.token)
  const query = useQuery({
    queryKey: ['production-shift', 'ACTUAL'],
    queryFn: () => getProductionShift('ACTUAL'),
    enabled: Boolean(token),
    refetchInterval: 60000,
  })

  if (!token) {
    return <ErrorState detail="Sesion no disponible. Inicia sesion nuevamente para cargar Produccion real." />
  }

  if (query.isLoading) return <LoadingState label="Cargando produccion del turno..." />
  if (query.isError || !query.data) {
    const detail = query.error instanceof ApiError && (query.error.status === 401 || query.error.status === 403)
      ? 'No se pudo cargar /api/production/shift: la sesion no es valida o no tiene permisos para ver Produccion real.'
      : query.error instanceof Error
        ? `No se pudo cargar /api/production/shift: ${query.error.message}`
        : 'No se pudo cargar /api/production/shift.'
    return <ErrorState detail={`${detail} No se usa demo sin modo explicito del backend.`} />
  }

  const data = query.data
  const dataSource = data.data_source ?? (data.source === 'demo' ? 'DEMO' : 'REAL')
  const sourceLabel = data.stale ? 'CACHE REAL' : dataSource === 'DEMO' ? 'MODO DEMO' : 'DATOS REALES'
  const lastRecord = data.last_real_record ? new Date(data.last_real_record).toLocaleString('es-CL') : 'Sin registro'
  const sourceSystem = data.source_system ?? data.source
  const hasProductionRows = data.produccion_acumulada.length > 0
  const hasTarget = data.meta_configurada !== false && data.meta_turno > 0
  const projectedFinal = data.proyeccion_fin_turno ?? data.toneladas_turno
  const projectedGap = data.brecha_proyectada_ton ?? (hasTarget ? projectedFinal - data.meta_turno : null)
  const expectedNow = data.expected_tonnes_now ?? null
  const currentGap = data.actual_vs_expected_ton ?? null
  const isProjectedGreen = hasTarget && projectedGap !== null && projectedGap >= 0
  const targetLabel = hasTarget ? tons(data.meta_turno) : 'Sin meta configurada'
  const dailyTargetLabel = hasTarget && data.daily_target_tonnes ? `${tons(data.daily_target_tonnes)}/dia` : 'Sin plan diario'
  const projectionLabel = hasTarget
    ? isProjectedGreen ? 'Cierre sobre meta' : 'Riesgo de cierre'
    : 'Sin evaluacion'
  const hourlyChartData = data.produccion_acumulada.map((item) => ({
    label: `${String(item.hora).padStart(2, '0')}:00`,
    toneladas: item.toneladas,
    acumulado: item.acumulado,
    meta: item.meta ?? 0,
  }))
  const bestLabel = data.mejor_hora ? `${String(data.mejor_hora.hora).padStart(2, '0')}:00` : undefined
  const worstLabel = data.peor_hora ? `${String(data.peor_hora.hora).padStart(2, '0')}:00` : undefined
  const state = productionState(hasTarget, currentGap, projectedGap)
  const elapsedLabel = typeof data.elapsed_pct === 'number' ? `${data.elapsed_pct.toFixed(1)}% del turno` : 'Avance no disponible'
  const remainingTonnes = hasTarget ? Math.max(0, data.meta_turno - data.toneladas_turno) : null
  const requiredRate = data.ritmo_requerido_tph ?? null
  const actionItems = [
    hasTarget && remainingTonnes !== null
      ? `${remainingTonnes > 0 ? `Faltan ${tons(remainingTonnes)} para meta de turno.` : 'Meta de turno superada con produccion real.'}`
      : 'Configurar meta de turno para activar brecha y cumplimiento.',
    requiredRate !== null && remainingTonnes !== null && remainingTonnes > 0
      ? `Ritmo requerido restante: ${Math.round(requiredRate).toLocaleString('es-CL')} t/h.`
      : isProjectedGreen ? 'Mantener ritmo actual; la proyeccion esta sobre meta.' : 'Validar ritmo requerido cuando exista plan.',
    bestLabel ? `Mejor hora registrada: ${bestLabel} con ${tons(data.mejor_hora?.toneladas ?? 0)}.` : 'Esperando horas reales para detectar mejor hora.',
  ]

  return (
    <div className="module-page">
      <ModuleHeader
        icon={Activity}
        eyebrow="Produccion"
        title="Control de turno"
        description="Lectura ejecutiva de tonelaje, cumplimiento, brecha y tendencia operacional por hora."
        meta={`${sourceLabel} - ${sourceSystem} - ${data.turno_actual} - Registro ${lastRecord}`}
        actions={
          <button type="button" className="command-button command-button-secondary" onClick={() => query.refetch()}>
            <RefreshCcw size={15} className={query.isFetching ? 'is-spinning' : undefined} />
            Actualizar
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
          <span className="panel-kicker">Lectura ejecutiva</span>
          <h2>{state.title}</h2>
          <p>{state.message}</p>
          <div className="production-command-tags">
            <span>{sourceLabel}</span>
            <span>{data.turno_actual}</span>
            <span>{elapsedLabel}</span>
            <span>Registro {lastRecord}</span>
          </div>
        </div>
        <div className="production-command-score">
          <span className={`production-state-pill is-${state.tone}`}>
            {state.tone === 'green' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            {state.label}
          </span>
          <strong>{tons(projectedFinal)}</strong>
          <small>Proyeccion fin de turno</small>
          {hasTarget && projectedGap !== null && <em>{signedTons(projectedGap)} vs meta</em>}
        </div>
        <div className="production-command-actions">
          <strong>Que hacer ahora</strong>
          {actionItems.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

      {!hasProductionRows && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Sin ciclos para el filtro</span>
              <h2>No hay produccion para {data.fecha} / {data.turno_actual}</h2>
            </div>
            <span className="panel-tag">{data.status ?? 'NO_DATA'}</span>
          </div>
          <p className="report-summary">
            No hay produccion para el turno actual. La API respondio desde {sourceSystem};
            no se muestran datos sinteticos automaticamente.
          </p>
        </section>
      )}

      <section className="kpi-grid compact">
        <ExecutiveKpiCard
          title="Toneladas turno"
          value={tons(data.toneladas_turno)}
          subtitle={`Meta turno ${targetLabel}`}
          trend={data.tendencia}
          status={typeof data.elapsed_pct === 'number' ? `${data.elapsed_pct.toFixed(1)}% avance` : undefined}
          tone="green"
          icon={TrendingUp}
          featured
        />
        <ExecutiveKpiCard
          title="Proyeccion cierre"
          value={tons(projectedFinal)}
          subtitle={hasTarget && projectedGap !== null ? `${signedTons(projectedGap)} vs meta final` : 'Meta no evaluable'}
          trend={projectionLabel}
          trendDirection={isProjectedGreen ? 'up' : hasTarget ? 'down' : 'flat'}
          tone={isProjectedGreen ? 'green' : hasTarget ? 'amber' : 'slate'}
          icon={Activity}
        />
        <ExecutiveKpiCard
          title="Cumplimiento"
          value={hasTarget ? `${data.cumplimiento_pct.toFixed(1)}%` : 'Sin meta'}
          subtitle={`Contra meta final - ${dailyTargetLabel}`}
          trend={typeof data.ritmo_actual_tph === 'number' ? `${Math.round(data.ritmo_actual_tph).toLocaleString('es-CL')} t/h` : undefined}
          trendDirection={isProjectedGreen ? 'up' : 'flat'}
          tone={hasTarget ? 'cyan' : 'slate'}
          icon={Target}
        />
        <ExecutiveKpiCard
          title="Brecha a esta hora"
          value={currentGap === null ? 'Sin meta' : signedTons(currentGap)}
          subtitle={expectedNow === null ? 'Esperado no disponible' : `Esperado ${tons(expectedNow)}`}
          trend={currentGap === null ? 'No evaluable' : currentGap >= 0 ? 'Sobre ritmo' : 'Bajo ritmo'}
          trendDirection={currentGap === null ? 'flat' : currentGap >= 0 ? 'up' : 'down'}
          tone={currentGap === null ? 'slate' : currentGap >= 0 ? 'green' : 'red'}
          icon={Clock3}
        />
        <ExecutiveKpiCard title="Mejor hora" value={data.mejor_hora ? `${String(data.mejor_hora.hora).padStart(2, '0')}:00` : '-'} subtitle={data.mejor_hora ? tons(data.mejor_hora.toneladas) : 'Sin data'} trend="peak" tone="cyan" icon={Clock3} />
      </section>

      {hasProductionRows && <section className="chart-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Toneladas por hora</span>
              <h2>Produccion, acumulado y meta</h2>
            </div>
            <span className="panel-tag">Zoom activo</span>
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
              <span className="panel-kicker">Cumplimiento</span>
              <h2>Meta de turno</h2>
            </div>
            <span className="panel-tag">Turno {data.turno_actual}</span>
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
            <span className="panel-kicker">Heatmap operacional</span>
            <h2>Intensidad por hora y unidad de carguio</h2>
          </div>
          <span className="panel-tag">Toneladas / celda</span>
        </div>
        <PremiumHeatmapChart data={data.heatmap ?? []} />
      </section>}
    </div>
  )
}
