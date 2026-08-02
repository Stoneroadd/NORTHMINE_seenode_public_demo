import { gsap } from '../gsap'

type GsapTimeline = ReturnType<typeof gsap.timeline>
type GsapPosition = string | number

/**
 * A single light sweep across a contained surface (transform only, the
 * surface must have overflow: hidden — see .ns-stage__frame). Writes
 * directly onto the caller's timeline at `position` — see DXFLineProgress
 * for why a separately created tween composed via timeline.add() doesn't
 * work reliably here.
 */
export function mineralLightSweep(
  timeline: GsapTimeline,
  sweepEl: Element | null,
  position: GsapPosition,
  options: { duration?: number } = {},
) {
  if (!sweepEl) return

  gsap.set(sweepEl, { xPercent: -130, opacity: 0 })
  timeline
    .to(sweepEl, { opacity: 1, duration: 0.15 }, position)
    .to(sweepEl, { xPercent: 130, duration: options.duration ?? 1.1, ease: 'power2.inOut' }, position)
    .to(sweepEl, { opacity: 0, duration: 0.25 }, '-=0.25')
}
