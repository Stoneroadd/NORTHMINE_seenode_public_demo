import type { MindMapCategory, MindMapEdge, MindMapGraph, MindMapNode, MindMapViewMode } from './mindMapModel'
import { categoryDefinitions } from './mindMapModel'
import { clamp, hashString } from './mindMapUtils'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface LayoutNode extends MindMapNode {
  position: Vec3
  radius: number
  color: string
}

export interface LayoutEdge extends MindMapEdge {
  sourceNode: LayoutNode
  targetNode: LayoutNode
}

export interface MindMapLayout {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
}

const categoryColors: Record<MindMapCategory, string> = {
  ROOT: '#67E8F9',
  OPERATION: '#5B9DFF',
  PRODUCTION: '#2FD4FF',
  FLEET: '#3EE58A',
  LOADING: '#FFC94A',
  ECONOMY: '#C98BFF',
  RISK: '#FF5C5C',
  INTELLIGENCE: '#FF7ED4',
  MONTHLY_TARGET: '#2BE0C0',
}

const modeScale: Record<MindMapViewMode, { ring: number; spread: number; z: number }> = {
  CONSTELACION: { ring: 205, spread: 92, z: 126 },
  RADIAL: { ring: 225, spread: 78, z: 70 },
  FLUJO: { ring: 195, spread: 110, z: 95 },
  RIESGO: { ring: 180, spread: 118, z: 145 },
  ECONOMIA: { ring: 185, spread: 116, z: 132 },
}

function categoryIndex(category: MindMapCategory): number {
  return Math.max(0, categoryDefinitions.findIndex(def => def.id === category))
}

function categoryPosition(category: MindMapCategory, mode: MindMapViewMode): Vec3 {
  if (category === 'ROOT') return { x: 0, y: 0, z: 0 }
  const scale = modeScale[mode]
  const index = categoryIndex(category)
  const angle = (Math.PI * 2 * index) / Math.max(1, categoryDefinitions.length)
  const zWave = Math.sin(angle * 1.7 + 0.35) * scale.z

  if (mode === 'FLUJO') {
    const x = (index - (categoryDefinitions.length - 1) / 2) * 92
    return { x, y: Math.sin(index * 0.8) * 84, z: zWave * 0.7 }
  }
  if (mode === 'RIESGO' && category === 'RISK') return { x: 0, y: -60, z: 155 }
  if (mode === 'ECONOMIA' && category === 'ECONOMY') return { x: 0, y: -54, z: 150 }

  return {
    x: Math.cos(angle) * scale.ring,
    y: Math.sin(angle) * scale.ring * 0.66,
    z: zWave,
  }
}

function childPosition(node: MindMapNode, siblingIndex: number, siblingCount: number, mode: MindMapViewMode): Vec3 {
  const parent = categoryPosition(node.category, mode)
  const scale = modeScale[mode]
  const hash = hashString(node.id)
  const angle = ((Math.PI * 2 * siblingIndex) / Math.max(1, siblingCount)) + (hash % 100) / 100
  const orbit = scale.spread * (0.72 + ((hash % 23) / 100))
  const zDepth = (((hash % 200) / 100) - 1) * scale.z * 0.72

  return {
    x: parent.x + Math.cos(angle) * orbit,
    y: parent.y + Math.sin(angle) * orbit * 0.74,
    z: parent.z + zDepth,
  }
}

function nodeRadius(node: MindMapNode): number {
  if (node.type === 'ROOT') return 2.25
  if (node.type === 'CATEGORY') return 1.48
  return clamp(0.42 + node.importance * 1.12, 0.38, 1.72)
}

export function getNodeColor(node: Pick<MindMapNode, 'category' | 'status'>): string {
  if (node.status === 'CRITICAL') return '#FF5A5A'
  if (node.status === 'ATTENTION') return '#FFB224'
  if (node.status === 'INACTIVE') return '#64748B'
  return categoryColors[node.category] ?? '#67E8F9'
}

export function getCategoryColor(category: MindMapCategory): string {
  return categoryColors[category] ?? '#67E8F9'
}

export function createMindMapLayout(graph: MindMapGraph, mode: MindMapViewMode): MindMapLayout {
  const counts = new Map<MindMapCategory, number>()
  const seen = new Map<MindMapCategory, number>()

  graph.nodes.forEach(node => {
    if (node.type !== 'ROOT' && node.type !== 'CATEGORY') {
      counts.set(node.category, (counts.get(node.category) ?? 0) + 1)
    }
  })

  const nodes = graph.nodes.map<LayoutNode>(node => {
    let position: Vec3
    if (node.type === 'ROOT') {
      position = { x: 0, y: 0, z: 0 }
    } else if (node.type === 'CATEGORY') {
      position = categoryPosition(node.category, mode)
    } else {
      const index = seen.get(node.category) ?? 0
      seen.set(node.category, index + 1)
      position = childPosition(node, index, counts.get(node.category) ?? 1, mode)
    }

    return {
      ...node,
      position,
      radius: nodeRadius(node),
      color: getNodeColor(node),
    }
  })

  const byId = new Map(nodes.map(node => [node.id, node]))
  const edges = graph.edges
    .map(edge => {
      const sourceNode = byId.get(edge.source)
      const targetNode = byId.get(edge.target)
      if (!sourceNode || !targetNode) return null
      return { ...edge, sourceNode, targetNode }
    })
    .filter((edge): edge is LayoutEdge => edge !== null)

  return { nodes, edges }
}
