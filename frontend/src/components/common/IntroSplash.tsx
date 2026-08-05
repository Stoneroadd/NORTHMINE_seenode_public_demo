import { useEffect, useState } from 'react'

const SPLASH_MS = 2600
const FADE_MS = 500

export function IntroSplash() {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'done'>('visible')

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const holdMs = reduced ? 100 : SPLASH_MS
    const fadeTimer = window.setTimeout(() => setPhase('fading'), holdMs)
    const doneTimer = window.setTimeout(() => setPhase('done'), holdMs + FADE_MS)
    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(doneTimer)
    }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#080a0a',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        opacity: phase === 'fading' ? 0 : 1,
        transition: phase === 'fading' ? `opacity ${FADE_MS}ms ease` : 'none',
        pointerEvents: 'none',
      }}
    >
      <img
        src="/assets/brand/northmine-cobre.jpeg"
        alt="NORTHMINE COBRE"
        style={{
          display: 'block',
          maxWidth: 'min(560px, 90vw)',
          width: '100%',
          height: 'auto',
        }}
      />
    </div>
  )
}
