import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Brain } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { apiFetch } from '../lib/api'
import { premiumPalette, useChartPaletteKey } from '../components/charts/premium/chartTheme'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { useModuleT } from '../i18n/useModuleT'
import { predictionT, type PredictionT } from '../i18n/modules/prediction'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MlPrediction {
  modelo: { tipo: string; n_turnos: number; r2: number; rmse: number; mae: number }
  turno_actual: {
    fecha: string
    turno: string
    hora_inicio: number
    hora_fin: number
    horas_transcurridas: number
    horas_restantes: number
  }
  prediccion: {
    produccion_actual: number
    proyeccion_final: number
    meta_turno: number
    intervalo_inf: number
    intervalo_sup: number
    ritmo_actual: number
    ritmo_necesario: number
    confianza: number
    estado: string
    pct_cumplimiento: number
  }
  features: Array<{
    nombre: string
    importancia: number
    grupo: string
    descripcion: string
  }>
  historico: Array<{
    label: string
    turno: string
    predicho: number
    real: number
    error_pct: number
    acertado: boolean
  }>
  recomendacion: {
    estado: string
    texto_principal: string
    acciones: string[]
    factor_critico: string
  }
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

const fetchPrediction = (fecha: string, turno: string) =>
  apiFetch<MlPrediction>(`/api/ml/prediction?fecha=${fecha}&turno=${turno}`)

// ─── Chart builders ──────────────────────────────────────────────────────────

function buildProjectionOption(d: MlPrediction, t: PredictionT): EChartsOption {
  const hoursOrder =
    d.turno_actual.turno === 'NOCHE'
      ? [19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6]
      : [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
  const labels = hoursOrder.map((h) => `${String(h).padStart(2, '0')}:00`)
  const elapsed = Math.round(d.turno_actual.horas_transcurridas)
  const { produccion_actual, proyeccion_final, meta_turno, intervalo_inf, intervalo_sup } =
    d.prediccion

  const central = hoursOrder.map((_, i) => {
    if (i < elapsed) return Math.round((produccion_actual * (i + 1)) / elapsed)
    return Math.round(
      produccion_actual +
        ((proyeccion_final - produccion_actual) * (i - elapsed + 1)) / (12 - elapsed + 1),
    )
  })
  const lower = central.map((v) => Math.round(v * (intervalo_inf / proyeccion_final)))
  const upper = central.map((v) => Math.round(v * (intervalo_sup / proyeccion_final)))
  const meta = hoursOrder.map(() => meta_turno)

  // suppress unused warning — lower band is kept for potential future use
  void lower

  return {
    backgroundColor: 'transparent',
    grid: { top: 40, right: 24, bottom: 40, left: 80 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: premiumPalette.panel,
      borderColor: premiumPalette.border,
      textStyle: { color: premiumPalette.text, fontSize: 12 },
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: premiumPalette.muted, fontSize: 11 },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: premiumPalette.border } },
      axisTick: { show: false },
      axisLabel: { color: premiumPalette.muted, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: premiumPalette.grid } },
      axisLabel: {
        color: premiumPalette.muted,
        fontSize: 10,
        formatter: (v: number) => `${(v / 1000).toFixed(0)}k`,
      },
    },
    series: ([
      {
        name: t.series_banda_confianza,
        type: 'line',
        data: upper,
        lineStyle: { opacity: 0 },
        areaStyle: { color: premiumPalette.cyan, opacity: 0.08 },
        symbol: 'none',
        stack: 'confidence',
      },
      {
        name: t.series_proyeccion,
        type: 'line',
        data: central,
        smooth: true,
        lineStyle: { width: 3, color: premiumPalette.mineral },
        areaStyle: { color: premiumPalette.mineral, opacity: 0.08 },
        symbol: 'circle',
        symbolSize: 5,
        itemStyle: { color: premiumPalette.mineral },
        markPoint:
          elapsed > 0
            ? {
                data: [
                  {
                    coord: [labels[elapsed - 1], central[elapsed - 1]],
                    value: t.mark_ahora,
                  },
                ],
                label: {
                  color: premiumPalette.cyan,
                  fontSize: 10,
                  fontFamily: '"JetBrains Mono",monospace',
                },
                itemStyle: { color: premiumPalette.cyan },
              }
            : undefined,
      },
      {
        name: t.series_meta_turno,
        type: 'line',
        data: meta,
        lineStyle: { width: 2, color: premiumPalette.amber, type: 'dashed' },
        symbol: 'none',
        itemStyle: { color: premiumPalette.amber },
      },
    ] as EChartsOption['series']),
  }
}

function buildFeatureOption(features: MlPrediction['features'], t: PredictionT): EChartsOption {
  const sorted = [...features].sort((a, b) => b.importancia - a.importancia)
  const colorMap: Record<string, string> = {
    operacional: premiumPalette.cyan,
    acumulado: premiumPalette.mineral,
    temporal: premiumPalette.amber,
  }
  return {
    backgroundColor: 'transparent',
    grid: { top: 10, right: 80, bottom: 10, left: 140, containLabel: false },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: premiumPalette.panel,
      borderColor: premiumPalette.border,
      textStyle: { color: premiumPalette.text, fontSize: 12 },
      formatter: (params: unknown) => {
        const row = params as [{ dataIndex: number }]
        const f = sorted[row[0].dataIndex]
        return t.tooltip_importancia(f.nombre, f.descripcion, (f.importancia * 100).toFixed(1))
      },
    },
    xAxis: {
      type: 'value',
      max: 0.35,
      axisLabel: {
        formatter: (v: number) => `${(v * 100).toFixed(0)}%`,
        color: premiumPalette.muted,
        fontSize: 10,
      },
      splitLine: { lineStyle: { color: premiumPalette.grid } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map((f) => f.nombre),
      axisLabel: {
        color: premiumPalette.text,
        fontSize: 11,
        fontFamily: '"JetBrains Mono",monospace',
      },
    },
    series: ([
      {
        type: 'bar',
        barMaxWidth: 22,
        data: sorted.map((f) => ({
          value: f.importancia,
          itemStyle: {
            color: colorMap[f.grupo] ?? premiumPalette.cyan,
            borderRadius: [0, 4, 4, 0],
          },
        })),
        label: {
          show: true,
          position: 'right',
          formatter: (p: { value: number }) => `${(p.value * 100).toFixed(1)}%`,
          color: premiumPalette.text,
          fontSize: 10,
          fontFamily: '"JetBrains Mono",monospace',
        },
      },
    ] as EChartsOption['series']),
  }
}

function buildHistoricoOption(historico: MlPrediction['historico'], t: PredictionT): EChartsOption {
  const labels = historico.map((h) => `${h.label} ${h.turno[0]}`)
  return {
    backgroundColor: 'transparent',
    grid: { top: 32, right: 18, bottom: 40, left: 80 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: premiumPalette.panel,
      borderColor: premiumPalette.border,
      textStyle: { color: premiumPalette.text, fontSize: 12 },
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: premiumPalette.muted, fontSize: 11 },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: premiumPalette.muted, fontSize: 9, rotate: 30 },
      axisLine: { lineStyle: { color: premiumPalette.border } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: premiumPalette.grid } },
      axisLabel: {
        color: premiumPalette.muted,
        fontSize: 10,
        formatter: (v: number) => `${(v / 1000).toFixed(0)}k`,
      },
    },
    series: ([
      {
        name: t.series_predicho,
        type: 'line',
        data: historico.map((h) => h.predicho),
        smooth: true,
        lineStyle: { width: 2, color: premiumPalette.cyan },
        symbol: 'circle',
        symbolSize: 5,
        itemStyle: { color: premiumPalette.cyan },
      },
      {
        name: t.series_real,
        type: 'line',
        data: historico.map((h) => h.real),
        smooth: true,
        lineStyle: { width: 2, color: premiumPalette.mineral },
        symbol: 'circle',
        symbolSize: 5,
        itemStyle: { color: premiumPalette.mineral },
      },
    ] as EChartsOption['series']),
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
}) {
  return (
    <div
      className="panel"
      style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--nm-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: '"JetBrains Mono",monospace',
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--nm-text)',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--nm-muted)', fontFamily: '"JetBrains Mono",monospace' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function HistoricoTable({ historico, t }: { historico: MlPrediction['historico']; t: PredictionT }) {
  return (
    <div style={{ overflowX: 'auto', marginTop: 16 }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: '"JetBrains Mono",monospace',
          fontSize: 12,
        }}
      >
        <thead>
          <tr style={{ borderBottom: '1px solid var(--nm-border)' }}>
            {[t.table_col_turno, t.table_col_predicho, t.table_col_real, t.table_col_error, t.table_col_estado].map((col) => (
              <th
                key={col}
                style={{
                  padding: '6px 10px',
                  textAlign: 'left',
                  color: 'var(--nm-muted)',
                  fontWeight: 600,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {historico.map((h, i) => {
            const absErr = Math.abs(h.error_pct)
            const badgeClass =
              absErr <= 5
                ? 'command-status-pill status-tone-success'
                : absErr <= 10
                  ? 'command-status-pill status-tone-warning'
                  : 'command-status-pill status-tone-critical'
            const badgeLabel = absErr <= 5 ? t.badge_acertado : absErr <= 10 ? t.badge_margen : t.badge_fallo
            return (
              <tr
                key={i}
                style={{
                  borderBottom: '1px solid rgba(245,255,250,0.04)',
                  color: 'var(--nm-text)',
                }}
              >
                <td style={{ padding: '6px 10px' }}>
                  {h.label} {h.turno[0]}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  {h.predicho.toLocaleString('es-CL')} t
                </td>
                <td style={{ padding: '6px 10px' }}>
                  {h.real.toLocaleString('es-CL')} t
                </td>
                <td
                  style={{
                    padding: '6px 10px',
                    color: absErr <= 5 ? 'var(--nm-green)' : absErr <= 10 ? 'var(--nm-amber)' : 'var(--nm-red)',
                  }}
                >
                  {h.error_pct > 0 ? '+' : ''}
                  {h.error_pct.toFixed(1)}%
                </td>
                <td style={{ padding: '6px 10px' }}>
                  <span className={badgeClass}>{badgeLabel}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Prediction() {
  const t = useModuleT(predictionT)
  const paletteKey = useChartPaletteKey()
  const [fecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [turno, setTurno] = useState<'DIA' | 'NOCHE'>('NOCHE')

  const query = useQuery({
    queryKey: ['ml-prediction', fecha, turno],
    queryFn: () => fetchPrediction(fecha, turno),
    staleTime: 60_000,
  })

  const animProd = useAnimatedNumber(query.data?.prediccion.produccion_actual ?? 0, {
    durationMs: 700,
  })

  // Los tres builders de ECharts reconstruian el option completo en cada
  // render (incluidos cambios de estado sin relacion, como pasar el mouse
  // sobre una fila), memoizados aca por data/t.
  const projectionOption = useMemo(
    () => (query.data ? buildProjectionOption(query.data, t) : null),
    [query.data, t, paletteKey],
  )
  const featureOption = useMemo(
    () => (query.data ? buildFeatureOption(query.data.features, t) : null),
    [query.data, t, paletteKey],
  )
  const historicoOption = useMemo(
    () => (query.data ? buildHistoricoOption(query.data.historico, t) : null),
    [query.data, t, paletteKey],
  )

  if (query.isLoading) return <LoadingState label={t.loading} />
  if (query.isError || !query.data)
    return <ErrorState detail={t.error} onRetry={() => query.refetch()} />

  const data = query.data
  const pred = data.prediccion
  const ta = data.turno_actual

  // Estado → color
  const estadoColor =
    pred.estado === 'SOBRE_META'
      ? 'var(--nm-green)'
      : pred.estado === 'EN_RIESGO'
        ? 'var(--nm-amber)'
        : 'var(--nm-red)'

  // Recomendación color
  const recoColor =
    data.recomendacion.estado === 'SOBRE_META' ||
    data.recomendacion.estado === 'OK' ||
    data.recomendacion.estado === 'NORMAL'
      ? premiumPalette.mineral
      : premiumPalette.amber

  // Gauge option
  const gaugeOption: EChartsOption = {
    series: [
      {
        type: 'gauge',
        radius: '90%',
        startAngle: 200,
        endAngle: -20,
        min: 80,
        max: 115,
        splitNumber: 7,
        axisLine: {
          lineStyle: {
            width: 18,
            color: [
              [10 / 35, premiumPalette.red],
              [19 / 35, premiumPalette.amber],
              [1, premiumPalette.mineral],
            ],
          },
        },
        pointer: { itemStyle: { color: 'auto' } },
        axisTick: { distance: -18, length: 6, lineStyle: { color: '#fff', width: 1 } },
        splitLine: { distance: -18, length: 14, lineStyle: { color: '#fff', width: 2 } },
        axisLabel: { color: premiumPalette.muted, fontSize: 10, distance: -30 },
        detail: {
          valueAnimation: true,
          formatter: '{value}%',
          color: 'var(--nm-text)',
          fontSize: 28,
          fontFamily: '"JetBrains Mono",monospace',
          fontWeight: 700,
          offsetCenter: [0, '65%'],
        },
        data: [
          {
            value: pred.pct_cumplimiento,
            name: pred.estado.replace('_', ' '),
          },
        ],
      },
    ],
    backgroundColor: 'transparent',
  }

  const transcurridoPct = (ta.horas_transcurridas / 12) * 100

  return (
    <div className="module-page">
      <ModuleHeader
        icon={Brain}
        eyebrow={t.header_eyebrow}
        title={t.header_title}
        description={t.header_desc}
        meta={t.header_meta(ta.fecha, ta.turno)}
      />

      {/* ── SECCIÓN A — Header modelo ── */}
      <section
        className="panel"
        style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>🤖</span>
          <div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--nm-muted)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {t.modelo_predictivo}
            </div>
            <div
              style={{
                fontFamily: '"JetBrains Mono",monospace',
                fontSize: 16,
                color: 'var(--nm-text)',
                fontWeight: 700,
              }}
            >
              {data.modelo.tipo} · {t.turnos_entrenados(data.modelo.n_turnos)}
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginLeft: 'auto',
            alignItems: 'center',
          }}
        >
          <span className="command-status-pill status-tone-success">R² {data.modelo.r2}</span>
          <span className="command-status-pill status-tone-info">
            RMSE {data.modelo.rmse.toLocaleString('es-CL')}t
          </span>
          <span className="command-status-pill status-tone-info">
            MAE {data.modelo.mae.toLocaleString('es-CL')}t
          </span>
          <span style={{ color: 'var(--nm-muted)', fontSize: 12 }}>
            {t.modelo_acierta(pred.confianza)}
          </span>
          <div className="filter-bar">
            {(['DIA', 'NOCHE'] as const).map((t) => (
              <button key={t} className={turno === t ? 'active' : ''} onClick={() => setTurno(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN B — Stats + Gauge + barra progreso ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {/* Left: stats grid + barra de progreso */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <StatCard
              label={t.stat_produccion_actual}
              value={`${Math.round(animProd).toLocaleString('es-CL')} t`}
              sub={t.stat_produccion_actual_sub(pred.ritmo_actual)}
            />
            <StatCard
              label={t.stat_proyeccion_final}
              value={`${pred.proyeccion_final.toLocaleString('es-CL')} t`}
              sub={t.stat_proyeccion_final_sub(pred.intervalo_inf.toLocaleString('es-CL'), pred.intervalo_sup.toLocaleString('es-CL'))}
            />
            <StatCard
              label={t.stat_meta_turno}
              value={
                <span style={{ color: estadoColor }}>
                  {pred.meta_turno.toLocaleString('es-CL')} t
                </span>
              }
              sub={pred.estado.replace('_', ' ')}
            />
            <StatCard
              label={t.stat_ritmo_actual_necesario}
              value={`${pred.ritmo_actual} t/h`}
              sub={t.stat_ritmo_necesario_sub(pred.ritmo_necesario)}
            />
          </div>

          {/* Barra progreso del turno */}
          <div className="panel" style={{ padding: '14px 18px' }}>
            <div
              style={{
                margin: '0 0 4px',
                fontFamily: '"JetBrains Mono",monospace',
                fontSize: 11,
                color: 'var(--nm-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}
            >
              {t.progreso_turno}
            </div>
            <div
              style={{
                margin: '12px 0',
                fontFamily: '"JetBrains Mono",monospace',
                fontSize: 12,
                color: 'var(--nm-muted)',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}
              >
                <span>{ta.hora_inicio}:00</span>
                <span style={{ color: 'var(--nm-green)' }}>
                  {t.horas_transcurridas(ta.horas_transcurridas)}
                </span>
                <span>{ta.hora_fin}:00</span>
              </div>
              <div
                style={{
                  height: 8,
                  background: 'rgba(245,255,250,0.08)',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    borderRadius: 4,
                    width: `${transcurridoPct}%`,
                    background: 'linear-gradient(90deg, var(--nm-cyan), var(--nm-green))',
                    transition: 'width 600ms ease',
                  }}
                />
              </div>
              <div style={{ textAlign: 'right', marginTop: 4 }}>
                {t.transcurrido_restantes(transcurridoPct.toFixed(0), ta.horas_restantes)}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Gauge */}
        <div className="panel" style={{ padding: '14px 18px' }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--nm-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            {t.cumplimiento_proyectado}
          </div>
          <ReactECharts option={gaugeOption} style={{ height: 280 }} />
        </div>
      </div>

      {/* ── SECCIÓN C — Gráfico proyección ── */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">{t.chart_proyeccion_kicker}</span>
            <h2>{t.chart_proyeccion_title}</h2>
          </div>
        </div>
        {projectionOption && <ReactECharts option={projectionOption} style={{ height: 300 }} />}
      </section>

      {/* ── SECCIÓN D — Feature importance ── */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">{t.chart_features_kicker}</span>
            <h2>{t.chart_features_title}</h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--nm-cyan)', fontFamily: '"JetBrains Mono",monospace' }}>
              {t.legend_operacional}
            </span>
            <span style={{ fontSize: 12, color: 'var(--nm-green)', fontFamily: '"JetBrains Mono",monospace' }}>
              {t.legend_acumulado}
            </span>
            <span style={{ fontSize: 12, color: 'var(--nm-amber)', fontFamily: '"JetBrains Mono",monospace' }}>
              {t.legend_temporal}
            </span>
          </div>
        </div>
        {featureOption && (
          <ReactECharts
            option={featureOption}
            style={{ height: Math.max(200, data.features.length * 30) }}
          />
        )}
      </section>

      {/* ── SECCIÓN E — Histórico 14 turnos ── */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">{t.chart_historico_kicker}</span>
            <h2>{t.chart_historico_title(data.historico.length)}</h2>
          </div>
        </div>
        {historicoOption && <ReactECharts option={historicoOption} style={{ height: 260 }} />}
        <HistoricoTable historico={data.historico} t={t} />
      </section>

      {/* ── SECCIÓN F — Recomendación ── */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">{t.chart_recomendacion_kicker}</span>
            <h2>{t.chart_recomendacion_title(data.recomendacion.factor_critico)}</h2>
          </div>
        </div>
        <div
          style={{
            borderLeft: `4px solid ${recoColor}`,
            padding: '16px 20px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '0 8px 8px 0',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--nm-text)', marginBottom: 8 }}>
            {data.recomendacion.texto_principal}
          </div>
          <ul
            style={{
              margin: '8px 0 0',
              paddingLeft: 18,
              color: 'var(--nm-muted)',
              fontSize: 13,
              display: 'grid',
              gap: 4,
            }}
          >
            {data.recomendacion.acciones.map((accion, i) => (
              <li key={i}>{accion}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
