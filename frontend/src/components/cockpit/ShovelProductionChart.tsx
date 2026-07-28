import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CockpitEquipmentRow, CockpitShovelHourlyPoint } from './cockpitModel'
import { formatNumber, formatTons } from './cockpitModel'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT, type CockpitT } from '../../i18n/modules/cockpit'
import { premiumPalette, useChartPaletteKey } from '../charts/premium/chartTheme'

// premiumPalette siempre resuelve a hex de 6 digitos (definidos asi en las 6
// apariencias de themes.css), por eso se puede sumar un sufijo de alpha.
function withAlpha(hex: string, alphaHex: string) {
  return hex.startsWith('#') ? `${hex}${alphaHex}` : hex
}

function TooltipContent({ active, payload, label, t }: any) {
  if (!active || !payload?.length) return null
  const visible = payload.filter((item: any) => item.value > 0)
  const total = visible.reduce((sum: number, item: any) => sum + Number(item.value || 0), 0)
  const tt = t as CockpitT

  return (
    <div className="nmcp-chart-tooltip is-mixed">
      <div className="nmcp-tooltip-head">
        <span>{tt.shovel_tooltip_uc}</span>
        <strong>{label}</strong>
      </div>
      <div className="nmcp-tooltip-total">
        <small>{tt.shovel_tooltip_total}</small>
        <b>{formatTons(total)}</b>
      </div>
      <div className="nmcp-tooltip-series">
        {visible.slice(0, 5).map((item: any) => (
          <span key={item.dataKey} className="nmcp-tooltip-row">
            <i aria-hidden="true" style={{ background: item.color }} />
            <small>{item.dataKey}</small>
            <b>{formatTons(item.value)}</b>
          </span>
        ))}
      </div>
    </div>
  )
}

export function ShovelProductionChart({
  rows,
  hourly,
}: {
  rows: CockpitEquipmentRow[]
  hourly: CockpitShovelHourlyPoint[]
}) {
  const t = useModuleT(cockpitT)
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const paletteKey = useChartPaletteKey()
  const palette = useMemo(() => [
    premiumPalette.cyan,
    premiumPalette.mineral,
    premiumPalette.amber,
    premiumPalette.red,
    premiumPalette.steel,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [paletteKey])
  const chartMuted = useMemo(() => premiumPalette.muted, [paletteKey])
  const chartGrid = useMemo(() => premiumPalette.grid, [paletteKey])
  const chartText = useMemo(() => premiumPalette.text, [paletteKey])
  const paletteById = useMemo(
    () => Object.fromEntries(rows.map((row, index) => [row.id, palette[index % palette.length]])),
    [rows, palette],
  )
  const hourlyData = useMemo(() => {
    const byHour = new Map<string, Record<string, number | string>>()
    for (const point of hourly) {
      const row = byHour.get(point.hour) ?? { hour: point.hour }
      row[point.loaderId] = point.tonnes
      byHour.set(point.hour, row)
    }
    return [...byHour.values()]
  }, [hourly])
  const totalData = useMemo(
    () => rows.map((row) => ({ hour: row.id, [row.id]: row.tonnes ?? 0 })),
    [rows],
  )
  const data = hourlyData.length ? hourlyData : totalData
  const totalTonnes = rows.reduce((sum, row) => sum + (row.tonnes ?? 0), 0)
  const leader = rows.reduce<CockpitEquipmentRow | null>((best, row) => (
    !best || (row.tonnes ?? 0) > (best.tonnes ?? 0) ? row : best
  ), null)
  const leaderShare = totalTonnes > 0 && leader?.tonnes ? leader.tonnes / totalTonnes * 100 : null

  const toggle = (id: string) => {
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="nmcp-panel nmcp-chart-panel">
      <div className="nmcp-panel-header">
        <div>
          <span className="nmcp-section-kicker">{t.shovel_kicker}</span>
          <h2>{t.shovel_title}</h2>
        </div>
        <span className="nmcp-panel-tag">{hourlyData.length ? t.shovel_tag_hora_pala : t.shovel_tag_palas(rows.length)}</span>
      </div>

      <div className="nmcp-shovel-summary">
        <span>
          <small>{t.shovel_total_uc}</small>
          <strong>{formatTons(totalTonnes)}</strong>
        </span>
        <span>
          <small>{t.shovel_uc_lider}</small>
          <strong>{leader?.id ?? t.shovel_sin_dato}</strong>
          <em>{leaderShare === null ? t.shovel_sin_participacion : t.shovel_pct_carguio(formatNumber(leaderShare, 1))}</em>
        </span>
        <span>
          <small>{t.shovel_equipos}</small>
          <strong>{formatNumber(rows.length)}</strong>
          <em>{hourlyData.length ? t.shovel_con_apertura : t.shovel_total_turno}</em>
        </span>
      </div>

      <div className="nmcp-shovel-legend" aria-label={t.shovel_legend_aria}>
        {rows.map((row, index) => (
          <button
            key={row.id}
            type="button"
            className={hidden.has(row.id) ? 'is-muted' : ''}
            onClick={() => toggle(row.id)}
          >
            <i style={{ background: palette[index % palette.length] }} />
            {row.id}
          </button>
        ))}
      </div>

      <div className="nmcp-shovel-chart" role="img" aria-label={t.shovel_chart_aria}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={chartGrid} vertical={false} />
            <XAxis dataKey="hour" tick={{ fill: chartMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: chartMuted, fontSize: 11 }} axisLine={false} tickLine={false} width={54} />
            <Tooltip
              content={<TooltipContent t={t} />}
              cursor={{ fill: withAlpha(premiumPalette.amber, '0A') }}
              wrapperStyle={{ outline: 'none' }}
            />
            {rows.filter((row) => !hidden.has(row.id)).map((row) => (
              <Bar
                key={row.id}
                dataKey={row.id}
                stackId="shovels"
                fill={paletteById[row.id]}
                radius={[5, 5, 0, 0]}
                maxBarSize={42}
                activeBar={{ stroke: chartText, strokeWidth: 1.1 }}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
