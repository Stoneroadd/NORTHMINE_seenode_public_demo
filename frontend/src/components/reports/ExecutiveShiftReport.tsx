import { CheckCircle2 } from 'lucide-react'
import type { ShiftReport } from '../../lib/api'
import { AlertSeverityBadge, normalizeSeverity } from '../alerts/AlertSeverityBadge'
import { PremiumGaugeChart } from '../charts/premium'
import { MachineHeroCard } from '../equipment/MachineHeroCard'
import type { ReportsT } from '../../i18n/modules/reports'

function tons(value: number) {
  return `${Math.round(value).toLocaleString('es-CL')} t`
}

type ReportMachine = NonNullable<ShiftReport['top_carguio']> | NonNullable<ShiftReport['top_caex']>

function reportMachineId(item: ReportMachine) {
  return 'caex_id' in item ? item.caex_id : item.carguio_id
}

interface Props {
  report: ShiftReport
  onSelectEquipment?: (equipmentId: string) => void
  t: ReportsT
}

export function ExecutiveShiftReport({ report, onSelectEquipment, t }: Props) {
  return (
    <section className="report-card">
      <div className="report-head">
        <div>
          <span className="module-eyebrow">{t.eyebrow_reporte_ejecutivo}</span>
          <h2>{t.turno_fecha(report.turno, report.fecha)}</h2>
        </div>
        <strong>{report.cumplimiento_pct.toFixed(1)}%</strong>
      </div>
      <p className="report-summary">{report.resumen_texto}</p>

      <div className="report-visual-grid">
        <PremiumGaugeChart
          value={report.cumplimiento_pct}
          current={report.toneladas}
          meta={report.meta}
          breach={report.brecha}
          height={260}
        />
        {report.top_carguio && (
          <MachineHeroCard
            item={report.top_carguio}
            title={t.equipo_lider_carguio_titulo}
            subtitle={t.equipo_lider_carguio_subtitulo}
            onClick={() => onSelectEquipment?.(reportMachineId(report.top_carguio!))}
          />
        )}
        {!report.top_carguio && report.top_caex && (
          <MachineHeroCard
            item={report.top_caex}
            title={t.caex_destacado_titulo}
            subtitle={t.caex_destacado_subtitulo}
            onClick={() => onSelectEquipment?.(reportMachineId(report.top_caex!))}
          />
        )}
      </div>

      <div className="report-kpis">
        <span><small>{t.kpi_toneladas}</small><strong>{tons(report.toneladas)}</strong></span>
        <span><small>{t.kpi_meta}</small><strong>{tons(report.meta)}</strong></span>
        <span><small>{t.kpi_brecha}</small><strong>{tons(report.brecha)}</strong></span>
        <span><small>{t.kpi_top_carguio}</small><strong>{report.top_carguio?.carguio_id ?? '-'}</strong></span>
      </div>

      <div className="report-section">
        <h3>{t.principales_alertas}</h3>
        {report.principales_alertas.map((alert) => (
          <div className="report-alert" key={alert.id}>
            <span>{alert.titulo ?? alert.title}</span>
            <AlertSeverityBadge severity={normalizeSeverity(alert)} />
          </div>
        ))}
      </div>

      <div className="report-section">
        <h3>{t.recomendaciones}</h3>
        <ul className="recommendation-list">
          {report.recomendaciones.map((item) => (
            <li key={item}><CheckCircle2 size={15} />{item}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
