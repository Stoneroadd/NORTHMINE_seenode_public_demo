import { useEffect, useState } from 'react'

export interface MousePosition {
  x: number
  y: number
  active: boolean
}

export function useMousePosition(): MousePosition {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0, active: false })

  useEffect(() => {
    let frame = 0
    let latestX = 0
    let latestY = 0

    const flush = () => {
      setPosition({ x: latestX, y: latestY, active: true })
      frame = 0
    }

    const onPointerMove = (event: PointerEvent) => {
      latestX = event.clientX
      latestY = event.clientY
      if (!frame) frame = requestAnimationFrame(flush)
    }

    const onInactive = () => setPosition((prev) => ({ ...prev, active: false }))

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onInactive)
    window.addEventListener('blur', onInactive)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onInactive)
      window.removeEventListener('blur', onInactive)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return position
}
