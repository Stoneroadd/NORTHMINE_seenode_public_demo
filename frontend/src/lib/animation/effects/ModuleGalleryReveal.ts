import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '../gsap'

/**
 * One-time entrance for the gallery's heading, filter bar, and grid frame
 * as the section first scrolls into view. Deliberately separate from the
 * per-card animation in ModuleGallery.tsx: that one runs on every filter
 * click and stays owned by Motion (AnimatePresence + layout), so nothing
 * here touches the cards themselves.
 */
export function useModuleGalleryReveal<T extends HTMLElement>() {
  const scope = useRef<T>(null)

  useGSAP(
    () => {
      const head = scope.current?.querySelector('[data-gallery-head]')
      const filters = scope.current?.querySelector('[data-gallery-filters]')
      const grid = scope.current?.querySelector('[data-gallery-grid]')
      const targets = [head, filters, grid].filter(Boolean)
      if (targets.length === 0) return

      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(targets, { opacity: 1, y: 0 })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.set(targets, { opacity: 0, y: 22 })
        gsap.to(targets, {
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: { trigger: scope.current, start: 'top 80%', once: true, fastScrollEnd: true },
        })
      })
    },
    { scope },
  )

  return scope
}
