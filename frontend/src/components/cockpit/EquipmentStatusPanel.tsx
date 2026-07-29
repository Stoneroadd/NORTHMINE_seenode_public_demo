import { AlertTriangle, CircleCheck, CircleDot, RadioTower } from 'lucide-react'
import type { CockpitEquipmentRow } from './cockpitModel'
import { formatNumber, formatTons } from './cockpitModel'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT } from '../../i18n/modules/cockpit'

function counts(rows: CockpitEquipmentRow[]) {
  return {
    good: rows.filter((row) => row.tone === 'good').length,
    warn: rows.filter((row) => row.tone === 'warn' || row.tone === 'neutral').length,
    bad: rows.filter((row) => row.tone === 'bad').length,
  }
}

export function EquipmentStatusPanel({
  title,
  rows,
  emptyLabel,
}: {
  title: string
  rows: CockpitEquipmentRow[]
  emptyLabel: string
}) {
  const t = useModuleT(cockpitT)
  const summary = counts(rows)

  return (
    <section className="nmcp-panel nmcp-equipment-panel">
      <div className="nmcp-panel-header">
        <div>
          <span className="nmcp-section-kicker">{t.equip_status_kicker}</span>
          <h2>{title}</h2>
        </div>
        <button className="nmcp-link-button" type="button">{t.equip_status_ver_todos}</button>
      </div>

      <div className="nmcp-status-cards">
        <span className="is-good"><CircleCheck size={14} /> {t.equip_status_operativos} <strong>{summary.good}</strong></span>
        <span className="is-warn"><CircleDot size={14} /> {t.equip_status_sin_actividad} <strong>{summary.warn}</strong></span>
        <span className="is-bad"><AlertTriangle size={14} /> {t.equip_status_posible_averia} <strong>{summary.bad}</strong></span>
      </div>

      <div className="nmcp-equipment-list">
        {rows.length ? rows.map((row) => (
          <article key={row.id} className={`nmcp-equipment-row is-${row.tone}`}>
            <span className="nmcp-state-dot" />
            <div>
              <strong>{row.id}</strong>
              <small>{row.status}</small>
            </div>
            <span>{row.cycles === null ? t.equip_status_ciclos_sd : t.equip_status_ciclos(formatNumber(row.cycles))}</span>
            <span>{row.tonnes === null ? t.equip_status_toneladas_sd : formatTons(row.tonnes)}</span>
            <em>{row.ageLabel}</em>
          </article>
        )) : (
          <div className="nmcp-empty-inline">
            <RadioTower size={18} />
            <span>{emptyLabel}</span>
          </div>
        )}
      </div>
    </section>
  )
}
