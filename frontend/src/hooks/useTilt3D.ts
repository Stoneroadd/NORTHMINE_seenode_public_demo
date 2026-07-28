import { useCallback, useMemo, useState, type PointerEvent } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

interface TiltOptions {
  maxTilt?: number
  scale?: number
  enabled?: boolean
}

export function useTilt3D({ maxTilt = 6, scale = 1.02, enabled = true }: TiltOptions = {}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [transform, setTransform] = useState('perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)')

  const disabled = !enabled || prefersReducedMotion

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (disabled) return

    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    const rotateY = x * maxTilt
    const rotateX = -y * maxTilt
    setTransform(`perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(${scale})`)
  }, [disabled, maxTilt, scale])

  const onPointerLeave = useCallback(() => {
    setTransform('perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)')
  }, [])

  return useMemo(() => ({
    style: {
      transform,
      transition: disabled ? 'none' : 'transform 180ms ease, filter 180ms ease',
      transformStyle: 'preserve-3d' as const,
    },
    onPointerMove,
    onPointerLeave,
  }), [disabled, onPointerLeave, onPointerMove, transform])
}
