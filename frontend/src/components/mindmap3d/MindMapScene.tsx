import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Billboard, Line, OrbitControls, Sparkles, Stars, Text } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import type { MindMapGraph, MindMapQuality, MindMapViewMode } from './mindMapModel'
import { createMindMapLayout, getCategoryColor, type LayoutEdge, type LayoutNode } from './mindMapLayout'
import { getMindMapEdgeVisual } from './MindMapEdge'
import { getMindMapNodeVisual } from './MindMapNode'
import { PitShell } from './PitShell'
import { clamp, hashString, shortLabel } from './mindMapUtils'
import { useModuleT } from '../../i18n/useModuleT'
import { mindmap3dT } from '../../i18n/modules/mindmap3d'

interface Props {
  graph: MindMapGraph
  viewMode: MindMapViewMode
  quality: MindMapQuality
  paused: boolean
  selectedNodeId: string | null
  focusedNodeId: string | null
  visibleCategories: Set<string>
  visibleStatuses: Set<string>
  resetSignal: number
  onSelectNode: (node: LayoutNode | null) => void
}

interface SceneProps extends Props {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
  reducedMotion: boolean
  hoveredNodeId: string | null
  onHoverNode: (node: LayoutNode | null) => void
  onHoverMove: (x: number, y: number) => void
}

const SPACE_BACKGROUND = '#030614'
const LABEL_OUTLINE = '#01040F'

function canUseWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
  } catch {
    return false
  }
}

function qualityBudget(quality: MindMapQuality, nodeCount: number) {
  if (quality === 'BAJA') return { dpr: 1, segments: 16, particles: 34, stars: 90, bloom: false, pit: false }
  if (quality === 'MEDIA') return { dpr: 1.25, segments: 20, particles: 58, stars: 130, bloom: true, pit: true }
  if (quality === 'ALTA') return { dpr: 2, segments: 32, particles: 110, stars: 220, bloom: true, pit: true }
  return nodeCount > 150
    ? { dpr: 1.1, segments: 18, particles: 42, stars: 110, bloom: true, pit: true }
    : { dpr: 1.5, segments: 24, particles: 72, stars: 160, bloom: true, pit: true }
}

function makeRadialTexture(size: number, stops: Array<[number, string]>): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    stops.forEach(([offset, color]) => gradient.addColorStop(offset, color))
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }
  return new THREE.CanvasTexture(canvas)
}

let cachedGlowTexture: THREE.CanvasTexture | null = null
function getGlowTexture(): THREE.CanvasTexture {
  cachedGlowTexture ??= makeRadialTexture(128, [
    [0, 'rgba(255,255,255,1)'],
    [0.22, 'rgba(255,255,255,0.6)'],
    [0.55, 'rgba(255,255,255,0.16)'],
    [1, 'rgba(255,255,255,0)'],
  ])
  return cachedGlowTexture
}

let cachedNebulaTexture: THREE.CanvasTexture | null = null
function getNebulaTexture(): THREE.CanvasTexture {
  cachedNebulaTexture ??= makeRadialTexture(256, [
    [0, 'rgba(255,255,255,0.55)'],
    [0.38, 'rgba(255,255,255,0.2)'],
    [0.72, 'rgba(255,255,255,0.06)'],
    [1, 'rgba(255,255,255,0)'],
  ])
  return cachedNebulaTexture
}

function vectorFromNode(node: LayoutNode) {
  return new THREE.Vector3(node.position.x, node.position.y, node.position.z)
}

function animatedVector(node: LayoutNode, time: number, paused: boolean, reducedMotion: boolean) {
  const base = vectorFromNode(node)
  if (paused || reducedMotion || node.type === 'ROOT') return base
  const seed = hashString(node.id)
  const amplitude = node.type === 'CATEGORY' ? 1.6 : 3.8
  const criticalBoost = node.status === 'CRITICAL' ? 1.45 : node.status === 'ATTENTION' ? 1.18 : 1
  const t = time * 0.18 + seed * 0.0001
  base.x += Math.sin(t * 1.6) * amplitude * criticalBoost
  base.y += Math.cos(t * 1.15) * amplitude * 0.7 * criticalBoost
  base.z += Math.sin(t * 0.9 + 1.2) * amplitude * 0.9
  return base
}

const spinningNodeTypes = new Set(['TRUCK', 'SHOVEL', 'DESTINATION', 'ALERT', 'RISK', 'TARGET'])

function NodeGeometry({ node, segments }: { node: LayoutNode; segments: number }) {
  if (node.type === 'TRUCK') return <boxGeometry args={[1.45, 1.05, 1.05, 2, 2, 2]} />
  if (node.type === 'SHOVEL') return <octahedronGeometry args={[1.15, 0]} />
  if (node.type === 'DESTINATION') return <tetrahedronGeometry args={[1.2, 0]} />
  if (node.type === 'ALERT' || node.type === 'RISK') return <coneGeometry args={[1.05, 1.7, 3]} />
  if (node.type === 'TARGET') return <icosahedronGeometry args={[1.12, 0]} />
  return <sphereGeometry args={[1, segments, Math.max(8, Math.floor(segments / 2))]} />
}

function NodeObject({
  node,
  selected,
  hovered,
  dimmed,
  paused,
  reducedMotion,
  segments,
  onSelect,
  onHover,
  onHoverMove,
}: {
  node: LayoutNode
  selected: boolean
  hovered: boolean
  dimmed: boolean
  paused: boolean
  reducedMotion: boolean
  segments: number
  onSelect: (node: LayoutNode) => void
  onHover: (node: LayoutNode | null) => void
  onHoverMove: (x: number, y: number) => void
}) {
  const groupRef = useRef<THREE.Group | null>(null)
  const meshRef = useRef<THREE.Mesh | null>(null)
  const ringRef = useRef<THREE.Group | null>(null)
  const visual = getMindMapNodeVisual(node, selected, dimmed, 1)
  const baseScale = node.type === 'ROOT' ? 9.8 : node.type === 'CATEGORY' ? 6.9 : 4.6
  const scale = baseScale * visual.radius
  const labelSize = node.type === 'ROOT' ? 18 : node.type === 'CATEGORY' ? 11 : clamp(6.8 + node.importance * 5, 7, 12)
  const showLabel = node.type === 'ROOT' || node.type === 'CATEGORY' || selected || hovered || node.importance > 0.34
  const showRing = node.type === 'ROOT' || node.type === 'CATEGORY' || selected
  const color = useMemo(() => new THREE.Color(node.color), [node.color])
  const glowTexture = getGlowTexture()
  const glowScale = scale * (selected ? 4.4 : hovered ? 4.15 : node.status === 'CRITICAL' ? 3.9 : node.status === 'ATTENTION' ? 3.4 : 3)
  const glowOpacity =
    (selected ? 0.62 : hovered ? 0.54 : node.status === 'CRITICAL' ? 0.48 : node.status === 'ATTENTION' ? 0.38 : 0.27) * visual.alpha

  useFrame(({ clock }, delta) => {
    const group = groupRef.current
    if (!group) return
    const time = clock.getElapsedTime()
    const position = animatedVector(node, time, paused, reducedMotion)
    group.position.lerp(position, paused || reducedMotion ? 1 : 0.08)
    if (node.status === 'CRITICAL' || node.status === 'ATTENTION') {
      const pulse = 1 + Math.sin(time * (node.status === 'CRITICAL' ? 3 : 2) + hashString(node.id)) * 0.04
      group.scale.setScalar(pulse)
    } else {
      group.scale.setScalar(1)
    }
    if (!paused && !reducedMotion) {
      if (meshRef.current && spinningNodeTypes.has(node.type)) {
        meshRef.current.rotation.y += delta * 0.35
      }
      if (ringRef.current) {
        ringRef.current.rotation.z += delta * (node.type === 'ROOT' ? 0.22 : 0.14)
      }
    }
  })

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onSelect(node)
  }

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    onHover(node)
    onHoverMove(event.nativeEvent.offsetX, event.nativeEvent.offsetY)
  }

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    onHoverMove(event.nativeEvent.offsetX, event.nativeEvent.offsetY)
  }

  return (
    <group ref={groupRef} position={[node.position.x, node.position.y, node.position.z]}>
      <sprite scale={glowScale}>
        <spriteMaterial
          map={glowTexture}
          color={node.color}
          transparent
          opacity={glowOpacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      <mesh
        ref={meshRef}
        scale={scale}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerMove={handlePointerMove}
        onPointerOut={() => onHover(null)}
      >
        <NodeGeometry node={node} segments={segments} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 2.4 : hovered ? 2 : node.status === 'CRITICAL' ? 1.7 : node.status === 'ATTENTION' ? 1.25 : 0.85}
          metalness={0.3}
          roughness={0.24}
          transparent
          opacity={visual.alpha}
        />
      </mesh>

      {showRing && (
        <group ref={ringRef} rotation={[Math.PI / 2.15, 0, 0]}>
          <mesh scale={scale * (node.type === 'ROOT' ? 1.62 : 1.48)}>
            <torusGeometry args={[1, node.type === 'ROOT' ? 0.028 : 0.038, 8, 56]} />
            <meshBasicMaterial
              color={node.color}
              transparent
              opacity={(selected ? 0.78 : 0.52) * visual.alpha}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          {node.type === 'ROOT' && (
            <mesh scale={scale * 1.94} rotation={[0.6, 0.4, 0]}>
              <torusGeometry args={[1, 0.018, 8, 56]} />
              <meshBasicMaterial
                color={node.color}
                transparent
                opacity={0.36 * visual.alpha}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          )}
        </group>
      )}

      {showLabel && (
        <Billboard position={[scale + 7, scale * 0.28, 0]}>
          <Text
            color={dimmed ? '#5B6B7F' : '#F4F7FA'}
            fontSize={labelSize}
            fontWeight={selected || node.type === 'ROOT' ? 800 : 700}
            anchorX="left"
            anchorY="middle"
            outlineColor={LABEL_OUTLINE}
            outlineWidth={0.22}
            maxWidth={120}
          >
            {shortLabel(node.label, selected ? 42 : 28)}
          </Text>
          {selected && node.displayValue && (
            <Text
              position={[0, -labelSize * 1.18, 0]}
              color={getCategoryColor(node.category)}
              fontSize={Math.max(5.5, labelSize * 0.72)}
              fontWeight={700}
              anchorX="left"
              anchorY="middle"
              outlineColor={LABEL_OUTLINE}
              outlineWidth={0.18}
              maxWidth={150}
            >
              {shortLabel(node.displayValue, 48)}
            </Text>
          )}
        </Billboard>
      )}
    </group>
  )
}

function EdgeObject({
  edge,
  selectedNodeId,
  paused,
  reducedMotion,
  particlesEnabled,
}: {
  edge: LayoutEdge
  selectedNodeId: string | null
  paused: boolean
  reducedMotion: boolean
  particlesEnabled: boolean
}) {
  const particleRef = useRef<THREE.Sprite | null>(null)
  const selectedEdge = Boolean(selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId))
  const dimmed = Boolean(selectedNodeId && !selectedEdge && edge.sourceNode.category !== edge.targetNode.category)
  const visual = getMindMapEdgeVisual(edge, dimmed)
  const glowTexture = getGlowTexture()
  const start = vectorFromNode(edge.sourceNode)
  const end = vectorFromNode(edge.targetNode)
  const mid = start.clone().lerp(end, 0.5)
  mid.y += 18 + edge.weight * 24
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(start, mid, end), [start.x, start.y, start.z, mid.x, mid.y, mid.z, end.x, end.y, end.z])
  const points = useMemo(() => curve.getPoints(24), [curve])
  const vertexColors = useMemo(() => {
    const from = new THREE.Color(visual.colorFrom)
    const to = new THREE.Color(visual.colorTo)
    return points.map((_, index) => {
      const mix = from.clone().lerp(to, index / Math.max(1, points.length - 1))
      return [mix.r, mix.g, mix.b] as [number, number, number]
    })
  }, [points, visual.colorFrom, visual.colorTo])

  useFrame(({ clock }) => {
    const particle = particleRef.current
    if (!particle || paused || reducedMotion || !particlesEnabled || !edge.active) return
    const seed = (hashString(edge.id) % 100) / 100
    const t = (clock.getElapsedTime() * (0.07 + edge.flow * 0.12) + seed) % 1
    particle.position.copy(curve.getPointAt(t))
    const pulse = 1 + Math.sin(clock.getElapsedTime() * 2.4 + seed * 12) * 0.18
    particle.scale.setScalar((4.2 + edge.weight * 4.6) * pulse)
  })

  return (
    <group>
      <Line
        points={points}
        color="#FFFFFF"
        vertexColors={vertexColors}
        lineWidth={selectedEdge ? visual.width + 0.9 : visual.width}
        transparent
        opacity={selectedEdge ? Math.min(0.9, visual.alpha + 0.3) : visual.alpha}
      />
      {particlesEnabled && edge.active && (
        <sprite ref={particleRef} position={points[0]} scale={4.2 + edge.weight * 4.6}>
          <spriteMaterial
            map={glowTexture}
            color={visual.color}
            transparent
            opacity={visual.particleAlpha}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      )}
    </group>
  )
}

function CameraRig({
  nodes,
  focusedNodeId,
  selectedNodeId,
  resetSignal,
}: {
  nodes: LayoutNode[]
  focusedNodeId: string | null
  selectedNodeId: string | null
  resetSignal: number
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const { camera } = useThree()

  useEffect(() => {
    const controls = controlsRef.current
    const target = nodes.find(node => node.id === (focusedNodeId ?? selectedNodeId))
    if (!controls || !target) return
    const center = vectorFromNode(target)
    controls.target.copy(center)
    camera.position.lerp(new THREE.Vector3(center.x + 140, center.y + 105, center.z + 330), 0.74)
    controls.update()
  }, [camera, focusedNodeId, nodes, selectedNodeId])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    controls.target.set(0, 0, 0)
    camera.position.set(0, 90, 440)
    controls.update()
  }, [camera, resetSignal])

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.075}
      rotateSpeed={0.64}
      zoomSpeed={0.82}
      panSpeed={0.72}
      minDistance={110}
      maxDistance={860}
    />
  )
}

const nebulaSprites = [
  { position: [-460, 190, -560] as const, scale: 780, color: '#2563EB', opacity: 0.3, spin: 0.012 },
  { position: [500, -140, -600] as const, scale: 700, color: '#7C3AED', opacity: 0.26, spin: -0.009 },
  { position: [90, 340, -680] as const, scale: 620, color: '#0891B2', opacity: 0.24, spin: 0.007 },
  { position: [-220, -340, -520] as const, scale: 560, color: '#0D9488', opacity: 0.18, spin: -0.011 },
  { position: [320, 260, -520] as const, scale: 500, color: '#BE185D', opacity: 0.16, spin: 0.01 },
]

function Nebula({ paused, reducedMotion }: { paused: boolean; reducedMotion: boolean }) {
  const materialsRef = useRef<Array<THREE.SpriteMaterial | null>>([])
  const texture = getNebulaTexture()

  useFrame((_, delta) => {
    if (paused || reducedMotion) return
    materialsRef.current.forEach((material, index) => {
      const config = nebulaSprites[index]
      if (material && config) material.rotation += config.spin * delta
    })
  })

  return (
    <>
      {nebulaSprites.map((item, index) => (
        <sprite key={index} position={[item.position[0], item.position[1], item.position[2]]} scale={[item.scale, item.scale, 1]}>
          <spriteMaterial
            ref={element => {
              materialsRef.current[index] = element
            }}
            map={texture}
            color={item.color}
            transparent
            opacity={item.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </>
  )
}

function SceneEnvironment({
  quality,
  nodeCount,
  paused,
  reducedMotion,
}: {
  quality: MindMapQuality
  nodeCount: number
  paused: boolean
  reducedMotion: boolean
}) {
  const { scene, gl } = useThree()
  const budget = qualityBudget(quality, nodeCount)
  const motionFrozen = paused || reducedMotion

  useEffect(() => {
    scene.fog = new THREE.FogExp2(SPACE_BACKGROUND, 0.00135)
    gl.setClearColor(SPACE_BACKGROUND)
    return () => {
      scene.fog = null
    }
  }, [gl, scene])

  return (
    <>
      <ambientLight intensity={0.5} color="#B8CCF0" />
      <directionalLight position={[240, 320, 180]} intensity={0.65} color="#DCE8FF" />
      <pointLight position={[120, 180, 240]} intensity={1.7} color="#2FD4FF" />
      <pointLight position={[-260, -120, -160]} intensity={1.05} color="#C98BFF" />
      <pointLight position={[220, -140, 120]} intensity={0.8} color="#2BE0C0" />
      <Stars radius={760} depth={320} count={Math.round(budget.stars * 1.9)} factor={4} saturation={0.5} fade speed={motionFrozen ? 0 : 0.18} />
      <Stars radius={420} depth={160} count={Math.round(budget.stars * 1.2)} factor={2.4} saturation={0.65} fade speed={motionFrozen ? 0 : 0.45} />
      <Sparkles
        count={Math.round(budget.particles * 1.5)}
        scale={[640, 360, 420]}
        size={2.8}
        speed={motionFrozen ? 0 : 0.3}
        opacity={0.55}
        color="#7DD3FC"
        noise={1.2}
      />
      <Sparkles
        count={Math.round(budget.particles * 0.8)}
        scale={[520, 300, 360]}
        size={3.4}
        speed={motionFrozen ? 0 : 0.18}
        opacity={0.4}
        color="#C98BFF"
        noise={0.8}
      />
      <Nebula paused={paused} reducedMotion={reducedMotion} />
      <polarGridHelper args={[430, 16, 9, 64, '#1B4D6B', '#0D2740']} position={[0, -210, 0]} />
      {budget.pit && <PitShell radius={300} position={[0, -206, 0]} />}
    </>
  )
}

function GraphScene(props: SceneProps) {
  const {
    nodes,
    edges,
    quality,
    paused,
    selectedNodeId,
    focusedNodeId,
    resetSignal,
    onSelectNode,
    reducedMotion,
    hoveredNodeId,
    onHoverNode,
    onHoverMove,
  } = props
  const budget = qualityBudget(quality, nodes.length)
  const selectedNode = nodes.find(node => node.id === selectedNodeId)

  return (
    <>
      <SceneEnvironment quality={quality} nodeCount={nodes.length} paused={paused} reducedMotion={reducedMotion} />
      {edges.map((edge, index) => (
        <EdgeObject
          key={edge.id}
          edge={edge}
          selectedNodeId={selectedNodeId}
          paused={paused}
          reducedMotion={reducedMotion}
          particlesEnabled={index < budget.particles}
        />
      ))}
      {nodes.map(node => (
        <NodeObject
          key={node.id}
          node={node}
          selected={selectedNodeId === node.id}
          hovered={hoveredNodeId === node.id}
          dimmed={Boolean(selectedNode && selectedNode.id !== node.id && selectedNode.category !== node.category)}
          paused={paused}
          reducedMotion={reducedMotion}
          segments={budget.segments}
          onSelect={onSelectNode}
          onHover={onHoverNode}
          onHoverMove={onHoverMove}
        />
      ))}
      <CameraRig nodes={nodes} focusedNodeId={focusedNodeId} selectedNodeId={selectedNodeId} resetSignal={resetSignal} />
      {budget.bloom && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={1.35} luminanceThreshold={0.42} luminanceSmoothing={0.32} radius={0.82} />
        </EffectComposer>
      )}
    </>
  )
}

export function MindMapScene({
  graph,
  viewMode,
  quality,
  paused,
  selectedNodeId,
  focusedNodeId,
  visibleCategories,
  visibleStatuses,
  resetSignal,
  onSelectNode,
}: Props) {
  const t = useModuleT(mindmap3dT)
  const [webglAvailable, setWebglAvailable] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [hoveredNode, setHoveredNode] = useState<LayoutNode | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const pointerRef = useRef({ x: 0, y: 0 })

  const handleHoverNode = (node: LayoutNode | null) => {
    setHoveredNode(current => (current?.id === node?.id ? current : node))
  }

  const handleHoverMove = (x: number, y: number) => {
    pointerRef.current = { x, y }
    const element = tooltipRef.current
    if (element) {
      element.style.left = `${x}px`
      element.style.top = `${y}px`
    }
  }
  const layout = useMemo(() => createMindMapLayout(graph, viewMode), [graph, viewMode])
  const filteredNodes = useMemo(() => {
    const visible = layout.nodes.filter(node => visibleCategories.has(node.category) && visibleStatuses.has(node.status))
    if (visible.length <= 250) return visible
    const pinned = visible.filter(node => node.type === 'ROOT' || node.type === 'CATEGORY' || node.id === selectedNodeId)
    const pinnedIds = new Set(pinned.map(node => node.id))
    const rest = visible
      .filter(node => !pinnedIds.has(node.id))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, Math.max(0, 250 - pinned.length))
    return [...pinned, ...rest]
  }, [layout.nodes, selectedNodeId, visibleCategories, visibleStatuses])
  const filteredIds = useMemo(() => new Set(filteredNodes.map(node => node.id)), [filteredNodes])
  const filteredEdges = useMemo(
    () => layout.edges.filter(edge => filteredIds.has(edge.source) && filteredIds.has(edge.target)),
    [filteredIds, layout.edges],
  )
  const budget = qualityBudget(quality, filteredNodes.length)

  useEffect(() => {
    setWebglAvailable(canUseWebGL())
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => setReducedMotion(media.matches)
    handleChange()
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  if (!webglAvailable) {
    return (
      <div className="nm-map-scene nm-map-webgl-fallback">
        <div>
          <strong>{t.scene_webgl_no_disponible}</strong>
          <span>{t.scene_webgl_fallback_desc}</span>
        </div>
        <div className="nm-map-fallback-list">
          {filteredNodes.slice(0, 40).map(node => (
            <button key={node.id} type="button" onClick={() => onSelectNode(node)}>
              <strong>{node.label}</strong>
              <span>{node.type} - {node.status} - {node.data_source}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`nm-map-scene${hoveredNode ? ' is-node-hover' : ''}`}>
      <Canvas
        camera={{ position: [0, 90, 440], fov: 52, near: 0.1, far: 2200 }}
        dpr={[1, budget.dpr]}
        gl={{ antialias: quality !== 'BAJA', alpha: false, powerPreference: 'high-performance' }}
        onPointerMissed={() => onSelectNode(null)}
      >
        <GraphScene
          graph={graph}
          viewMode={viewMode}
          quality={quality}
          paused={paused}
          selectedNodeId={selectedNodeId}
          focusedNodeId={focusedNodeId}
          visibleCategories={visibleCategories}
          visibleStatuses={visibleStatuses}
          resetSignal={resetSignal}
          onSelectNode={onSelectNode}
          nodes={filteredNodes}
          edges={filteredEdges}
          reducedMotion={reducedMotion}
          hoveredNodeId={hoveredNode?.id ?? null}
          onHoverNode={handleHoverNode}
          onHoverMove={handleHoverMove}
        />
      </Canvas>
      {hoveredNode && (
        <div
          ref={tooltipRef}
          className="nm-map-node-tooltip"
          role="status"
          style={{ left: pointerRef.current.x, top: pointerRef.current.y }}
        >
          <strong>{hoveredNode.label}</strong>
          {hoveredNode.displayValue && <span>{hoveredNode.displayValue}</span>}
          <small>{hoveredNode.status} - {hoveredNode.data_source}</small>
        </div>
      )}
      <div className="nm-map-scene-hint">
        {t.scene_hint}
      </div>
    </div>
  )
}
