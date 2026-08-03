import { useEffect } from 'react'

/**
 * Tracks pointer position over primary CTAs and exposes it as CSS custom
 * properties (--mx/--my) so northmine-saas-motion.css can paint a glow that
 * follows the cursor. Fine-pointer devices only; the CSS itself is what
 * actually gates hover: hover, so this just avoids attaching a listener
 * that would never fire on touch.
 */
export function CursorGlow() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined

    const onPointerMove = (event: PointerEvent) => {
      const target = (event.target as HTMLElement)?.closest<HTMLElement>('.ns-btn--primary')
      if (!target) return
      const rect = target.getBoundingClientRect()
      target.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`)
      target.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`)
    }

    document.addEventListener('pointermove', onPointerMove)
    return () => document.removeEventListener('pointermove', onPointerMove)
  }, [])

  return null
}
