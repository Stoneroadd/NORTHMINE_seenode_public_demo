import { useEffect, useState } from 'react'

interface DemoLivePulseOptions {
  enabled?: boolean
  intervalMs?: number
  amplitude?: number
}

export function useDemoLivePulse({
  enabled = true,
  intervalMs = 4200,
  amplitude = 0.018,
}: DemoLivePulseOptions = {}) {
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setPulse(0)
      return
    }

    const update = () => {
      setPulse((Math.random() * 2 - 1) * amplitude)
    }

    update()
    const interval = window.setInterval(update, intervalMs)

    return () => {
      window.clearInterval(interval)
    }
  }, [amplitude, enabled, intervalMs])

  return pulse
}
