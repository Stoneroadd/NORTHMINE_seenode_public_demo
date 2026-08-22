import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, ScrollTrigger } from '../gsap'

export interface SectionRevealOptions {
  /** Selector (within scope) for each element to reveal. */
  targets: string
  /** Stagger between targets, in seconds. Ignored on the mobile tier. */
  stagger?: number
  /** Vertical travel distance in px on desktop/tablet. Mobile always uses a smaller fixed distance. */
  distance?: number
  duration?: number
  /** ScrollTrigger start position. */
  start?: string
}

/**
 * Generic scroll-triggered staggered fade-up for a group of sibling
 * elements within one section. Used by OperationalReading, OperationalBenefits,
 * TerrainMaterials, and ModuleGalleryReveal — anywhere a section's contents
 * should appear together once as the section scrolls into view (not on
 * every re-render, and not the same job as a filter-driven re-render,
 * which stays on Motion).
 */
export function useSectionReveal<T extends HTMLElement>({
  targets,
  stagger = 0.08,
  distance = 24,
  duration = 0.6,
  start = 'top 82%',
}: SectionRevealOptions) {
  const scope = useRef<T>(null)

  useGSAP(
    () => {
      const els = scope.current?.querySelectorAll<HTMLElement>(targets)
      if (!els || els.length === 0) return

      const mm = gsap.matchMedia()
      mm.add(
        {
          reduce: '(prefers-reduced-motion: reduce)',
          mobile: '(max-width: 640px)',
        },
        (context) => {
          const { reduce, mobile } = context.conditions as { reduce: boolean; mobile: boolean }

          if (reduce) {
            gsap.set(els, { opacity: 1, y: 0 })
            return
          }

          // Explicit set() + to() rather than from(): in this project's
          // gsap/@gsap-react combination, from() tweens composed this way
          // were observed to report onComplete without ever visually
          // reaching their "to" state (see HeroRevealTimeline history).
          // set() + to() is unambiguous and was verified to work reliably.
          gsap.set(els, { opacity: 0, y: mobile ? Math.min(distance, 16) : distance })
          gsap.to(els, {
            opacity: 1,
            y: 0,
            duration,
            stagger: mobile ? Math.min(stagger, 0.05) : stagger,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: scope.current,
              start,
              once: true,
              fastScrollEnd: true,
            },
          })
        },
      )
    },
    { scope },
  )

  return scope
}
