import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '../gsap'
import { dxfLineProgress } from './DXFLineProgress'

/**
 * Coordinated hero entrance: badge → title → lead → CTAs, with the DXF
 * contour lines drawing on alongside. Expects data-hero-badge / -title /
 * -lead / -actions / -contours attributes within the returned scope.
 */
export function useHeroRevealTimeline<T extends HTMLElement>() {
  const scope = useRef<T>(null)

  useGSAP(
    () => {
      const badge = scope.current?.querySelector('[data-hero-badge]')
      const title = scope.current?.querySelector('[data-hero-title]')
      const lead = scope.current?.querySelector('[data-hero-lead]')
      const actions = scope.current?.querySelector('[data-hero-actions]')
      const contours = scope.current?.querySelector('[data-hero-contours]')
      const backdrop = scope.current?.querySelector('[data-hero-backdrop]')
      const targets = [badge, title, lead, actions].filter(Boolean)
      if (targets.length === 0) return

      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(targets, { opacity: 1, y: 0 })
        if (contours) gsap.set(contours.querySelectorAll('path'), { strokeDashoffset: 0, strokeDasharray: 1 })
      })

      // Backdrop parallax: a moderate, contained scrub tied to the hero's
      // own scroll range — not a manual rAF loop, GSAP drives the frame.
      mm.add('(prefers-reduced-motion: no-preference) and (min-width: 641px)', () => {
        if (!backdrop) return
        gsap.to(backdrop, {
          yPercent: 12,
          ease: 'none',
          scrollTrigger: {
            trigger: scope.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.6,
          },
        })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        if (badge) {
          gsap.set(badge, { opacity: 0, y: 16 })
          tl.to(badge, { opacity: 1, y: 0, duration: 0.5 })
        }
        if (title) {
          gsap.set(title, { opacity: 0, y: 38 })
          tl.to(title, { opacity: 1, y: 0, duration: 0.8 }, badge ? '-=0.25' : 0)
        }
        if (lead) {
          gsap.set(lead, { opacity: 0, y: 20 })
          tl.to(lead, { opacity: 1, y: 0, duration: 0.55 }, '-=0.4')
        }
        if (actions) {
          gsap.set(actions, { opacity: 0, y: 18 })
          tl.to(actions, { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
        }
        if (contours) {
          dxfLineProgress(tl, contours, 0.15, { duration: 1.8, stagger: 0.06 })
        }
      })
    },
    { scope },
  )

  return scope
}
