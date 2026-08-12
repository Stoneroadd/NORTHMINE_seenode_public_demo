import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { agentGuidance } from '../../lib/agentGuidance/guidanceStore'
import '../../styles/agent-guidance.css'

export function AgentGuidanceLayer() {
  const activity = useSyncExternalStore(agentGuidance.subscribe, agentGuidance.snapshot, () => null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useLayoutEffect(() => {
    if (!activity) {
      setRect(null)
      return
    }
    const target = agentGuidance.resolveElement(activity.targetId)
    setRect(target?.getBoundingClientRect() ?? null)
    target?.focus({ preventScroll: true })
  }, [activity])

  useGSAP(() => {
    const frame = frameRef.current
    if (!frame || !activity || !rect) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (activity.state === 'targeting') gsap.fromTo(frame, { opacity: 0, scale: 1.025 }, { opacity: 1, scale: 1, duration: 0.18, ease: 'power2.out' })
      if (activity.state === 'executing') gsap.to(frame, { opacity: 0.72, scale: 1.006, yoyo: true, repeat: 1, duration: activity.durationMs / 2000, ease: 'sine.inOut' })
      if (activity.state === 'confirmed') gsap.fromTo(frame, { opacity: 1, scale: 0.99 }, { opacity: 0, scale: 1.018, duration: 0.42, ease: 'power2.out' })
      if (activity.state === 'failed') gsap.to(frame, { x: 3, yoyo: true, repeat: 3, duration: 0.08, ease: 'power1.inOut' })
    })
    mm.add('(prefers-reduced-motion: reduce)', () => gsap.set(frame, { opacity: activity.state === 'confirmed' ? 0 : 1 }))
    return () => mm.revert()
  }, { dependencies: [activity?.actionId, activity?.state, rect?.x, rect?.y], scope: frameRef })

  return (
    <>
      <div className="agent-guidance-live" aria-live="polite" aria-atomic="true">
        {activity ? `${activity.label}: ${activity.state === 'confirmed' ? 'confirmado' : activity.state === 'failed' ? 'no completado' : 'en curso'}` : ''}
      </div>
      {activity && rect && (
        <div
          ref={frameRef}
          className={`agent-guidance-frame is-${activity.effect} is-${activity.state}`}
          data-testid={`agent-guidance-${activity.state}`}
          style={{ left: rect.left - 5, top: rect.top - 5, width: rect.width + 10, height: rect.height + 10 }}
          aria-hidden="true"
        />
      )}
    </>
  )
}
