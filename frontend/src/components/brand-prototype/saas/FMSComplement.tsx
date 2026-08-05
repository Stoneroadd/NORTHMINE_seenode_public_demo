import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '../../../lib/animation/gsap'
import { useModuleT } from '../../../i18n/useModuleT'
import { landingT, landingFallback } from '../../../i18n/modules/landing'

export function FMSComplement() {
  const t = useModuleT(landingT)
  const fms = landingFallback(t, 'fmsComplement')
  const scope = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const lead = scope.current?.querySelectorAll<HTMLElement>('[data-fms-reveal]')
      const highlight = scope.current?.querySelector<HTMLElement>('[data-fms-highlight]')
      if (!lead || lead.length === 0) return

      const ruleColor = 'rgba(255, 255, 255, 0.14)'

      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(lead, { opacity: 1, y: 0 })
        if (highlight) gsap.set(highlight, { borderTopColor: ruleColor, borderBottomColor: ruleColor })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: scope.current, start: 'top 80%', once: true },
          defaults: { ease: 'power2.out' },
        })

        gsap.set(lead, { opacity: 0, y: 18 })
        tl.to(lead, { opacity: 1, y: 0, duration: 0.55, stagger: 0.08 }, 0)

        // The framing rule draws in only after the highlight sentence has
        // landed, so it reads as underlining a claim already made, not
        // decorating an empty box.
        if (highlight) {
          gsap.set(highlight, { borderTopColor: 'transparent', borderBottomColor: 'transparent' })
          tl.to(highlight, { borderTopColor: ruleColor, borderBottomColor: ruleColor, duration: 0.5 }, '-=0.15')
        }
      })
    },
    { scope },
  )

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
        <p className="ns-fms__highlight" data-fms-reveal data-fms-highlight>
          {fms.highlight}
        </p>
      </div>
    </section>
  )
}
