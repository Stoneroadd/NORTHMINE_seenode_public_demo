import { useEffect, useRef, useState } from 'react'
import { useInView } from './useInView'

interface AnimatedNumberOptions {
  durationMs?: number
  enabled?: boolean
  initialValue?: number
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

/**
 * Counts from `initialValue` up to `target`, holding at `initialValue` until
 * the returned `ref` scrolls into view (once) — attach `ref` to the element
 * that should trigger the count-up.
 */
export function useAnimatedNumber<T extends HTMLElement = HTMLElement>(
  target: number,
  { durationMs = 720, enabled = true, initialValue }: AnimatedNumberOptions = {},
) {
  const { ref, inView } = useInView<T>()
  const [value, setValue] = useState(initialValue ?? target)
  const previous = useRef(initialValue ?? target)

  useEffect(() => {
    if (!enabled) {
      previous.current = target
      setValue(target)
      return
    }

    if (!inView) return

    if (durationMs <= 0) {
      previous.current = target
      setValue(target)
      return
    }

    const startValue = previous.current
    const delta = target - startValue
    const startAt = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const progress = Math.min((now - startAt) / durationMs, 1)
      const nextValue = startValue + delta * easeOutCubic(progress)
      setValue(nextValue)

      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        previous.current = target
      }
    }

    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [durationMs, enabled, target, inView])

  return { value, ref }
}
