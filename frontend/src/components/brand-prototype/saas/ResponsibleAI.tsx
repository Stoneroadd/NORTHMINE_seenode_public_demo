import { useSectionReveal } from '../../../lib/animation/effects'
import { useModuleT } from '../../../i18n/useModuleT'
import { landingT, landingFallback } from '../../../i18n/modules/landing'

export function ResponsibleAI() {
  const t = useModuleT(landingT)
  const responsibleAI = landingFallback(t, 'responsibleAI')
  // Calmer than the default: less travel, slower settle, points arrive
  // almost together — this section states policy boundaries, it shouldn't
  // feel energetic.
  const scope = useSectionReveal<HTMLElement>({
    targets: '[data-rai-reveal]',
    distance: 10,
    stagger: 0.05,
    duration: 0.75,
  })

  return (
    <section ref={scope} className="ns-rai" aria-labelledby="ns-rai-title">
      <div className="ns-saas__shell ns-rai__inner">
        <div className="ns-rai__head" data-rai-reveal>
          <p className="mono-label">{responsibleAI.kicker}</p>
          <h2 id="ns-rai-title">{responsibleAI.title}</h2>
        </div>

        <dl className="ns-rai__grid">
          {responsibleAI.points.map((point) => (
            <div key={point.label} data-rai-reveal>
              <dt>{point.label}</dt>
              <dd>{point.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
