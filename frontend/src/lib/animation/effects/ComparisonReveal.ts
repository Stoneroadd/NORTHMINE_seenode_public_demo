import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '../gsap'

/**
 * The FMS and NORTHMINE columns slide in from opposite edges and meet at
 * their resting position — two separate systems converging into one
 * comparison, rather than a generic shared fade-up.
 */
export function useComparisonReveal<T extends HTMLElement>() {
  const scope = useRef<T>(null)

  useGSAP(
    () => {
      const head = scope.current?.querySelectorAll<HTMLElement>('[data-comparison-fade]')
      const columns = scope.current?.querySelectorAll<HTMLElement>('[data-comparison-column]')
      const closing = scope.current?.querySelector<HTMLElement>('[data-comparison-closing]')
      if (!columns || columns.length === 0) return

      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: reduce)', () => {
        if (head) gsap.set(head, { opacity: 1, x: 0 })
        gsap.set(columns, { opacity: 1, x: 0 })
        if (closing) gsap.set(closing, { opacity: 1, y: 0 })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: scope.current, start: 'top 76%', once: true, fastScrollEnd: true },
          defaults: { ease: 'power2.out' },
        })

        if (head) {
          gsap.set(head, { opacity: 0, y: 14 })
          tl.to(head, { opacity: 1, y: 0, duration: 0.45 }, 0)
        }

        gsap.set(columns[0], { opacity: 0, x: -28 })
        tl.to(columns[0], { opacity: 1, x: 0, duration: 0.55 }, head ? 0.15 : 0)

        if (columns[1]) {
          gsap.set(columns[1], { opacity: 0, x: 28 })
          tl.to(columns[1], { opacity: 1, x: 0, duration: 0.55 }, head ? 0.15 : 0)
        }

        if (closing) {
          gsap.set(closing, { opacity: 0, y: 10 })
          tl.to(closing, { opacity: 1, y: 0, duration: 0.4 }, '-=0.15')
        }
      })
    },
    { scope },
  )

  return scope
}
