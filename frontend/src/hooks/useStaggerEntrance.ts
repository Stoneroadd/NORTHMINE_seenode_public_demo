import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

export function useStaggerEntrance<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const container = ref.current
    if (!container) return

    const items = Array.from(container.querySelectorAll<HTMLElement>('.stagger-item'))

    if (reduced) {
      items.forEach((el) => { el.style.opacity = '1' })
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const index = items.indexOf(entry.target as HTMLElement)
          const el = entry.target as HTMLElement
          el.style.animationDelay = `${Math.max(0, index) * 80}ms`
          el.classList.add('is-visible')
          observer.unobserve(el)
        })
      },
      { threshold: 0.1 },
    )

    items.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [reduced])

  return ref
}
