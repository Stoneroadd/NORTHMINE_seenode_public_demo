import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '../gsap'

/**
 * Reveals the decision-cases grid on a diagonal sweep (delay keyed by
 * row+col in the 3-column layout) instead of a uniform top-to-bottom
 * stagger — reads as a cascade across the grid rather than a falling list.
 */
export function useDecisionCasesReveal<T extends HTMLElement>(columns = 3) {
  const scope = useRef<T>(null)

  useGSAP(
    () => {
      const head = scope.current?.querySelectorAll<HTMLElement>('[data-cases-fade]')
      const items = scope.current?.querySelectorAll<HTMLElement>('[data-cases-item]')
      if (!items || items.length === 0) return

      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: reduce)', () => {
        if (head) gsap.set(head, { opacity: 1, y: 0 })
        gsap.set(items, { opacity: 1, y: 0 })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: scope.current, start: 'top 80%', once: true },
          defaults: { ease: 'power2.out' },
        })

        if (head) {
          gsap.set(head, { opacity: 0, y: 14 })
          tl.to(head, { opacity: 1, y: 0, duration: 0.45 }, 0)
        }

        gsap.set(items, { opacity: 0, y: 16 })
        items.forEach((item, index) => {
          const row = Math.floor(index / columns)
          const col = index % columns
          const diagonalStep = row + col
          tl.to(
            item,
            { opacity: 1, y: 0, duration: 0.4 },
            (head ? 0.2 : 0) + diagonalStep * 0.07,
          )
        })
      })
    },
    { scope },
  )

  return scope
}
