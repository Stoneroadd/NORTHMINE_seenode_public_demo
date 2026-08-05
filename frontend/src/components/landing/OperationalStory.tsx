import { ArrowRight, CircleGauge, Route, ShieldAlert, Wrench } from 'lucide-react'
import { useModuleT } from '../../i18n/useModuleT'
import { publicPagesT } from '../../i18n/modules/publicPages'

const signalIcons = [CircleGauge, Route, Wrench, ShieldAlert]

export function OperationalStory() {
  const t = useModuleT(publicPagesT)
  return (
    <section id="flujo" className="nm-public-band nm-operational-problem" aria-labelledby="problem-title">
      <div className="nm-public-shell">
        <div className="nm-public-section-heading nm-public-section-heading--plain">
          <h2 id="problem-title">{t.story.title}</h2>
          <p>
            {t.story.body}
          </p>
        </div>

        <div className="nm-signal-flow" aria-label={t.story.aria}>
          <div className="nm-signal-flow__sources">
            {t.story.signals.map((signal, index) => {
              const Icon = signalIcons[index] ?? CircleGauge
              return (
                <article key={signal.title}>
                  <Icon size={19} aria-hidden="true" />
                  <div>
                    <h3>{signal.title}</h3>
                    <p>{signal.copy}</p>
                  </div>
                </article>
              )
            })}
          </div>
          <ArrowRight className="nm-signal-flow__arrow" size={28} aria-hidden="true" />
          <div className="nm-signal-flow__result">
            <span>{t.story.resultLabel}</span>
            <strong>{t.story.resultTitle}</strong>
            <p>{t.story.resultCopy}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
