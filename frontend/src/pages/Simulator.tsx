import { useState, useEffect, useMemo, useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { Target } from 'lucide-react'
import { apiFetch } from '../lib/api'
import { premiumPalette, useChartPaletteKey } from '../components/charts/premium/chartTheme'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { ErrorState } from '../components/common/ErrorState'
import { LoadingState } from '../components/common/LoadingState'
import { ApiError } from '../lib/api'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { useModuleT } from '../i18n/useModuleT'
import { simulatorT, type SimulatorT } from '../i18n/modules/simulator'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SimResult {
  inputs: {
    caex: number
    ciclos_hora: number
    ton_ciclo: number
    disponibilidad: number
    dias: number
    turno: string
  }
  resultado: {
    produccion_estimada: number
    meta_mes: number
    brecha: number
    estado: string
    ciclos_totales: number
    caex_minimo: number
    pct_meta: number
  }
  curva_caex: Array<{ caex: number; produccion: number; sobre_meta: boolean }>
  sensibilidad: {
    ciclos_hora_baja_10pct: { produccion: number; delta: number; estado: string }
    ton_ciclo_baja_10pct: { produccion: number; delta: number; estado: string }
    disponibilidad_baja_5pt: { produccion: number; delta: number; estado: string }
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULTS = {
  caex: 28,
  ciclos_hora: 3.8,
  ton_ciclo: 218,
  disponibilidad: 88,
  dias: 31,
  turno: 'AMBOS',
} as const

type SimValues = {
  caex: number
  ciclos_hora: number
  ton_ciclo: number
  disponibilidad: number
  dias: number
  turno: string
}

// La meta mensual la entrega el backend (result.resultado.meta_mes) — no se
// hardcodea aca para evitar que el numero mostrado quede desincronizado del
// que realmente se usa para calcular brecha/estado/curva de equilibrio.

// ─── Chart builder ────────────────────────────────────────────────────────────

function buildCrossoverOption(
  curva: SimResult['curva_caex'],
  currentCaex: number,
  caexMin: number,
  metaMes: number,
  t: SimulatorT,
): EChartsOption {
  const xs = curva.map((p) => p.caex)
  const ys = curva.map((p) => p.produccion)

  const currentPoint = curva.find((p) => p.caex === currentCaex)
  const currentProd = currentPoint?.produccion ?? 0
  const currentSobre = currentPoint?.sobre_meta ?? false

  return {
    backgroundColor: 'transparent',
    grid: { top: 40, right: 24, bottom: 40, left: 80 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: premiumPalette.panel,
      borderColor: premiumPalette.border,
      textStyle: { color: premiumPalette.text, fontSize: 12 },
      formatter: (params: unknown) => {
        const rows = params as [{ axisValue: number; value: number }]
        return t.tooltip_crossover(rows[0].axisValue, rows[0].value.toLocaleString('es-CL'))
      },
    },
    xAxis: {
      type: 'category',
      data: xs,
      name: 'CAEX',
      nameLocation: 'end',
      nameTextStyle: { color: premiumPalette.muted, fontSize: 10 },
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
        formatter: (v: number) => `${(v / 1e6).toFixed(1)}M`,
      },
    },
    visualMap: {
      show: false,
      dimension: 1,
      pieces: [
        { lt: metaMes, color: `color-mix(in srgb, ${premiumPalette.red} 18%, transparent)` },
        { gte: metaMes, color: `color-mix(in srgb, ${premiumPalette.mineral} 8%, transparent)` },
      ],
    },
    series: ([
      {
        type: 'line',
        smooth: true,
        data: ys,
        lineStyle: { width: 3, color: premiumPalette.cyan },
        areaStyle: { opacity: 0.3 },
        symbol: 'none',
        markLine: {
          silent: true,
          data: [
            {
              yAxis: metaMes,
              name: 'META',
              label: {
                formatter: t.chart_meta_label,
                color: premiumPalette.amber,
                fontFamily: '"JetBrains Mono",monospace',
                fontSize: 10,
              },
              lineStyle: { type: 'dashed', color: premiumPalette.amber, width: 2 },
            },
          ],
        },
        markPoint: {
          data: [
            {
              name: `${caexMin} CAEX equilibrio`,
              coord: [xs.indexOf(caexMin) >= 0 ? String(caexMin) : String(xs[0]), metaMes],
              label: {
                formatter: t.mark_equilibrio(caexMin),
                color: premiumPalette.amber,
                fontFamily: '"JetBrains Mono",monospace',
                fontSize: 9,
              },
              itemStyle: { color: premiumPalette.amber },
              symbol: 'diamond',
              symbolSize: 12,
            },
            {
              name: `${currentCaex} CAEX actual`,
              coord: [String(currentCaex), currentProd],
              label: {
                formatter: t.mark_actual(currentCaex),
                color: currentSobre ? premiumPalette.mineral : premiumPalette.red,
                fontFamily: '"JetBrains Mono",monospace',
                fontSize: 9,
              },
              itemStyle: { color: currentSobre ? premiumPalette.mineral : premiumPalette.red },
              symbol: 'circle',
              symbolSize: 14,
            },
          ],
        },
      },
    ] as EChartsOption['series']),
  }
}

// ─── Narrative ────────────────────────────────────────────────────────────────

function buildNarrative(v: SimValues, r: SimResult, t: SimulatorT): string {
  const turnoLabel =
    v.turno === 'AMBOS' ? t.narrative_turno_ambos : t.narrative_turno_solo(v.turno)
  const superameta = r.resultado.brecha >= 0
  const brechaValue = Math.abs(r.resultado.brecha).toLocaleString('es-CL')
  return [
    t.narrative_intro(v.caex, v.ciclos_hora, v.ton_ciclo),
    t.narrative_disponibilidad(v.disponibilidad, v.dias, turnoLabel),
    t.narrative_produccion(r.resultado.produccion_estimada.toLocaleString('es-CL')),
    superameta
      ? t.narrative_meta_supera(brechaValue, r.resultado.pct_meta)
      : t.narrative_meta_no_alcanza(brechaValue, r.resultado.pct_meta),
    t.narrative_caex_minimo(r.resultado.caex_minimo),
    v.caex >= r.resultado.caex_minimo
      ? t.narrative_holgura(v.caex, v.caex - r.resultado.caex_minimo)
      : t.narrative_necesita(r.resultado.caex_minimo - v.caex),
  ].join('\n')
}

// ─── Slider row ───────────────────────────────────────────────────────────────

interface SliderRowProps {
  label: string
  field: keyof Omit<SimValues, 'turno'>
  min: number
  max: number
  step: number
  value: number
  onChange: (field: keyof Omit<SimValues, 'turno'>, value: number) => void
  suffix?: string
}

function SliderRow({ label, field, min, max, step, value, onChange, suffix }: SliderRowProps) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="simulator-slider-row">
      <div className="simulator-slider-label">
        <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: 'var(--nm-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </span>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(field, Number(e.target.value))}
          style={{
            width: 72,
            background: 'var(--border-dim)',
            border: '1px solid var(--nm-border)',
            borderRadius: 4,
            color: 'var(--nm-text)',
            fontFamily: '"JetBrains Mono",monospace',
            fontSize: 13,
            fontWeight: 700,
            padding: '2px 6px',
            textAlign: 'right',
          }}
        />
        {suffix && (
          <span style={{ fontSize: 11, color: 'var(--nm-muted)', fontFamily: '"JetBrains Mono",monospace' }}>
            {suffix}
          </span>
        )}
      </div>
      <input
        type="range"
        className="simulator-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(field, Number(e.target.value))}
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Simulator() {
  const t = useModuleT(simulatorT)
  const prefersReduced = usePrefersReducedMotion()
  const [values, setValues] = useState<SimValues>({ ...DEFAULTS })
  const [result, setResult] = useState<SimResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [retryTick, setRetryTick] = useState(0)

  const update = useCallback(
    (field: keyof Omit<SimValues, 'turno'>, val: number) => {
      setValues((prev) => ({ ...prev, [field]: val }))
    },
    [],
  )

  const setTurno = useCallback((t: string) => {
    setValues((prev) => ({ ...prev, turno: t }))
  }, [])

  // Debounced fetch — runs on values change (y en el reintento manual)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      setError(null)
      apiFetch<SimResult>('/api/simulator/run', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          disponibilidad: values.disponibilidad / 100,
        }),
      })
        .then((data) => {
          setResult(data)
        })
        .catch((err) => {
          console.error('Simulator fetch error:', err)
          setError(err instanceof Error ? err : new Error('No se pudo calcular la simulacion.'))
        })
        .finally(() => {
          setLoading(false)
        })
    }, 200)
    return () => clearTimeout(timer)
  }, [values, retryTick])

  // Animated production value
  const { value: animProd, ref: animProdRef } = useAnimatedNumber<HTMLDivElement>(result?.resultado.produccion_estimada ?? 0, {
    durationMs: prefersReduced ? 0 : 600,
  })

  // Derived state from result
  const kpiColor = useMemo(() => {
    if (!result) return 'var(--nm-text)'
    const estado = result.resultado.estado
    if (estado === 'SOBRE_META') return 'var(--nm-green)'
    if (estado === 'EN_RIESGO') return 'var(--nm-amber)'
    return 'var(--nm-red)'
  }, [result])

  const statusTone = useMemo(() => {
    if (!result) return 'status-tone-warning'
    const estado = result.resultado.estado
    if (estado === 'SOBRE_META') return 'status-tone-success'
    if (estado === 'EN_RIESGO') return 'status-tone-warning'
    return 'status-tone-critical'
  }, [result])

  const estadoLabel = result?.resultado.estado.replace(/_/g, ' ') ?? '—'
  const brecha = result?.resultado.brecha ?? 0
  const pct_meta = result?.resultado.pct_meta ?? 0
  const metaMes = result?.resultado.meta_mes ?? 0

  const themeId = useChartPaletteKey()
  const crossoverOption = useMemo(() => {
    if (!result || result.curva_caex.length === 0) return null
    return buildCrossoverOption(result.curva_caex, values.caex, result.resultado.caex_minimo, result.resultado.meta_mes, t)
  }, [result, values.caex, t, themeId])

  const narrative = useMemo(() => {
    if (!result) return null
    return buildNarrative(values, result, t)
  }, [values, result, t])

  return (
    <div className="module-page simulator-page">
      <ModuleHeader
        icon={Target}
        eyebrow={t.header_eyebrow}
        title={t.header_title}
        description={t.header_desc}
      />

      <div
        className="simulator-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: '340px 1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* ── Panel izquierdo: sliders ── */}
        <div
          className="simulator-panel-left panel"
          style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          <div
            style={{
              fontSize: 11,
              color: 'var(--nm-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 700,
              marginBottom: -8,
            }}
          >
            {t.parametros_operacionales}
          </div>

          <SliderRow
            label={t.slider_caex}
            field="caex"
            min={10}
            max={38}
            step={1}
            value={values.caex}
            onChange={update}
          />
          <SliderRow
            label={t.slider_ciclos_hora}
            field="ciclos_hora"
            min={2.0}
            max={5.0}
            step={0.1}
            value={values.ciclos_hora}
            onChange={update}
          />
          <SliderRow
            label={t.slider_ton_ciclo}
            field="ton_ciclo"
            min={150}
            max={320}
            step={5}
            value={values.ton_ciclo}
            onChange={update}
            suffix="t"
          />
          <SliderRow
            label={t.slider_disponibilidad}
            field="disponibilidad"
            min={60}
            max={100}
            step={1}
            value={values.disponibilidad}
            onChange={update}
            suffix="%"
          />
          <SliderRow
            label={t.slider_dias}
            field="dias"
            min={1}
            max={31}
            step={1}
            value={values.dias}
            onChange={update}
          />

          {/* Turno selector */}
          <div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--nm-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                fontWeight: 700,
                marginBottom: 8,
                fontFamily: '"JetBrains Mono",monospace',
              }}
            >
              {t.turnos_label}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['DIA', 'NOCHE', 'AMBOS'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTurno(t)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: values.turno === t ? 'var(--nm-cyan)' : 'var(--nm-border)',
                    background: values.turno === t ? 'rgba(0,212,255,0.12)' : 'transparent',
                    color: values.turno === t ? 'var(--nm-cyan)' : 'var(--nm-muted)',
                    fontFamily: '"JetBrains Mono",monospace',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                    textTransform: 'uppercase',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            className="command-button command-button-secondary"
            onClick={() => setValues({ ...DEFAULTS })}
            style={{ marginTop: 4 }}
          >
            {t.restablecer_valores}
          </button>
        </div>

        {/* ── Panel derecho: resultados ── */}
        <div
          className="simulator-panel-right"
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {loading && !result && !error && <LoadingState label="Calculando simulacion..." />}
          {error && !result && (
            <ErrorState
              detail={
                error instanceof ApiError
                  ? `No se pudo calcular la simulacion: ${error.message}`
                  : 'No se pudo calcular la simulacion.'
              }
              onRetry={() => setRetryTick((v) => v + 1)}
            />
          )}
          {error && result && (
            <div
              className="panel"
              style={{
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                borderColor: 'var(--nm-red)',
                color: 'var(--nm-red)',
                fontSize: 12,
              }}
            >
              <span>El ultimo cambio no se pudo recalcular; se muestra el resultado anterior.</span>
              <button
                type="button"
                className="command-button command-button-secondary"
                onClick={() => setRetryTick((v) => v + 1)}
              >
                Reintentar
              </button>
            </div>
          )}
          {/* Card principal */}
          {result && (
          <div className="panel simulator-result-card" style={{ padding: '20px 24px' }}>
            <div
              className="eyebrow"
              style={{
                fontSize: 11,
                color: 'var(--nm-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 700,
              }}
            >
              {t.produccion_estimada}
            </div>
            <div
              ref={animProdRef}
              style={{
                fontFamily: '"JetBrains Mono",monospace',
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 900,
                color: kpiColor,
                lineHeight: 1,
                margin: '12px 0 8px',
                transition: 'color 300ms ease',
              }}
            >
              {Math.round(animProd).toLocaleString('es-CL')}
              <span style={{ fontSize: '1rem', marginLeft: 8 }}>t</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`command-status-pill ${statusTone}`}>{estadoLabel}</span>
              <span
                style={{
                  color: 'var(--nm-muted)',
                  fontSize: 12,
                  fontFamily: '"JetBrains Mono",monospace',
                }}
              >
                {t.meta_resumen(metaMes.toLocaleString('es-CL'), brecha >= 0 ? '+' : '', brecha.toLocaleString('es-CL'), pct_meta)}
              </span>
            </div>
            {result && (
              <div
                style={{
                  marginTop: 10,
                  color: 'var(--nm-muted)',
                  fontSize: 12,
                  fontFamily: '"JetBrains Mono",monospace',
                }}
              >
                {t.ciclos_totales_caex_minimo(result.resultado.ciclos_totales.toLocaleString('es-CL'))}{' '}
                <strong style={{ color: 'var(--nm-cyan)' }}>
                  {result.resultado.caex_minimo}
                </strong>
              </div>
            )}
            {loading && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: 'var(--nm-muted)',
                  fontFamily: '"JetBrains Mono",monospace',
                }}
              >
                {t.calculando}
              </div>
            )}
          </div>
          )}

          {/* Gráfico punto de cruce */}
          {crossoverOption && (
            <div className="panel" style={{ padding: '14px 18px' }}>
              <div className="panel-header" style={{ marginBottom: 8 }}>
                <div>
                  <span className="panel-kicker">{t.chart_crossover_kicker}</span>
                  <h2>{t.chart_crossover_title}</h2>
                </div>
              </div>
              <ReactECharts option={crossoverOption} style={{ height: 280 }} />
            </div>
          )}

          {/* Sensibilidad */}
          {result && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--nm-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 700,
                  marginBottom: 10,
                  fontFamily: '"JetBrains Mono",monospace',
                }}
              >
                Análisis de sensibilidad
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                }}
              >
                {Object.entries(result.sensibilidad).map(([key, val]) => {
                  const tone =
                    val.estado === 'SOBRE_META'
                      ? 'status-tone-success'
                      : val.estado === 'EN_RIESGO'
                        ? 'status-tone-warning'
                        : 'status-tone-critical'
                  return (
                    <div key={key} className="command-card" style={{ padding: '12px 14px' }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--nm-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          marginBottom: 6,
                        }}
                      >
                        {t.sensitivity_labels[key] ?? key}
                      </div>
                      <div
                        style={{
                          fontFamily: '"JetBrains Mono",monospace',
                          fontSize: 18,
                          color: 'var(--nm-text)',
                          fontWeight: 700,
                        }}
                      >
                        {val.produccion.toLocaleString('es-CL')} t
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                          marginTop: 6,
                        }}
                      >
                        <span className={`command-status-pill ${tone}`}>
                          {val.estado.replace(/_/g, ' ')}
                        </span>
                        <span
                          style={{
                            color: val.delta >= 0 ? 'var(--nm-green)' : 'var(--nm-red)',
                            fontSize: 12,
                            fontFamily: '"JetBrains Mono",monospace',
                          }}
                        >
                          {val.delta >= 0 ? '+' : ''}
                          {val.delta.toLocaleString('es-CL')} t
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Narrativa dinámica */}
          {narrative && (
            <div className="panel" style={{ padding: '16px 20px' }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--nm-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 700,
                  marginBottom: 10,
                }}
              >
                Narrativa operacional
              </div>
              <pre
                style={{
                  fontFamily: '"JetBrains Mono",monospace',
                  fontSize: 12,
                  color: 'var(--nm-text)',
                  lineHeight: 1.8,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {narrative}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
