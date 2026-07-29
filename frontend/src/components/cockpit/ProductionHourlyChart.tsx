import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useMemo } from 'react'
import type { CockpitHourlyPoint } from './cockpitModel'
import { formatTons } from './cockpitModel'
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
  const tonnes = payload.find((item: any) => item.dataKey === 'tonnes')?.value
  const accumulated = payload.find((item: any) => item.dataKey === 'accumulated')?.value
  const tt = t as CockpitT

  return (
    <div className="nmcp-chart-tooltip is-cyan">
      <div className="nmcp-tooltip-head">
        <span>{tt.prod_chart_tooltip_hora}</span>
        <strong>{label}</strong>
      </div>
      <div className="nmcp-tooltip-grid">
        <span><small>{tt.prod_chart_tooltip_toneladas}</small><b>{formatTons(tonnes)}</b></span>
        <span><small>{tt.prod_chart_tooltip_acumulado}</small><b>{formatTons(accumulated)}</b></span>
      </div>
    </div>
  )
}

export function ProductionHourlyChart({ data }: { data: CockpitHourlyPoint[] }) {
  const t = useModuleT(cockpitT)
  const paletteKey = useChartPaletteKey()
  const palette = useMemo(() => ({
    cyan: premiumPalette.cyan,
    amber: premiumPalette.amber,
    muted: premiumPalette.muted,
    grid: premiumPalette.grid,
    text: premiumPalette.text,
    panel: premiumPalette.panel,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [paletteKey])
  return (
    <section className="nmcp-panel nmcp-chart-panel">
      <div className="nmcp-panel-header">
        <div>
          <span className="nmcp-section-kicker">{t.prod_chart_kicker}</span>
          <h2>{t.prod_chart_title}</h2>
        </div>
        <span className="nmcp-panel-tag">{t.prod_chart_tag}</span>
      </div>

      <div className="nmcp-hourly-chart" role="img" aria-label={t.prod_chart_aria}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="nmcpBarCyan" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={palette.cyan} stopOpacity={0.95} />
                <stop offset="100%" stopColor={palette.cyan} stopOpacity={0.18} />
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
              fill="url(#nmcpBarCyan)"
              radius={[5, 5, 0, 0]}
              maxBarSize={34}
              activeBar={{ fill: palette.cyan, stroke: palette.text, strokeWidth: 1.1 }}
            />
            <Line
              type="monotone"
              dataKey="accumulated"
              stroke={palette.amber}
              strokeWidth={2.4}
              dot={false}
              activeDot={{ r: 4, fill: palette.amber, stroke: palette.panel, strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
