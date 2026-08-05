import {
  Activity,
  ArrowDownRight,
  Crosshair,
  Gauge,
  GitCompareArrows,
  ShieldAlert,
} from 'lucide-react'
import { useModuleT } from '../../i18n/useModuleT'
import { publicPagesT } from '../../i18n/modules/publicPages'

const stageIcons = [Gauge, Activity, Crosshair, ShieldAlert, ArrowDownRight, GitCompareArrows]

export function CapabilitySection() {
  const t = useModuleT(publicPagesT)
  return (
    <section id="capacidades" className="nm-public-band nm-capabilities" aria-labelledby="capabilities-title">
      <div className="nm-public-shell nm-capabilities__layout">
        <div className="nm-public-section-heading nm-public-section-heading--sticky">
          <p className="nm-public-eyebrow">{t.capabilities.eyebrow}</p>
          <h2 id="capabilities-title">{t.capabilities.title}</h2>
          <p>
            {t.capabilities.body}
          </p>
        </div>

        <ol className="nm-capability-sequence">
          {t.capabilities.stages.map((stage, index) => {
            const Icon = stageIcons[index] ?? Gauge
            return (
              <li key={stage.title}>
                <span className="nm-capability-sequence__number">{String(index + 1).padStart(2, '0')}</span>
                <Icon size={21} aria-hidden="true" />
                <div>
                  <h3>{stage.title}</h3>
                  <p>{stage.copy}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
