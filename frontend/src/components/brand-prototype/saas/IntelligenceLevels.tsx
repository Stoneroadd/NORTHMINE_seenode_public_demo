import { useSectionReveal } from '../../../lib/animation/effects'
import { useModuleT } from '../../../i18n/useModuleT'
import { landingT, landingFallback } from '../../../i18n/modules/landing'

export function IntelligenceLevels() {
  const t = useModuleT(landingT)
  const levels = landingFallback(t, 'intelligenceLevels')
  const scope = useSectionReveal<HTMLElement>({
    targets: '[data-levels-reveal]',
    distance: 18,
    stagger: 0.08,
    duration: 0.55,
  })

  return (
    <section ref={scope} className="ns-levels" aria-labelledby="ns-levels-title">
      <div className="ns-saas__shell">
        <div className="ns-levels__head" data-levels-reveal>
          <p className="mono-label">{levels.kicker}</p>
          <h2 id="ns-levels-title">{levels.title}</h2>
        </div>

        <ol className="ns-levels__grid">
          {levels.levels.map((level, index) => (
            <li key={level.name} className="ns-levels__card" data-levels-reveal>
              <span className="mono-label ns-levels__index">{String(index + 1).padStart(2, '0')}</span>
              <h3>{level.name}</h3>
              <ul>
                {level.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <p className="ns-levels__closing" data-levels-reveal>
          {levels.closing}
        </p>
      </div>
    </section>
  )
}
