import { useEffect, useRef } from 'react'
import { useAppStore } from '../store'

const TIMEOUT_MS = 30 * 60 * 1000
const WARNING_MS = 25 * 60 * 1000

export function useIdleTimeout() {
  const setLastActivity = useAppStore((s) => s.setLastActivity)
  const setIdleWarning = useAppStore((s) => s.setIdleWarning)
  const setIdleExpired = useAppStore((s) => s.setIdleExpired)
  const idleExpired = useAppStore((s) => s.idleExpired)
  const lastActivity = useAppStore((s) => s.lastActivity)
  const warningIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const expireIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const updateActivity = () => {
    setLastActivity(Date.now())
    setIdleWarning(false)
  }

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach((ev) => window.addEventListener(ev, updateActivity, { passive: true }))
    return () => events.forEach((ev) => window.removeEventListener(ev, updateActivity))
  }, [])

  useEffect(() => {
    warningIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivity
      if (elapsed >= WARNING_MS && elapsed < TIMEOUT_MS) {
        setIdleWarning(true)
      }
    }, 5000)

    expireIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivity
      if (elapsed >= TIMEOUT_MS) {
        setIdleExpired(true)
      }
    }, 5000)

    return () => {
      if (warningIntervalRef.current) clearInterval(warningIntervalRef.current)
      if (expireIntervalRef.current) clearInterval(expireIntervalRef.current)
    }
  }, [lastActivity, setLastActivity, setIdleWarning, setIdleExpired])

  return { idleExpired, updateActivity }
}
