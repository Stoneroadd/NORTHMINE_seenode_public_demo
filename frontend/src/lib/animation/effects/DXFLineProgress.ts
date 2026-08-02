import { gsap } from '../gsap'

type GsapTimeline = ReturnType<typeof gsap.timeline>
type GsapPosition = string | number

/**
 * Draws on a set of SVG contour paths (expects pathLength="1", as
 * PitContourField ships) via stroke-dashoffset, like a survey line being
 * traced. Writes directly onto the caller's timeline at `position` rather
 * than returning a standalone tween to compose in later — a separately
 * created tween added via timeline.add() was observed to never actually
 * animate in this project's gsap/@gsap-react combination (see
 * HeroRevealTimeline history); calling tl.to() directly is what works.
 */
export function dxfLineProgress(
  timeline: GsapTimeline,
  container: Element | null,
  position: GsapPosition,
  options: { duration?: number; stagger?: number } = {},
) {
  const paths = container?.querySelectorAll<SVGPathElement>('path[pathLength="1"]')
  if (!paths || paths.length === 0) return

  gsap.set(paths, { strokeDasharray: 1, strokeDashoffset: 1 })
  timeline.to(
    paths,
    {
      strokeDashoffset: 0,
      duration: options.duration ?? 1.6,
      stagger: options.stagger ?? 0.05,
      ease: 'power1.inOut',
    },
    position,
  )
}
