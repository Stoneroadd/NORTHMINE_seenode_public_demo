import type { KeyboardEvent } from 'react'
import type { FlowNode, FlowRelationship, OperationalFlowSnapshot } from './types'
import { assertionShortLabel } from './presentation'

interface Position { x: number; y: number }

const NODE_WIDTH = 184
const NODE_HEIGHT = 88
const POSITIONS: Record<string, Position> = {
  'front-f03': { x: 34, y: 88 },
  'loading-ph03': { x: 250, y: 88 },
  'truck-group-ph03': { x: 466, y: 88 },
  'route-north': { x: 682, y: 88 },
  'destination-crusher': { x: 898, y: 88 },
  'metric-cycle': { x: 682, y: 286 },
  'metric-tonnage': { x: 898, y: 286 },
  'plan-shift': { x: 682, y: 440 },
  'cost-impact': { x: 898, y: 440 },
}

// Mismo orden lectura (arriba-abajo, izquierda-derecha) que usa el lienzo para
// dibujar los nodos -- se reutiliza para que el recorrido guiado siga la
// cadena operacional en el mismo sentido en que ya se ve en pantalla.
export function orderNodesForReading(nodes: FlowNode[]): FlowNode[] {
  return [...nodes].sort((left, right) => {
    const leftPosition = POSITIONS[left.node_id]
    const rightPosition = POSITIONS[right.node_id]
    if (!leftPosition || !rightPosition) return 0
    return leftPosition.y - rightPosition.y || leftPosition.x - rightPosition.x
  })
}

function edgePath(edge: FlowRelationship): string {
  const source = POSITIONS[edge.source_node_id]
  const target = POSITIONS[edge.target_node_id]
  if (!source || !target) return ''

  const sx = source.x + NODE_WIDTH
  const sy = source.y + NODE_HEIGHT / 2
  const tx = target.x
  const ty = target.y + NODE_HEIGHT / 2

  if (source.x === target.x) {
    const verticalX = source.x + NODE_WIDTH / 2
    const sourceY = source.y + NODE_HEIGHT
    return `M ${verticalX} ${sourceY} C ${verticalX} ${sourceY + 54}, ${verticalX} ${target.y - 54}, ${verticalX} ${target.y}`
  }
  if (target.y > source.y) {
    const sourceX = source.x + NODE_WIDTH / 2
    const sourceY = source.y + NODE_HEIGHT
    const targetX = target.x + NODE_WIDTH / 2
    const targetY = target.y
    const middleY = sourceY + (targetY - sourceY) / 2
    return `M ${sourceX} ${sourceY} C ${sourceX} ${middleY}, ${targetX} ${middleY}, ${targetX} ${targetY}`
  }
  const bend = Math.max(54, Math.abs(tx - sx) * 0.45)
  return `M ${sx} ${sy} C ${sx + bend} ${sy}, ${tx - bend} ${ty}, ${tx} ${ty}`
}

function markerId(edge: FlowRelationship, showImpact: boolean): string {
  if (edge.assertion_type === 'HYPOTHESIS') return 'mc-arrow-hypothesis'
  if (showImpact && edge.impacted) return 'mc-arrow-impact'
  return 'mc-arrow-default'
}

function conditionShape(condition: FlowNode['condition']) {
  if (condition === 'CRITICAL') return <path d="M 0 14 L 7 0 L 14 14 Z" />
  if (condition === 'ATTENTION') return <path d="M 7 0 L 14 7 L 7 14 L 0 7 Z" />
  if (condition === 'RECOVERING') return <path d="M 7 0 A 7 7 0 1 1 1.5 2.7" fill="none" stroke="currentColor" strokeWidth="2" />
  if (condition === 'UNKNOWN') return <path d="M 2 2 L 12 12 M 12 2 L 2 12" fill="none" stroke="currentColor" strokeWidth="2" />
  return <circle cx="7" cy="7" r="6" />
}

interface Props {
  snapshot: OperationalFlowSnapshot
  selectedNodeId: string
  showImpact: boolean
  showAssertions: boolean
  onSelectNode: (nodeId: string) => void
}

export function OperationalFlowCanvas({
  snapshot,
  selectedNodeId,
  showImpact,
  showAssertions,
  onSelectNode,
}: Props) {
  const unsupportedNode = snapshot.nodes.find((node) => !POSITIONS[node.node_id])
  if (unsupportedNode) {
    return (
      <div className="mc-flow-projection-error" role="alert">
        {unsupportedNode.label} todavía no dispone de una representación visual autorizada.
      </div>
    )
  }
  const orderedNodes = orderNodesForReading(snapshot.nodes)
  const eventHasActiveImpact = snapshot.active_event
    && !['NORMALIZED', 'CLOSED'].includes(snapshot.active_event.status)
  const impactedNodeIds = new Set(eventHasActiveImpact ? snapshot.active_event?.affected_node_ids ?? [] : [])

  const handleNodeKey = (event: KeyboardEvent<SVGGElement>, nodeId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelectNode(nodeId)
    }
  }

  return (
    <>
      <svg
        className="mc-flow-canvas"
        viewBox="0 0 1116 556"
        role="group"
        aria-labelledby="mc-flow-title mc-flow-description"
      >
        <title id="mc-flow-title">Cadena operacional conectada</title>
        <desc id="mc-flow-description">
          Frente 03 alimenta PH03, que carga seis CAEX. Los CAEX atraviesan Ruta Norte hacia Chancador 01. El desempeño de ciclo condiciona tonelaje, plan e impacto de costo.
        </desc>
        <defs>
          <marker id="mc-arrow-default" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
          <marker id="mc-arrow-impact" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
          <marker id="mc-arrow-hypothesis" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>

        <g className="mc-flow-lanes" aria-hidden="true">
          <text x="34" y="42">EXTRACCIÓN</text>
          <text x="250" y="42">CARGUÍO</text>
          <text x="466" y="42">TRANSPORTE</text>
          <text x="898" y="42">DESTINO</text>
          <text x="682" y="410">RESULTADO</text>
        </g>

        <g className="mc-flow-edges" aria-hidden="true">
          {snapshot.relationships.map((edge) => {
            const path = edgePath(edge)
            if (!path) return null
            const contextual = edge.source_node_id === selectedNodeId || edge.target_node_id === selectedNodeId
            const preserveOperationalImpact = showImpact && edge.impacted
            return (
              <g
                key={edge.relationship_id}
                className={`mc-flow-edge-group${contextual ? ' is-contextual' : preserveOperationalImpact ? '' : ' is-muted'}`}
                data-relationship-id={edge.relationship_id}
              >
                <path
                  className={`mc-flow-edge mc-flow-edge--${edge.assertion_type.toLowerCase()}${showImpact && edge.impacted ? ' is-impacted' : ''}`}
                  d={path}
                  markerEnd={`url(#${markerId(edge, showImpact)})`}
                />
                {showAssertions && (
                  <text className="mc-flow-edge-label">
                    <textPath href={`#label-${edge.relationship_id}`} startOffset="50%">{edge.label}</textPath>
                  </text>
                )}
                <path id={`label-${edge.relationship_id}`} d={path} fill="none" stroke="none" />
              </g>
            )
          })}
        </g>

        <g className="mc-flow-nodes">
          {orderedNodes.map((node) => {
            const position = POSITIONS[node.node_id]
            const selected = node.node_id === selectedNodeId
            const impacted = showImpact && impactedNodeIds.has(node.node_id)
            return (
              <g
                key={node.node_id}
                data-node-id={node.node_id}
                className={`mc-flow-node mc-flow-node--${node.condition.toLowerCase()} mc-flow-node--${node.node_role.toLowerCase()}${selected ? ' is-selected' : ''}`}
                transform={`translate(${position.x} ${position.y})`}
                role="button"
                tabIndex={0}
                aria-label={`${node.label}. ${node.summary}. ${assertionShortLabel(node.assertion_type)}.${impacted ? ' Impactado por el evento activo.' : ''}`}
                aria-pressed={selected}
                onClick={() => onSelectNode(node.node_id)}
                onKeyDown={(event) => handleNodeKey(event, node.node_id)}
              >
                <rect className="mc-flow-node__surface" width={NODE_WIDTH} height={NODE_HEIGHT} rx="10" />
                <g className="mc-flow-node__mark" transform="translate(16 17)">{conditionShape(node.condition)}</g>
                <text className="mc-flow-node__label" x="42" y="28">{node.label}</text>
                <text className="mc-flow-node__summary" x="16" y="57">{node.summary}</text>
                {showAssertions && <text className="mc-flow-node__assertion" x="16" y="77">{assertionShortLabel(node.assertion_type)}</text>}
              </g>
            )
          })}
        </g>
      </svg>

      <ol className="mc-flow-mobile-chain" aria-label="Cadena operacional conectada">
        {orderedNodes.map((node) => {
          const impacted = showImpact && impactedNodeIds.has(node.node_id)
          return (
            <li key={node.node_id} className={impacted ? 'is-impacted' : ''}>
              <button
                type="button"
                className={`mc-flow-mobile-node mc-flow-mobile-node--${node.condition.toLowerCase()}${node.node_id === selectedNodeId ? ' is-selected' : ''}${impacted ? ' is-impacted' : ''}`}
                aria-pressed={node.node_id === selectedNodeId}
                aria-label={`${node.label}. ${node.summary}. ${assertionShortLabel(node.assertion_type)}.${impacted ? ' Impactado por el evento activo.' : ''}`}
                onClick={() => onSelectNode(node.node_id)}
              >
                <span>{node.label}</span>
                {impacted && <em className="mc-flow-mobile-node__impact">Impactado</em>}
                <strong>{node.summary}</strong>
                {showAssertions && <small>{assertionShortLabel(node.assertion_type)}</small>}
              </button>
            </li>
          )
        })}
      </ol>
    </>
  )
}
