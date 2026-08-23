import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { X } from 'lucide-react'
import type { CockpitEquipmentCardModel, CockpitShovelHourlyPoint } from './cockpitModel'
import { formatNumber, formatPct, formatTons } from './cockpitModel'
import { getDetailModalStyle, type DetailModalAnchor } from './detailModalPosition'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT, type CockpitT } from '../../i18n/modules/cockpit'
import { premiumPalette, useChartPaletteKey } from '../charts/premium/chartTheme'

// premiumPalette siempre resuelve a hex de 6 digitos (definidos asi en las 6
// apariencias de themes.css), por eso se puede sumar un sufijo de alpha.
function withAlpha(hex: string, alphaHex: string) {
  return hex.startsWith('#') ? `${hex}${alphaHex}` : hex
}

interface Props {
  item: CockpitEquipmentCardModel | null
  hourly: CockpitShovelHourlyPoint[]
  anchor?: DetailModalAnchor | null
  onClose: () => void
}

interface DetailHourlyRow {
  hour: string
  tonnes: number
  cycles: number
  accumulated: number
  throughputTph: number
  tonnesPerCycle: number | null
  origin: string | null
  destination: string | null
  avgDistanceKm: number | null
  avgLoadingTimeMin: number | null
  avgLoadingTimeSource: string | null
  avgCaexWaitTimeMin: number | null
  avgCaexWaitTimeSource: string | null
}

function formatDistance(value: number | null | undefined, t: CockpitT): string {
  if (value === null || value === undefined) return t.common_sin_dato
  return `${formatNumber(value, 1)} km`
}

function formatMinutes(value: number | null | undefined, t: CockpitT): string {
  if (value === null || value === undefined) return t.common_sin_dato
  return `${formatNumber(value, 1)} min`
}

function TooltipContent({ active, payload, label, t }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload as DetailHourlyRow
  if (!row) return null
  const tt = t as CockpitT
  return (
    <div className="nmcp-chart-tooltip is-cyan">
      <div className="nmcp-tooltip-head">
        <span>{tt.loading_modal_tooltip_hora}</span>
        <strong>{label}</strong>
      </div>
      <div className="nmcp-tooltip-grid">
        <span><small>{tt.loading_modal_tooltip_toneladas}</small><b>{formatTons(row.tonnes)}</b></span>
        <span><small>{tt.loading_modal_tooltip_rendimiento}</small><b>{formatNumber(row.throughputTph, 1)} t/h</b></span>
        <span><small>{tt.loading_modal_tooltip_distancia}</small><b>{formatDistance(row.avgDistanceKm, tt)}</b></span>
        <span><small>{tt.loading_modal_tooltip_carguio}</small><b>{formatMinutes(row.avgLoadingTimeMin, tt)}</b></span>
        <span><small>{tt.loading_modal_tooltip_espera}</small><b>{formatMinutes(row.avgCaexWaitTimeMin, tt)}</b></span>
      </div>
      <div className="nmcp-tooltip-total">
        <small>{tt.loading_modal_tooltip_ruta}</small>
        <b>{row.origin ?? tt.loading_modal_origen_sin_dato}{' -> '}{row.destination ?? tt.loading_modal_destino_sin_dato}</b>
      </div>
    </div>
  )
}

export function LoadingEquipmentDetailModal({ item, hourly, anchor, onClose }: Props) {
  const t = useModuleT(cockpitT)
  const paletteKey = useChartPaletteKey()
  const palette = useMemo(() => ({
    cyan: premiumPalette.cyan,
    text: premiumPalette.text,
    muted: premiumPalette.muted,
    grid: premiumPalette.grid,
    mineral: premiumPalette.mineral,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [paletteKey])
  const rows = useMemo(() => {
    let accumulated = 0
    return hourly
      .filter((point) => point.loaderId === item?.id)
      .map((point) => {
        accumulated += point.tonnes
        return {
          hour: point.hour,
          tonnes: point.tonnes,
          cycles: point.cycles,
          accumulated,
          throughputTph: point.tonnes,
          tonnesPerCycle: point.cycles > 0 ? point.tonnes / point.cycles : null,
          origin: point.origin,
          destination: point.destination,
          avgDistanceKm: point.avgDistanceKm,
          avgLoadingTimeMin: point.avgLoadingTimeMin,
          avgLoadingTimeSource: point.avgLoadingTimeSource,
          avgCaexWaitTimeMin: point.avgCaexWaitTimeMin,
          avgCaexWaitTimeSource: point.avgCaexWaitTimeSource,
        }
      })
  }, [hourly, item?.id])

  useEffect(() => {
    if (!item) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [item, onClose])

  if (!item) return null

  const totalHourly = rows.reduce((sum, row) => sum + row.tonnes, 0)
  const totalCycles = rows.reduce((sum, row) => sum + row.cycles, 0)
  const activeHours = rows.filter((row) => row.cycles > 0 || row.tonnes > 0).length
  const avgThroughputTph = activeHours ? totalHourly / activeHours : null
  const peak = rows.reduce<typeof rows[number] | null>(
    (best, row) => {
      if (row.tonnes <= 0) return best
      return !best || row.tonnes > best.tonnes ? row : best
    },
    null,
  )

  const modal = (
    <div
      className={`nmcp-detail-layer ${anchor ? 'is-anchored' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t.loading_modal_aria(item.id)}
      style={getDetailModalStyle(anchor)}
    >
      <button className="nmcp-detail-backdrop" type="button" onClick={onClose} aria-label={t.loading_modal_close_aria} />
      <aside className="nmcp-detail-modal">
        <header className="nmcp-detail-header">
          <div>
            <span className="nmcp-section-kicker">{t.loading_modal_kicker}</span>
            <h2>{item.id}</h2>
            <p>{item.front}{' -> '}{item.destination}</p>
            <p>{t.loading_modal_operador(item.operator ?? t.common_sin_dato)}</p>
          </div>
          <button className="nmcp-icon-button" type="button" onClick={onClose} aria-label={t.loading_modal_close_aria}>
            <X size={17} />
          </button>
        </header>

        <div className="nmcp-detail-kpis">
          <span><small>{t.loading_modal_toneladas_turno}</small><strong>{formatTons(item.tonnes)}</strong></span>
          <span><small>{t.loading_modal_toneladas_horario}</small><strong>{formatTons(totalHourly || item.tonnes)}</strong></span>
          <span><small>{t.loading_modal_ciclos}</small><strong>{item.cycles === null ? formatNumber(totalCycles) : formatNumber(item.cycles)}</strong></span>
          <span><small>{t.loading_modal_rend_carguio}</small><strong>{avgThroughputTph === null ? t.common_sin_dato : `${formatNumber(avgThroughputTph, 1)} t/h`}</strong></span>
          <span><small>{t.loading_modal_eficiencia}</small><strong>{formatPct(item.efficiency)}</strong></span>
        </div>

        <section className="nmcp-detail-chart-card">
          <div className="nmcp-panel-header">
            <div>
              <span className="nmcp-section-kicker">{t.loading_modal_chart_kicker}</span>
              <h3>{rows.length ? t.loading_modal_registros_horarios(rows.length) : t.loading_modal_sin_serie}</h3>
            </div>
            <span className="nmcp-panel-tag">{peak ? t.loading_modal_peak(peak.hour) : 'SIN PUNTO MÁXIMO'}</span>
          </div>
          {rows.length ? (
            <div className="nmcp-detail-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 12, right: 10, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id={`nmcpUcDetail-${item.id}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={palette.cyan} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={palette.cyan} stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={palette.grid} vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: palette.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: palette.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={54} />
                  <Tooltip
                    content={<TooltipContent t={t} />}
                    cursor={{ fill: withAlpha(palette.cyan, '0C') }}
                    wrapperStyle={{ outline: 'none' }}
                  />
                  <Bar
                    dataKey="tonnes"
                    fill={`url(#nmcpUcDetail-${item.id})`}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={34}
                    activeBar={{ fill: palette.cyan, stroke: palette.text, strokeWidth: 1.1 }}
                  >
                    {rows.map((row) => (
                      <Cell
                        key={row.hour}
                        fill={peak?.hour === row.hour ? palette.mineral : `url(#nmcpUcDetail-${item.id})`}
                        stroke={peak?.hour === row.hour ? palette.text : undefined}
                        strokeWidth={peak?.hour === row.hour ? 0.9 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="nmcp-detail-empty">
              {t.loading_modal_no_hourly_data}
            </div>
          )}
        </section>

        <section className="nmcp-detail-table-card">
          <div className="nmcp-detail-table-head is-uc-detail">
            <span>{t.loading_modal_col_hora}</span>
            <span>{t.loading_modal_col_ruta}</span>
            <span>{t.loading_modal_col_ton_h}</span>
            <span>{t.loading_modal_col_distancia}</span>
            <span>{t.loading_modal_col_carguio}</span>
            <span>{t.loading_modal_col_espera}</span>
          </div>
          <div className="nmcp-detail-table-body">
            {rows.map((row) => (
              <div
                key={row.hour}
                className={`nmcp-detail-table-row is-uc-detail ${peak?.hour === row.hour ? 'is-best-hour' : ''}`}
              >
                <span>
                  {row.hour}
                  {peak?.hour === row.hour && <em>{t.loading_modal_mejor_hora}</em>}
                </span>
                <strong>{row.origin ?? t.loading_modal_origen_sin_dato}{' -> '}{row.destination ?? t.loading_modal_destino_sin_dato}</strong>
                <strong>{formatNumber(row.throughputTph, 1)} t/h</strong>
                <span>{formatDistance(row.avgDistanceKm, t)}</span>
                <span>{formatMinutes(row.avgLoadingTimeMin, t)}</span>
                <span>{formatMinutes(row.avgCaexWaitTimeMin, t)}</span>
              </div>
            ))}
            {!rows.length && <div className="nmcp-detail-empty">{t.loading_modal_sin_detalle(item.id)}</div>}
          </div>
        </section>
      </aside>
    </div>
  )

  return createPortal(modal, document.body)
}
