import { Moon, SunMedium } from 'lucide-react'
import type { CockpitViewModel } from './cockpitModel'
import { formatPct, formatTons } from './cockpitModel'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT } from '../../i18n/modules/cockpit'

export function ShiftSummary({ data }: { data: CockpitViewModel }) {
  const t = useModuleT(cockpitT)
  const isNight = data.shiftLabel.toUpperCase().includes('NOCHE')
  const Icon = isNight ? Moon : SunMedium
  const progress = data.targetTonnes > 0 ? Math.min(100, (data.actualTonnes / data.targetTonnes) * 100) : null

  return (
    <section className="nmcp-shift-card">
      <div className="nmcp-shift-main">
        <span className="nmcp-shift-icon" aria-hidden="true"><Icon size={24} /></span>
        <div>
          <span className="nmcp-section-kicker">{t.shift_summary_kicker}</span>
          <h2>{data.shiftLabel}</h2>
          <p>{data.shiftDate} / {data.shiftPeriod}</p>
        </div>
      </div>

      <div className="nmcp-shift-metrics">
        <div>
          <span>{t.shift_summary_registro}</span>
          <strong>{data.lastRecordLabel}</strong>
        </div>
        <div>
          <span>{t.shift_summary_produccion}</span>
          <strong>{formatTons(data.actualTonnes)}</strong>
        </div>
        <div>
          <span>{t.shift_summary_meta}</span>
          <strong>{data.targetTonnes > 0 ? formatTons(data.targetTonnes) : t.shift_summary_sin_meta}</strong>
        </div>
        <div>
          <span>{t.shift_summary_riesgo}</span>
          <strong>{formatPct(data.riskPct)}</strong>
        </div>
      </div>

      {progress !== null && (
        <div className="nmcp-shift-progress" aria-label={t.shift_summary_progress_aria(Math.round(progress))}>
          <i style={{ width: `${progress}%` }} />
        </div>
      )}
    </section>
  )
}
