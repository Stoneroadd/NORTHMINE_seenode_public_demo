import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '../gsap'

const formatTonnes = new Intl.NumberFormat('es-CL')

/**
 * Reveals the metric cards in sequence, then counts each
 * [data-metric-value] element from 0 to its [data-metric-target] (a plain
 * integer, sign handled via [data-metric-prefix]) once the group scrolls
 * into view. Cards and final numbers are correct in the DOM before any JS
 * runs — this only replaces the displayed text while animating.
 */
export function useMetricCountSequence<T extends HTMLElement>() {
  const scope = useRef<T>(null)

  useGSAP(
    () => {
      const cards = scope.current?.querySelectorAll<HTMLElement>('[data-metric-card]')
      const values = scope.current?.querySelectorAll<HTMLElement>('[data-metric-value][data-metric-target]')
      if (!cards || cards.length === 0) return

      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(cards, { opacity: 1, y: 0 })
        values?.forEach((el) => {
          const target = Number(el.dataset.metricTarget)
          const prefix = el.dataset.metricPrefix ?? ''
          const suffix = el.dataset.metricSuffix ?? ''
          el.textContent = `${prefix}${formatTonnes.format(target)}${suffix}`
        })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.set(cards, { opacity: 0, y: 20 })
        const tl = gsap.timeline({
          scrollTrigger: { trigger: scope.current, start: 'top 80%', once: true, fastScrollEnd: true },
        })
        tl.to(cards, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' })

        values?.forEach((el) => {
          const target = Number(el.dataset.metricTarget)
          const prefix = el.dataset.metricPrefix ?? ''
          const suffix = el.dataset.metricSuffix ?? ''
          const counter = { value: 0 }
          tl.to(
            counter,
            {
              value: target,
              duration: 0.9,
              ease: 'power2.out',
              onUpdate: () => {
                el.textContent = `${prefix}${formatTonnes.format(Math.round(counter.value))}${suffix}`
              },
            },
            '-=0.3',
          )
        })
      })
    },
    { scope },
  )

  return scope
}
