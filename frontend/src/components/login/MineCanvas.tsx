import { useEffect, useRef, useState } from 'react'
import { useModuleT } from '../../i18n/useModuleT'
import { loginT } from '../../i18n/modules/login'

interface Point {
  x: number
  y: number
}

interface PitRing {
  cx: number
  cy: number
  rx: number
  ry: number
  points: Point[]
}

interface RouteSample {
  point: Point
  angle: number
}

interface DustParticle {
  x: number
  y: number
  radius: number
  phase: number
  speed: number
  tint: 'white' | 'amber'
}

interface EquipmentLight {
  level: number
  angle: number
  radial: number
  phase: number
  size: number
  color: string
}

interface NoisePixel {
  x: number
  y: number
}

interface SceneState {
  particles: DustParticle[]
  lights: EquipmentLight[]
  noise: NoisePixel[]
  frame: number
  degraded: boolean
  lastTime: number
  fpsSamples: number[]
}

const ROCK_COLORS = ['#0A1A0A', '#0C1F0C', '#0E240E', '#102910', '#122E12']
const TAU = Math.PI * 2
const PIT_SIDE_PROFILE = [1.05, 0.94, 1.08, 0.97, 1.03, 0.93, 1.07, 0.96, 1.02, 0.95]
const TRUCK_OFFSETS = [0, 0.27, 0.53, 0.78]

function createSceneState(): SceneState {
  return {
    particles: Array.from({ length: 30 }, (_, index) => ({
      x: (index * 0.137 + 0.08) % 1,
      y: (index * 0.281 + 0.06) % 1,
      radius: 0.8 + (index % 4) * 0.35,
      phase: index * 0.77,
      speed: 0.18 + (index % 5) * 0.04,
      tint: index % 3 === 0 ? 'amber' : 'white',
    })),
    lights: Array.from({ length: 28 }, (_, index) => ({
      level: index % 5,
      angle: (index / 28) * Math.PI * 2 + (index % 4) * 0.23,
      radial: 0.18 + ((index * 37) % 70) / 100,
      phase: index * 0.41,
      size: 2 + (index % 3),
      color: index % 5 === 0 ? '#00FF88' : index % 2 === 0 ? '#FFD700' : '#FFFFFF',
    })),
    noise: [],
    frame: 0,
    degraded: false,
    lastTime: 0,
    fpsSamples: [],
  }
}

function pitRing(width: number, height: number, index: number): PitRing {
  const sideCount = 10
  const rx = Math.max(34, width * (0.40 - index * 0.057))
  const ry = rx * 0.34
  const cx = width * (0.45 + index * 0.008)
  const cy = height * (0.34 + index * 0.047)
  const phase = -Math.PI / 2 + (index % 2 === 0 ? -0.035 : 0.025)
  const points = Array.from({ length: sideCount }, (_, side) => {
    const angle = phase + (side / sideCount) * TAU
    const facet = PIT_SIDE_PROFILE[side % PIT_SIDE_PROFILE.length] + (index - 2.5) * (side % 2 === 0 ? 0.006 : -0.004)
    return {
      x: cx + Math.cos(angle) * rx * facet + Math.sin(angle * 2 + index) * width * 0.004,
      y: cy + Math.sin(angle) * ry * (facet * 0.96 + 0.02),
    }
  })

  return {
    cx,
    cy,
    rx,
    ry,
    points,
  }
}

function traceRing(ctx: CanvasRenderingContext2D, ring: PitRing, reverse = false) {
  const points = reverse ? [...ring.points].reverse() : ring.points
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.closePath()
}

function tracePolyline(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length === 0) return
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y)
  }
}

function lerpPoint(a: Point, b: Point, amount: number): Point {
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
  }
}

function samplePolyline(points: Point[], progress: number, closed = false, pingPong = false): RouteSample {
  if (points.length === 0) return { point: { x: 0, y: 0 }, angle: 0 }
  if (points.length === 1) return { point: points[0], angle: 0 }

  const cycleLength = pingPong ? 2 : 1
  let t = ((progress % cycleLength) + cycleLength) % cycleLength
  let reversed = false
  if (pingPong && t > 1) {
    t = 2 - t
    reversed = true
  }

  const route = closed ? [...points, points[0]] : points
  const segments = route.slice(0, -1).map((point, index) => {
    const next = route[index + 1]
    return {
      start: point,
      end: next,
      length: Math.hypot(next.x - point.x, next.y - point.y),
    }
  })
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0)
  if (totalLength <= 0) return { point: route[0], angle: 0 }

  let distance = Math.min(totalLength, Math.max(0, t * totalLength))
  for (const segment of segments) {
    if (distance <= segment.length) {
      const local = segment.length > 0 ? distance / segment.length : 0
      const angle = Math.atan2(segment.end.y - segment.start.y, segment.end.x - segment.start.x) + (reversed ? Math.PI : 0)
      return {
        point: lerpPoint(segment.start, segment.end, local),
        angle,
      }
    }
    distance -= segment.length
  }

  const last = segments[segments.length - 1]
  return {
    point: last.end,
    angle: Math.atan2(last.end.y - last.start.y, last.end.x - last.start.x) + (reversed ? Math.PI : 0),
  }
}

function pointOnRing(ring: PitRing, progress: number) {
  return samplePolyline(ring.points, progress, true).point
}

function buildMainHaulRoute(levels: PitRing[]) {
  return [
    pointOnRing(levels[0], 0.61),
    pointOnRing(levels[1], 0.56),
    pointOnRing(levels[2], 0.62),
    pointOnRing(levels[3], 0.57),
    pointOnRing(levels[4], 0.63),
    pointOnRing(levels[5], 0.59),
  ]
}

function drawTruck(ctx: CanvasRenderingContext2D, point: Point, angle: number) {
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.42)'
  ctx.beginPath()
  ctx.ellipse(point.x, point.y + 5, 10, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.translate(point.x, point.y)
  ctx.rotate(angle)
  ctx.fillStyle = '#FFD700'
  ctx.fillRect(-6, -3.5, 12, 7)
  ctx.fillStyle = '#E6BC00'
  ctx.fillRect(1, -3.5, 5, 7)

  const glow = ctx.createRadialGradient(8, 0, 0, 8, 0, 9)
  glow.addColorStop(0, 'rgba(255,255,220,0.95)')
  glow.addColorStop(1, 'rgba(255,255,220,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(8, 0, 9, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(7, 0, 2.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawShovel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  baseAngle: number,
  phase: number,
  seconds: number,
) {
  const armAngle = baseAngle + Math.sin(seconds * 0.9 + phase) * (Math.PI / 9)
  const armLength = 20
  const endX = x + Math.cos(armAngle) * armLength
  const endY = y + Math.sin(armAngle) * armLength

  ctx.save()
  ctx.shadowBlur = 14
  ctx.shadowColor = 'rgba(0,180,80,0.36)'
  ctx.fillStyle = 'rgba(0,180,80,0.9)'
  ctx.fillRect(x - 8, y - 8, 16, 16)
  ctx.strokeStyle = 'rgba(0,180,80,0.9)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(endX, endY)
  ctx.stroke()
  ctx.translate(endX, endY)
  ctx.rotate(armAngle)
  ctx.fillRect(-2, -4, 8, 8)
  ctx.restore()
}

function drawHudCorner(ctx: CanvasRenderingContext2D, x: number, y: number, flipX = false) {
  const direction = flipX ? -1 : 1
  ctx.save()
  ctx.strokeStyle = 'rgba(0,255,136,0.34)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x, y + 26)
  ctx.lineTo(x, y)
  ctx.lineTo(x + direction * 26, y)
  ctx.stroke()
  ctx.restore()
}

export function MineCanvas() {
  const t = useModuleT(loginT)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const sceneRef = useRef<SceneState>(createSceneState())
  const [readout, setReadout] = useState({ north: '7,234,891', east: '434,221', elev: '1,842m' })

  useEffect(() => {
    const update = () => {
      const now = Date.now() / 1000
      setReadout({
        north: Math.round(7_234_891 + Math.sin(now * 0.08) * 42).toLocaleString('en-US'),
        east: Math.round(434_221 + Math.cos(now * 0.07) * 27).toLocaleString('en-US'),
        elev: `${Math.round(1_842 + Math.sin(now * 0.05) * 3).toLocaleString('en-US')}m`,
      })
    }
    update()
    const interval = window.setInterval(update, 1600)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reducedMotion = motionQuery.matches
    let dpr = Math.min(window.devicePixelRatio || 1, 2)

    const stop = () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }

    const sizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const drawScene = (timestamp: number, staticFrame = false) => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (width <= 0 || height <= 0) return

      const state = sceneRef.current
      const seconds = staticFrame ? 0 : timestamp / 1000
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      ctx.fillStyle = '#000A04'
      ctx.fillRect(0, 0, width, height)
      const levels = Array.from({ length: 6 }, (_, index) => pitRing(width, height, index))
      const center = levels[3]
      const compactScene = width < 760 || height < 460
      const atmosphere = ctx.createRadialGradient(center.cx, center.cy, 0, center.cx, center.cy, width * 0.58)
      atmosphere.addColorStop(0, 'rgba(0,255,136,0.04)')
      atmosphere.addColorStop(1, 'rgba(0,255,136,0)')
      ctx.fillStyle = atmosphere
      ctx.fillRect(0, 0, width, height)

      const particleCount = state.degraded || compactScene ? 15 : state.particles.length
      for (let i = 0; i < particleCount; i += 1) {
        const particle = state.particles[i]
        const driftX = Math.sin(seconds * particle.speed + particle.phase) * 10
        const driftY = Math.cos(seconds * particle.speed * 0.8 + particle.phase) * 5
        ctx.fillStyle = particle.tint === 'amber'
          ? 'rgba(255,210,120,0.22)'
          : 'rgba(255,255,255,0.16)'
        ctx.beginPath()
        ctx.arc(particle.x * width + driftX, particle.y * height + driftY, particle.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      for (let i = 0; i < levels.length - 1; i += 1) {
        const outer = levels[i]
        const inner = levels[i + 1]
        ctx.beginPath()
        traceRing(ctx, outer)
        traceRing(ctx, inner, true)
        ctx.fillStyle = ROCK_COLORS[i]
        ctx.fill('evenodd')
      }

      const bottom = levels[levels.length - 1]
      ctx.fillStyle = '#183018'
      ctx.beginPath()
      traceRing(ctx, bottom)
      ctx.fill()

      levels.forEach((level, index) => {
        ctx.setLineDash([4, 24])
        ctx.lineDashOffset = staticFrame ? 0 : -seconds * 12
        ctx.strokeStyle = `rgba(0,255,136,${0.15 + index * 0.06})`
        ctx.lineWidth = 1.1 + index * 0.08
        ctx.beginPath()
        traceRing(ctx, level)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.strokeStyle = `rgba(255,255,255,${0.035 + index * 0.008})`
        ctx.lineWidth = 0.8
        ctx.beginPath()
        traceRing(ctx, level)
        ctx.stroke()
      })

      const haulRoute = buildMainHaulRoute(levels)
      const rampWidth = Math.max(18, width * 0.032)

      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgba(255,200,0,0.045)'
      ctx.lineWidth = rampWidth
      ctx.beginPath()
      tracePolyline(ctx, haulRoute)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,200,0,0.30)'
      ctx.lineWidth = 1.45
      ctx.setLineDash([10, 12])
      ctx.lineDashOffset = staticFrame ? 0 : -seconds * 10
      ctx.beginPath()
      tracePolyline(ctx, haulRoute)
      ctx.stroke()
      ctx.restore()

      const shovelA = pointOnRing(levels[3], 0.08)
      const shovelB = pointOnRing(levels[5], 0.72)
      ctx.save()
      ctx.setLineDash([4, 8])
      ctx.lineDashOffset = staticFrame ? 0 : -seconds * 18
      ctx.strokeStyle = 'rgba(255,200,0,0.15)'
      ctx.lineWidth = 1.2
      ;[
        [shovelA, pointOnRing(levels[2], 0.13), haulRoute[1]],
        [shovelB, pointOnRing(levels[3], 0.68), haulRoute[3]],
      ].forEach((route) => {
        ctx.beginPath()
        tracePolyline(ctx, route)
        ctx.stroke()
      })
      ctx.restore()

      const lightCount = state.degraded || compactScene ? 14 : state.lights.length
      for (let i = 0; i < lightCount; i += 1) {
        const light = state.lights[i]
        const outer = levels[light.level]
        const inner = levels[Math.min(light.level + 1, levels.length - 1)]
        const progress = ((light.angle / TAU) % 1 + 1) % 1
        const outerPoint = pointOnRing(outer, progress)
        const innerPoint = pointOnRing(inner, progress + 0.018)
        const position = lerpPoint(outerPoint, innerPoint, light.radial)
        const opacity = 0.5 + 0.5 * Math.sin(seconds * 2 + light.phase)
        const glow = ctx.createRadialGradient(position.x, position.y, 0, position.x, position.y, light.size * 4)
        glow.addColorStop(0, `${light.color}${Math.round(opacity * 180).toString(16).padStart(2, '0')}`)
        glow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(position.x, position.y, light.size * 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `rgba(255,255,255,${0.35 + opacity * 0.35})`
        ctx.beginPath()
        ctx.arc(position.x, position.y, light.size * 0.55, 0, Math.PI * 2)
        ctx.fill()
      }

      TRUCK_OFFSETS.forEach((offset, index) => {
        const route = index === 3
          ? { points: haulRoute, closed: false, pingPong: true, speed: 0.055 }
          : { points: levels[1 + index].points, closed: true, pingPong: false, speed: 0.042 + index * 0.006 }
        const sample = samplePolyline(route.points, seconds * route.speed + offset, route.closed, route.pingPong)
        drawTruck(ctx, sample.point, sample.angle)
      })

      drawShovel(ctx, shovelA.x, shovelA.y, Math.PI * 0.14, 0.3, seconds)
      drawShovel(ctx, shovelB.x, shovelB.y, -Math.PI * 0.84, 1.2, seconds)

      drawHudCorner(ctx, 18, 18)
      drawHudCorner(ctx, width - 18, 18, true)
      drawHudCorner(ctx, 18, height - 18)

      ctx.fillStyle = 'rgba(0,0,0,0.08)'
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1)
      }

      if (state.frame % 60 === 0 || state.noise.length === 0) {
        state.noise = Array.from({ length: 50 }, (_, index) => ({
          x: (index * 47 + state.frame * 11) % Math.max(width, 1),
          y: (index * 83 + state.frame * 7) % Math.max(height, 1),
        }))
      }
      ctx.fillStyle = 'rgba(0,255,136,0.02)'
      state.noise.forEach((pixel) => ctx.fillRect(pixel.x, pixel.y, 1, 1))
    }

    const loop = (timestamp: number) => {
      const state = sceneRef.current
      if (state.lastTime > 0) {
        const delta = timestamp - state.lastTime
        if (delta > 0 && delta < 300) {
          state.fpsSamples.push(1000 / delta)
          if (state.fpsSamples.length > 30) state.fpsSamples.shift()
          const avgFps = state.fpsSamples.reduce((sum, fps) => sum + fps, 0) / state.fpsSamples.length
          if (state.fpsSamples.length >= 20) {
            if (avgFps < 30) state.degraded = true
            if (avgFps > 45) state.degraded = false
          }
        }
      }
      state.lastTime = timestamp
      state.frame += 1
      drawScene(timestamp)
      animationRef.current = window.requestAnimationFrame(loop)
    }

    const start = () => {
      if (reducedMotion || document.hidden || animationRef.current !== null) return
      sceneRef.current.lastTime = 0
      animationRef.current = window.requestAnimationFrame(loop)
    }

    const drawStatic = () => {
      stop()
      drawScene(window.performance.now(), true)
    }

    const handleVisibility = () => {
      if (document.hidden) {
        stop()
      } else if (reducedMotion) {
        drawStatic()
      } else {
        start()
      }
    }

    const handleMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches
      if (reducedMotion) drawStatic()
      else start()
    }

    const resizeObserver = new ResizeObserver(() => {
      sizeCanvas()
      drawScene(window.performance.now(), reducedMotion)
    })
    resizeObserver.observe(canvas)
    sizeCanvas()
    if (reducedMotion) drawStatic()
    else start()

    document.addEventListener('visibilitychange', handleVisibility)
    motionQuery.addEventListener('change', handleMotionChange)

    return () => {
      stop()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
      motionQuery.removeEventListener('change', handleMotionChange)
    }
  }, [])

  return (
    <div className="mine-wireframe-scene mine-pit-scene">
      <canvas
        ref={canvasRef}
        className="mine-pit-canvas"
        role="img"
        aria-label={t.mine_canvas_aria_label}
      />

      <div className="mine-pit-readout" aria-hidden="true">
        <span><b>38</b> CAEX</span>
        <span><b>5</b> UC</span>
        <span><b>F01</b> ACTIVE</span>
      </div>

      <div className="mine-pit-hud mine-pit-hud-tl" aria-hidden="true">
        <span>DXF LAYER: PIT_DESIGN_042</span>
        <span>RAJO DEMO / COMPAÑÍA DEMO</span>
      </div>

      <div className="mine-pit-hud mine-pit-hud-tr" aria-hidden="true">
        <span>N: {readout.north} / E: {readout.east}</span>
        <span>ELEV: {readout.elev}</span>
      </div>

      <div className="mine-pit-hud mine-pit-hud-bl" aria-hidden="true">
        <span>RAJO DEMO / COMPAÑÍA DEMO</span>
        <strong>PIT TELEMETRY WIREMODEL</strong>
        <small>BENCH 2420-2440 / HAULAGE ROUTES / LIVE</small>
      </div>
    </div>
  )
}
