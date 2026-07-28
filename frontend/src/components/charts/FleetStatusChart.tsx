import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { FleetStatus } from '../../lib/api'
import { useModuleT } from '../../i18n/useModuleT'
import { chartsT } from '../../i18n/modules/charts'

const colors: Record<string, string> = {
  ACTIVO: '#75D6A0',
  DEMORA: '#FFB84D',
  'SIN ACTIVIDAD': '#7AA7C7',
  MANTENCION: '#EF6F6C',
}

export function FleetStatusChart({ data }: { data: FleetStatus }) {
  const t = useModuleT(chartsT)
  const chartData = [
    { code: 'ACTIVO', name: t.statusLabel('ACTIVO'), value: data.equipos_activos },
    { code: 'DEMORA', name: t.statusLabel('DEMORA'), value: data.equipos_en_demora },
    { code: 'SIN ACTIVIDAD', name: t.statusLabel('SIN ACTIVIDAD'), value: data.equipos_sin_actividad },
    { code: 'MANTENCION', name: t.statusLabel('MANTENCION'), value: data.equipos_mantencion },
  ].filter((item) => item.value > 0)

  return (
    <div className="fleet-chart">
      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={92} paddingAngle={4}>
            {chartData.map((entry) => <Cell key={entry.code} fill={colors[entry.code]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="fleet-legend">
        {chartData.map((item) => (
          <span key={item.code}><i style={{ background: colors[item.code] }} />{item.name}: {item.value}</span>
        ))}
      </div>
    </div>
  )
}

