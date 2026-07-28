import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { LoadingUnit } from '../../lib/api'
import { useModuleT } from '../../i18n/useModuleT'
import { chartsT } from '../../i18n/modules/charts'

export function LoadingUnitPerformanceChart({ data }: { data: LoadingUnit[] }) {
  const t = useModuleT(chartsT)
  const chartData = data.map((item) => ({
    unidad: item.carguio_id,
    toneladas: item.toneladas,
    tph: item.rendimiento_tph,
  }))

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="unidad" stroke="rgba(255,255,255,0.42)" tickLine={false} axisLine={false} />
          <YAxis stroke="rgba(255,255,255,0.42)" tickLine={false} axisLine={false} width={72} />
          <Tooltip
            contentStyle={{ background: 'rgba(13,18,29,0.96)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}
            formatter={(value: number, name: string) => name === 'tph' ? `${Number(value).toLocaleString('es-CL')} tph` : `${Number(value).toLocaleString('es-CL')} t`}
          />
          <Bar dataKey="toneladas" name={t.tonnageSeries} fill="#75D6A0" radius={[5, 5, 0, 0]} />
          <Bar dataKey="tph" name="tph" fill="#7AA7C7" radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

