import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

const GLOW_SIZE = 260

export function CursorGlow() {
  const enabled = useAppStore((s) => s.effects.cursor)
  const prefersReducedMotion = usePrefersReducedMotion()
  const glowRef = useRef<HTMLDivElement>(null)
  const [isCoarsePointer, setIsCoarsePointer] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)')
    const update = () => setIsCoarsePointer(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const active = enabled && !prefersReducedMotion && !isCoarsePointer

  useEffect(() => {
    if (!active) return
    const node = glowRef.current
    if (!node) return

    let frame = 0
    let latestX = -9999
    let latestY = -9999

    const flush = () => {
      node.style.transform = `translate3d(${latestX}px, ${latestY}px, 0) translate(-50%, -50%)`
      frame = 0
    }

    const onPointerMove = (event: PointerEvent) => {
      latestX = event.clientX
      latestY = event.clientY
      node.style.opacity = '1'
      if (!frame) frame = requestAnimationFrame(flush)
    }

    const hide = () => {
      node.style.opacity = '0'
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', hide)
    window.addEventListener('blur', hide)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', hide)
      window.removeEventListener('blur', hide)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [active])

  if (!active) return null

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: GLOW_SIZE,
        height: GLOW_SIZE,
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 9999,
        opacity: 0,
        transition: 'opacity 220ms ease',
        mixBlendMode: 'plus-lighter',
        background:
          'radial-gradient(circle, color-mix(in srgb, var(--accent) 55%, transparent) 0%, color-mix(in srgb, var(--cyan) 32%, transparent) 45%, transparent 72%)',
        filter: 'blur(2px)',
        willChange: 'transform, opacity',
      }}
    />
  )
}
