import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { HourlyProduction } from '../../lib/api'
import { useModuleT } from '../../i18n/useModuleT'
import { chartsT } from '../../i18n/modules/charts'
import { formatHourLabel } from '../../lib/time/operationalHour'

const tooltipStyle = {
  background: 'rgba(13,18,29,0.96)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#f4f7fb',
}

export function HourlyProductionChart({ data }: { data: HourlyProduction[] }) {
  const t = useModuleT(chartsT)
  const chartData = data.map((item) => ({
    hora: formatHourLabel(item.hora),
    toneladas: item.toneladas,
    acumulado: item.acumulado ?? item.toneladas,
  }))

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="hora" stroke="rgba(255,255,255,0.42)" tickLine={false} axisLine={false} />
          <YAxis stroke="rgba(255,255,255,0.42)" tickLine={false} axisLine={false} width={70} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `${Number(value).toLocaleString('es-CL')} t`} />
          <Area dataKey="toneladas" name={t.tonsPerHourSeries} type="monotone" stroke="#75D6A0" fill="rgba(117,214,160,0.16)" strokeWidth={2} />
          <Line dataKey="acumulado" name={t.accumulatedSeries} stroke="#7AA7C7" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

