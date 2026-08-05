import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '../gsap'

/**
 * Reveals the five-layer architecture diagram stage by stage, drawing each
 * connector's SVG stroke (like a survey line being traced, see
 * dxfLineProgress) right after its node appears — so the flow reads as
 * assembled top to bottom rather than dumped on screen at once.
 */
export function useArchitectureTimeline<T extends HTMLElement>() {
  const scope = useRef<T>(null)

  useGSAP(
    () => {
      const head = scope.current?.querySelectorAll<HTMLElement>('[data-arch-fade]')
      const stages = scope.current?.querySelectorAll<HTMLElement>('[data-arch-stage]')
      if (!stages || stages.length === 0) return

      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: reduce)', () => {
        if (head) gsap.set(head, { opacity: 1, y: 0 })
        stages.forEach((stage) => {
          gsap.set(stage, { opacity: 1 })
          const connector = stage.querySelector<SVGPathElement>('[data-arch-connector] line, [data-arch-connector] path')
          if (connector) gsap.set(connector, { strokeDashoffset: 0 })
        })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: scope.current, start: 'top 78%', once: true },
          defaults: { ease: 'power2.out' },
        })

        if (head) {
          gsap.set(head, { opacity: 0, y: 16 })
          tl.to(head, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, 0)
        }

        const stageStagger = 0.32
        const headOffset = head ? 0.2 : 0
        stages.forEach((stage, index) => {
          const marker = stage.querySelector('[data-arch-marker]')
          const copy = stage.querySelector('[data-arch-copy]')
          const connectorLines = stage.querySelectorAll<SVGPathElement>('[data-arch-connector] line, [data-arch-connector] path')
          const stageStart = headOffset + index * stageStagger

          gsap.set(stage, { opacity: 0 })
          tl.to(stage, { opacity: 1, duration: 0.25 }, stageStart)

          if (marker) {
            gsap.set(marker, { scale: 0.7, opacity: 0 })
            tl.to(marker, { scale: 1, opacity: 1, duration: 0.3 }, stageStart)
          }
          if (copy) {
            gsap.set(copy, { opacity: 0, y: 12 })
            tl.to(copy, { opacity: 1, y: 0, duration: 0.32 }, stageStart + 0.08)
          }
          if (connectorLines.length > 0) {
            gsap.set(connectorLines, { strokeDasharray: 1, strokeDashoffset: 1 })
            tl.to(connectorLines, { strokeDashoffset: 0, duration: 0.4, ease: 'power1.inOut' }, stageStart + 0.16)
          }
        })
      })
    },
    { scope },
  )

  return scope
}
