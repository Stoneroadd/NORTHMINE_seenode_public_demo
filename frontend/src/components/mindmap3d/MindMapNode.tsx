import type { LayoutNode } from './mindMapLayout'
import { clamp } from './mindMapUtils'

export interface NodeVisualState {
  radius: number
  alpha: number
  glow: number
  labelSize: number
}

export function getMindMapNodeVisual(node: LayoutNode, selected: boolean, dimmed: boolean, zoom: number): NodeVisualState {
  const riskBoost = node.status === 'CRITICAL' ? 0.28 : node.status === 'ATTENTION' ? 0.12 : 0
  return {
    radius: node.radius * (selected ? 1.34 : 1) * (1 + riskBoost),
    alpha: dimmed ? 0.18 : node.status === 'INACTIVE' ? 0.42 : 0.92,
    glow: selected ? 0.58 : node.status === 'CRITICAL' ? 0.42 : node.status === 'ATTENTION' ? 0.28 : 0.16,
    labelSize: clamp(10 + node.importance * 8 + (selected ? 3 : 0) + zoom * 1.5, 10, node.type === 'ROOT' ? 24 : 18),
  }
}

export function MindMapNode() {
  return null
}
