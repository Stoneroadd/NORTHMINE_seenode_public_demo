import { useEffect, useState } from 'react'
import { useAppStore } from '../../store'
import { useIdleTimeout } from '../../hooks/useIdleTimeout'
import { useModuleT } from '../../i18n/useModuleT'
import { uiT } from '../../i18n/modules/ui'

const WARNING_MS = 25 * 60 * 1000
const TIMEOUT_MS = 30 * 60 * 1000

export function IdleTimeoutBanner() {
  const t = useModuleT(uiT)
  const idleWarning = useAppStore((s) => s.idleWarning)
  const setIdleWarning = useAppStore((s) => s.setIdleWarning)
  const idleExpired = useAppStore((s) => s.idleExpired)
  const setIdleExpired = useAppStore((s) => s.setIdleExpired)
  const lastActivity = useAppStore((s) => s.lastActivity)
  const logout = useAppStore((s) => s.logout)
  const { updateActivity } = useIdleTimeout()
  const [remaining, setRemaining] = useState(300)

  useEffect(() => {
    if (!idleWarning && !idleExpired) return

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivity
      const left = Math.max(0, Math.ceil((TIMEOUT_MS - elapsed) / 1000))
      setRemaining(left)

      if (elapsed >= TIMEOUT_MS) {
        setIdleExpired(true)
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [idleWarning, idleExpired, lastActivity, setIdleExpired])

  useEffect(() => {
    if (idleExpired) {
      logout()
    }
  }, [idleExpired, logout])

  if (!idleWarning && !idleExpired) return null

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(255, 45, 85, 0.95)',
        color: '#fff',
        textAlign: 'center',
        padding: '10px 20px',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: 13,
        fontWeight: 700,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span>{t.sessionExpiringIn(String(minutes), seconds.toString().padStart(2, '0'))}</span>
      <button
        type="button"
        onClick={() => {
          updateActivity()
          setIdleWarning(false)
          setIdleExpired(false)
        }}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: 6,
          color: '#fff',
          padding: '4px 14px',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {t.continueSession}
      </button>
    </div>
  )
}
