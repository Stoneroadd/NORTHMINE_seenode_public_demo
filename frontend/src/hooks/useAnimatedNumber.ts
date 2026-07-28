import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberOptions {
  durationMs?: number
  enabled?: boolean
  initialValue?: number
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

export function useAnimatedNumber(
  target: number,
  { durationMs = 720, enabled = true, initialValue }: AnimatedNumberOptions = {},
) {
  const [value, setValue] = useState(initialValue ?? target)
  const previous = useRef(initialValue ?? target)

  useEffect(() => {
    if (!enabled || durationMs <= 0) {
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
  }, [durationMs, enabled, target])

  return value
}
