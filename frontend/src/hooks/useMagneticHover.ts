import { useCallback, useMemo, type PointerEvent } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

interface MagneticHoverOptions {
  strength?: number
  maxOffset?: number
  enabled?: boolean
}

export function useMagneticHover({ strength = 0.25, maxOffset = 8, enabled = true }: MagneticHoverOptions = {}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const disabled = !enabled || prefersReducedMotion

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.4 })
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.4 })

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (disabled) return
    const rect = event.currentTarget.getBoundingClientRect()
    const offsetX = event.clientX - (rect.left + rect.width / 2)
    const offsetY = event.clientY - (rect.top + rect.height / 2)
    x.set(Math.max(-maxOffset, Math.min(maxOffset, offsetX * strength)))
    y.set(Math.max(-maxOffset, Math.min(maxOffset, offsetY * strength)))
  }, [disabled, maxOffset, strength, x, y])

  const onPointerLeave = useCallback(() => {
    x.set(0)
    y.set(0)
  }, [x, y])

  return useMemo(
    () => ({ x: springX, y: springY, onPointerMove, onPointerLeave }),
    [springX, springY, onPointerMove, onPointerLeave],
  )
}
