import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '../gsap'

/**
 * A fixed, page-wide color wash: two static blurred copper/amber blobs
 * that drift slowly as the whole page scrolls, giving the black background
 * a slow-moving warm undertone instead of a flat void. Transform-only (the
 * blur radius itself is never animated, only translated), gated off
 * entirely under reduced motion and on narrow/short viewports where the
 * drift distance would be disproportionate.
 */
export function useAmbientScrollWash<T extends HTMLElement>() {
  const scope = useRef<T>(null)

  useGSAP(
    () => {
      const blobA = scope.current?.querySelector('[data-ambient-blob="a"]')
      const blobB = scope.current?.querySelector('[data-ambient-blob="b"]')
      if (!blobA && !blobB) return

      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set([blobA, blobB].filter(Boolean), { x: 0, y: 0 })
      })

      mm.add('(prefers-reduced-motion: no-preference) and (min-width: 641px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.8,
          },
        })
        if (blobA) tl.to(blobA, { x: '12vw', y: '10vh', ease: 'none' }, 0)
        if (blobB) tl.to(blobB, { x: '-10vw', y: '-8vh', ease: 'none' }, 0)
      })
    },
    { scope },
  )

  return scope
}
