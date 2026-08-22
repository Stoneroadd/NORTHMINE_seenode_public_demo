import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '../gsap'
import { mineralLightSweep } from './MineralLightSweep'

/**
 * Entrance for the hero-adjacent product capture: rises + fades in, then a
 * single light sweep catches the frame — the "iluminación vinculada al
 * movimiento" the brief asks for, contained to the frame's own
 * overflow: hidden so it never bleeds into the page.
 */
export function useProductStageReveal<T extends HTMLElement>() {
  const scope = useRef<T>(null)

  useGSAP(
    () => {
      const frame = scope.current?.querySelector('[data-product-stage]')
      const sweep = scope.current?.querySelector('[data-stage-sweep]')
      if (!frame) return

      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(frame, { opacity: 1, y: 0, scale: 1 })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.set(frame, { opacity: 0, y: 70, scale: 0.97 })
        const tl = gsap.timeline({
          scrollTrigger: { trigger: frame, start: 'top 85%', once: true, fastScrollEnd: true },
        })
        tl.to(frame, { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'power3.out' })
        mineralLightSweep(tl, sweep ?? null, '-=0.2')
      })
    },
    { scope },
  )

  return scope
}
