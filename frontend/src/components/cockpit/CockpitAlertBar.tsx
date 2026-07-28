import { AlertTriangle, Clock3 } from 'lucide-react'
import type { CockpitViewModel } from './cockpitModel'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT } from '../../i18n/modules/cockpit'

export function CockpitAlertBar({ data }: { data: CockpitViewModel }) {
  const t = useModuleT(cockpitT)
  const primary = data.warnings[0] || data.events[0] || t.alert_bar_empty
  const count = data.warnings.length + data.events.length

  return (
    <section className={`nmcp-alert-bar ${data.warnings.length ? 'has-warning' : ''}`}>
      <div>
        <AlertTriangle size={16} />
        <strong>{count}</strong>
        <span>{t.alert_bar_label}</span>
      </div>
      <p>{primary}</p>
      <span><Clock3 size={14} /> {data.lastRecordLabel}</span>
      <button type="button">{t.alert_bar_ver_todas}</button>
    </section>
  )
}
