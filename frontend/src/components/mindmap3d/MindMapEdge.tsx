import type { LayoutEdge } from './mindMapLayout'
import { getCategoryColor } from './mindMapLayout'
import { clamp } from './mindMapUtils'

export interface EdgeVisualState {
  color: string
  colorFrom: string
  colorTo: string
  width: number
  alpha: number
  particleAlpha: number
}

export function getMindMapEdgeVisual(edge: LayoutEdge, dimmed: boolean): EdgeVisualState {
  const riskColor = edge.risk > 0.72 ? '#FF5A5A' : edge.risk > 0.5 ? '#FFB224' : null
  return {
    color: riskColor ?? getCategoryColor(edge.category),
    colorFrom: riskColor ?? edge.sourceNode.color,
    colorTo: riskColor ?? edge.targetNode.color,
    width: clamp(0.7 + edge.weight * 2.4, 0.7, 3.4),
    alpha: dimmed ? 0.08 : clamp(0.18 + edge.weight * 0.42, 0.18, 0.62),
    particleAlpha: edge.active ? (dimmed ? 0.06 : 0.85) : 0,
  }
}

export function MindMapEdge() {
  return null
}
