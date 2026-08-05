import { useSectionReveal } from '../../../lib/animation/effects'
import { useModuleT } from '../../../i18n/useModuleT'
import { landingT, landingFallback } from '../../../i18n/modules/landing'

export function FMSComparison() {
  const t = useModuleT(landingT)
  const comparison = landingFallback(t, 'comparison')
  const scope = useSectionReveal<HTMLElement>({
    targets: '[data-comparison-reveal]',
    distance: 18,
    stagger: 0.06,
    duration: 0.55,
  })

  return (
    <section ref={scope} className="ns-comparison" aria-labelledby="ns-comparison-title">
      <div className="ns-saas__shell">
        <div className="ns-comparison__head" data-comparison-reveal>
          <p className="mono-label">{comparison.kicker}</p>
          <h2 id="ns-comparison-title">{comparison.title}</h2>
        </div>

        <div className="ns-comparison__grid">
          <div className="ns-comparison__column" data-comparison-reveal>
            <p className="ns-comparison__column-label mono-label">{comparison.fmsLabel}</p>
            <ul>
              {comparison.fmsItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="ns-comparison__column ns-comparison__column--accent" data-comparison-reveal>
            <p className="ns-comparison__column-label mono-label">{comparison.northmineLabel}</p>
            <ul>
              {comparison.northmineItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="ns-comparison__closing" data-comparison-reveal>
          {comparison.closing}
        </p>
      </div>
    </section>
  )
}
