import type { DailyProduction, HourlyShift } from '../../lib/api'
import { PremiumBarChart, PremiumLineAreaChart } from './premium'
import { useModuleT } from '../../i18n/useModuleT'
import { chartsT } from '../../i18n/modules/charts'
import { formatHourLabel } from '../../lib/time/operationalHour'

function shortDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

interface Props {
  daily: DailyProduction[]
  hourly: HourlyShift[]
  planAvailable?: boolean
}

export function ProductionTrendChart({ daily, hourly, planAvailable = true }: Props) {
  const t = useModuleT(chartsT)
  const dailyData = daily.slice(-14).map((item) => ({
    fecha: shortDate(item.fecha),
    real: item.real,
    plan: planAvailable ? item.plan ?? 0 : 0,
  }))

  const hourlyData = hourly.map((item) => ({
    label: formatHourLabel(item.hora),
    toneladas: item.tonelaje,
  }))

  return (
    <section className="chart-grid production-trend-grid">
      <div className="plan-board-card production-trend-card production-trend-card--plan">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">{t.cumulativeProductionKicker}</span>
            <h2>{planAvailable ? t.realVsPlanTitle : t.realObservedTitle}</h2>
          </div>
          <span className="panel-tag">{planAvailable ? t.last14DaysTag : t.noPlanConfiguredTag}</span>
        </div>
        <PremiumBarChart
          data={dailyData}
          xKey="fecha"
          series={planAvailable
            ? [
                { key: 'plan', name: t.planSeries },
                { key: 'real', name: t.realSeries },
              ]
            : [
                { key: 'real', name: t.realObservedSeries },
              ]}
        />
      </div>

      <div className="plan-board-card production-trend-card production-trend-card--live">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">{t.currentShiftKicker}</span>
            <h2>{t.hourlyProductionTitle}</h2>
          </div>
          <span className="panel-tag">{t.liveTag}</span>
        </div>
        <PremiumLineAreaChart
          data={hourlyData}
          showAccumulated={false}
          showMeta={false}
        />
      </div>
    </section>
  )
}
