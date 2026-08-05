import { useSectionReveal } from '../../../lib/animation/effects'
import { useModuleT } from '../../../i18n/useModuleT'
import { landingT, landingFallback } from '../../../i18n/modules/landing'

export function FMSComplement() {
  const t = useModuleT(landingT)
  const fms = landingFallback(t, 'fmsComplement')
  const scope = useSectionReveal<HTMLElement>({
    targets: '[data-fms-reveal]',
    distance: 18,
    stagger: 0.08,
    duration: 0.55,
  })

  return (
    <section ref={scope} className="ns-fms" aria-labelledby="ns-fms-title">
      <div className="ns-saas__shell ns-fms__inner">
        <p className="mono-label" data-fms-reveal>
          {fms.kicker}
        </p>
        <h2 id="ns-fms-title" className="ns-fms__title" data-fms-reveal>
          {fms.title}
        </h2>
        <p className="ns-fms__body" data-fms-reveal>
          {fms.body}
        </p>
        <p className="ns-fms__highlight" data-fms-reveal>
          {fms.highlight}
        </p>
      </div>
    </section>
  )
}
