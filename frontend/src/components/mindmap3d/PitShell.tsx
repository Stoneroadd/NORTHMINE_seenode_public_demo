import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'

// Piso holografico del mapa 3D: diseño de rajo cargado desde /pit-shell.json
// (generado por backend/scripts/dxf_to_pit_shell.py a partir del DXF real).
// Si el JSON no existe todavia, se dibuja un rajo sintetico de referencia.

export interface PitShellPolyline {
  layer?: string
  points: Array<[number, number, number]>
}

export interface PitShellData {
  name?: string
  source?: string
  units?: string
  polylines: PitShellPolyline[]
}

const PIT_RIM_COLOR = new THREE.Color('#2FD4FF')
const PIT_DEEP_COLOR = new THREE.Color('#7C3AED')

function buildSyntheticPit(): PitShellData {
  const polylines: PitShellPolyline[] = []
  const benches = 12
  const rimRadius = 600
  const benchHeight = 15
  const benchStep = 40

  for (let bench = 0; bench < benches; bench += 1) {
    const elevation = -bench * benchHeight
    const baseRadius = rimRadius - bench * benchStep
    const centerX = bench * 9
    const centerY = -bench * 6
    const points: Array<[number, number, number]> = []
    const segments = 96
    for (let index = 0; index <= segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2
      const irregular = 1 + 0.06 * Math.sin(angle * 3 + bench * 0.8) + 0.035 * Math.sin(angle * 7 - bench * 1.3)
      const r = baseRadius * irregular
      points.push([centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r, elevation])
    }
    polylines.push({ layer: `BANCO_${2400 - bench * benchHeight}`, points })
  }

  const rampPoints: Array<[number, number, number]> = []
  const rampSteps = 260
  for (let index = 0; index <= rampSteps; index += 1) {
    const t = index / rampSteps
    const angle = t * Math.PI * 4.2 + 0.6
    const bench = t * (benches - 1)
    const radius = (rimRadius - bench * benchStep) * 1.02
    const centerX = bench * 9
    const centerY = -bench * 6
    rampPoints.push([
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius,
      -t * (benches - 1) * benchHeight,
    ])
  }
  polylines.push({ layer: 'RAMPA', points: rampPoints })

  return { name: 'Rajo sintetico de referencia', source: 'synthetic', units: 'm', polylines }
}

function isValidPitShell(json: unknown): json is PitShellData {
  if (!json || typeof json !== 'object') return false
  const candidate = json as PitShellData
  return Array.isArray(candidate.polylines)
    && candidate.polylines.length > 0
    && candidate.polylines.every(line => Array.isArray(line.points) && line.points.length >= 2)
}

function usePitShellData(): PitShellData | null {
  const [data, setData] = useState<PitShellData | null>(null)

  useEffect(() => {
    let cancelled = false
    const base = import.meta.env.BASE_URL ?? '/'
    fetch(`${base.endsWith('/') ? base : `${base}/`}pit-shell.json`)
      .then(response => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
      .then(json => {
        if (!cancelled) setData(isValidPitShell(json) ? json : buildSyntheticPit())
      })
      .catch(() => {
        if (!cancelled) setData(buildSyntheticPit())
      })
    return () => {
      cancelled = true
    }
  }, [])

  return data
}

function buildPitGeometry(data: PitShellData, radius: number): THREE.BufferGeometry | null {
  const box = new THREE.Box3()
  const probe = new THREE.Vector3()
  for (const line of data.polylines) {
    for (const [x, y, z] of line.points) {
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue
      box.expandByPoint(probe.set(x, y, z))
    }
  }
  if (box.isEmpty()) return null

  const centerX = (box.min.x + box.max.x) / 2
  const centerY = (box.min.y + box.max.y) / 2
  const horizontalExtent = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, 1)
  const scale = (radius * 2) / horizontalExtent
  const topZ = box.max.z
  const depthRange = Math.max(box.max.z - box.min.z, 1)

  const positions: number[] = []
  const colors: number[] = []
  const mixed = new THREE.Color()

  for (const line of data.polylines) {
    for (let index = 0; index < line.points.length - 1; index += 1) {
      const from = line.points[index]
      const to = line.points[index + 1]
      for (const [x, y, z] of [from, to]) {
        // DXF: x=este, y=norte, z=cota. Escena: y arriba, -y para mantener orientacion.
        positions.push((x - centerX) * scale, (z - topZ) * scale, -(y - centerY) * scale)
        const depth = (topZ - z) / depthRange
        mixed.copy(PIT_RIM_COLOR).lerp(PIT_DEEP_COLOR, depth).multiplyScalar(1 - depth * 0.2)
        colors.push(mixed.r, mixed.g, mixed.b)
      }
    }
  }
  if (!positions.length) return null

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return geometry
}

export function PitShell({
  radius = 300,
  position = [0, -206, 0],
}: {
  radius?: number
  position?: [number, number, number]
}) {
  const data = usePitShellData()
  const geometry = useMemo(() => (data ? buildPitGeometry(data, radius) : null), [data, radius])

  useEffect(() => () => {
    geometry?.dispose()
  }, [geometry])

  if (!geometry) return null

  return (
    <lineSegments geometry={geometry} position={position}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  )
}
