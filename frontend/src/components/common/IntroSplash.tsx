import { useEffect, useState } from 'react'
import { NorthmineLogo } from '../brand/NorthmineLogo'

const SPLASH_MS = 3200
const FADE_MS = 600

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
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
        opacity: phase === 'fading' ? 0 : 1,
        transition: phase === 'fading' ? `opacity ${FADE_MS}ms ease` : 'none',
        pointerEvents: 'none',
      }}
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.4,
          filter: 'saturate(.85)',
        }}
      >
        <source src="/assets/landing/splash-loading.mp4" type="video/mp4" />
      </video>
      <div style={{ position: 'relative', borderLeft: '1px solid #b8733f', padding: '12px 18px', maxWidth: 420 }}>
        <NorthmineLogo style={{ display: 'block', width: 150, height: 'auto', marginBottom: 8 }} />
        <div style={{ marginTop: 5, color: '#a9b0ad', fontSize: 13 }}>Preparando control operacional...</div>
      </div>
    </div>
  )
}
