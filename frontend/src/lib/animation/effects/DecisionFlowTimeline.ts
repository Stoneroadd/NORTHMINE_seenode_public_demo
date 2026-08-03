import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '../gsap'

/**
 * Reveals each step of the decision flow in order, growing the connecting
 * line into the next step right after its marker appears — so the line
 * reads as "drawn" by the sequence rather than just present.
 */
export function useDecisionFlowTimeline<T extends HTMLElement>() {
  const scope = useRef<T>(null)

  useGSAP(
    () => {
      const steps = scope.current?.querySelectorAll<HTMLElement>('[data-flow-step]')
      if (!steps || steps.length === 0) return

      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: reduce)', () => {
        steps.forEach((step) => {
          gsap.set(step, { opacity: 1 })
          const line = step.querySelector('[data-flow-line]')
          if (line) gsap.set(line, { scaleY: 1 })
        })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: scope.current, start: 'top 78%', once: true },
          defaults: { ease: 'power2.out' },
        })

        // Each step gets a fixed absolute start offset (not chained '-='
        // math off the previous step's duration) so the total stays short
        // and predictable regardless of how many steps there are.
        const stepStagger = 0.22
        steps.forEach((step, index) => {
          const marker = step.querySelector('[data-flow-marker]')
          const copy = step.querySelector('[data-flow-copy]')
          const line = step.querySelector('[data-flow-line]')
          const stepStart = index * stepStagger

          gsap.set(step, { opacity: 0 })
          tl.to(step, { opacity: 1, duration: 0.25 }, stepStart)
          if (marker) {
            gsap.set(marker, { scale: 0.6, opacity: 0 })
            tl.to(marker, { scale: 1, opacity: 1, duration: 0.25 }, stepStart)
          }
          if (copy) {
            gsap.set(copy, { opacity: 0, y: 12 })
            tl.to(copy, { opacity: 1, y: 0, duration: 0.3 }, stepStart + 0.08)
          }
          if (line) {
            gsap.set(line, { transformOrigin: 'top center', scaleY: 0 })
            tl.to(line, { scaleY: 1, duration: 0.3, ease: 'power1.inOut' }, stepStart + 0.12)
          }
        })
      })
    },
    { scope },
  )

  return scope
}
