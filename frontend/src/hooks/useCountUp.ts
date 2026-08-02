import { useEffect, useRef, useState } from 'react'

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

/**
 * Animates 0 → target once the returned ref scrolls into view. Skips the
 * animation under reduced motion, showing the final value immediately.
 */
export function useCountUp(target: number, reduceMotion: boolean, duration = 900) {
  const [value, setValue] = useState(reduceMotion ? target : 0)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (reduceMotion) {
      setValue(target)
      return undefined
    }
    const node = ref.current
    if (!node) return undefined

    let frame: number
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration)
          setValue(Math.round(target * easeOutExpo(progress)))
          if (progress < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    observer.observe(node)
    return () => {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [target, reduceMotion, duration])

  return { ref, value }
}
