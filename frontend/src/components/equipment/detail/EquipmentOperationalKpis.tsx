import { Activity, AlertTriangle, Clock3, Gauge, RadioTower, Timer, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { EquipmentDetail } from '../../../types/equipment'
import { InteractiveMetricCard } from '../../ui/InteractiveMetricCard'
import { CommandCard } from '../../ui/CommandCard'
import { StatusPill } from '../../ui/StatusPill'
import { useModuleT } from '../../../i18n/useModuleT'
import { equipmentT } from '../../../i18n/modules/equipment'

interface Props {
  detail: EquipmentDetail
}

function UnavailableMetricCard({ title, subtitle, icon: Icon, noDataLabel }: { title: string; subtitle: string; icon: LucideIcon; noDataLabel: string }) {
  return (
    <CommandCard state="normal">
      <div className="interactive-metric-top">
        <span className="interactive-metric-icon"><Icon size={18} /></span>
        <StatusPill tone="info">{noDataLabel}</StatusPill>
      </div>
      <span className="interactive-metric-title">{title}</span>
      <strong className="interactive-metric-value">—</strong>
      <span className="interactive-metric-subtitle">{subtitle}</span>
    </CommandCard>
  )
}

export function EquipmentOperationalKpis({ detail }: Props) {
  const t = useModuleT(equipmentT)
  return (
    <section className="equipment-detail-kpis">
      <InteractiveMetricCard title={t.tonsShift} value={detail.toneladas_turno} suffix=" t" subtitle={t.operationalContribution} delta={detail.shift} tone="success" icon={TrendingUp} />
      <InteractiveMetricCard title={t.cyclesShift} value={detail.ciclos_turno} subtitle={t.realCycles} delta={t.cycles} tone="info" icon={Activity} />
      <InteractiveMetricCard title={t.performance} value={detail.rendimiento_tph} suffix=" tph" subtitle={t.tonsPerHour} delta="tph" tone="success" icon={Gauge} />
      {detail.disponibilidad_pct != null ? (
        <InteractiveMetricCard title={t.availability} value={detail.disponibilidad_pct} suffix="%" subtitle={t.mechanicalState} delta="disp." tone={detail.disponibilidad_pct < 85 ? 'warning' : 'success'} icon={RadioTower} />
      ) : (
        <UnavailableMetricCard title={t.availability} subtitle={t.noDataAvailable} icon={RadioTower} noDataLabel={t.noData} />
      )}
      {detail.utilizacion_pct != null ? (
        <InteractiveMetricCard title={t.utilization} value={detail.utilizacion_pct} suffix="%" subtitle={t.shiftUsage} delta="util." tone={detail.utilizacion_pct < 70 ? 'warning' : 'success'} icon={Timer} />
      ) : (
        <UnavailableMetricCard title={t.utilization} subtitle={t.noDataAvailable} icon={Timer} noDataLabel={t.noData} />
      )}
      <InteractiveMetricCard title={t.delays} value={detail.delay_minutes} suffix=" min" subtitle={t.currentStateAccumulated} delta="delay" tone={detail.delay_minutes > 45 ? 'critical' : detail.delay_minutes > 20 ? 'warning' : 'success'} icon={Clock3} />
      <InteractiveMetricCard title={t.alerts} value={detail.alert_count} subtitle={t.associated} delta="riesgo" tone={detail.alert_count > 1 ? 'critical' : detail.alert_count > 0 ? 'warning' : 'success'} icon={AlertTriangle} />
    </section>
  )
}
