import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

interface NodeDefinition {
  id: string
  label: string
  routeId: string
  routePath: string
  size: number
  duration: string
  delay: string
  tone: 'truck' | 'loader'
  staticX: number
  staticY: number
}

const nodes: NodeDefinition[] = [
  {
    id: 'CAEX-2907',
    label: 'CAEX',
    routeId: 'route-haul-1',
    routePath: 'M128 430 L242 370 L340 386 L438 336 L566 278 L704 238 L872 286',
    size: 7,
    duration: '21s',
    delay: '-4s',
    tone: 'truck',
    staticX: 438,
    staticY: 336,
  },
  {
    id: 'CAEX-2965',
    label: 'CAEX',
    routeId: 'route-haul-2',
    routePath: 'M256 556 L356 486 L500 488 L604 420 L690 364 L746 330 L832 398',
    size: 6,
    duration: '28s',
    delay: '-12s',
    tone: 'truck',
    staticX: 604,
    staticY: 420,
  },
  {
    id: 'EX3600',
    label: 'UC',
    routeId: 'route-loader-1',
    routePath: 'M322 304 L406 286 L518 266 L622 244 L670 254 L704 276 L734 306',
    size: 10,
    duration: '34s',
    delay: '-7s',
    tone: 'loader',
    staticX: 622,
    staticY: 244,
  },
  {
    id: 'CF3672',
    label: 'UC',
    routeId: 'route-loader-2',
    routePath: 'M370 454 L470 424 L560 404 L654 374 L690 362 L724 372 L752 402',
    size: 9,
    duration: '38s',
    delay: '-20s',
    tone: 'loader',
    staticX: 654,
    staticY: 374,
  },
]

export function MovingEquipmentNodes() {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <svg className="moving-equipment-nodes" viewBox="0 0 1000 680" aria-hidden="true">
      <g className="equipment-route-traces">
        {nodes.map((node) => (
          <path key={node.routeId} d={node.routePath} />
        ))}
      </g>

      <g className="equipment-node-layer">
        {nodes.map((node) => (
          <g key={node.id} className={`equipment-node equipment-node-${node.tone}`}>
            {!reducedMotion && (
              <animateMotion
                dur={node.duration}
                begin={node.delay}
                repeatCount="indefinite"
                rotate="auto"
                path={node.routePath}
              />
            )}
            <circle
              cx={reducedMotion ? node.staticX : 0}
              cy={reducedMotion ? node.staticY : 0}
              r={node.size}
            />
            <circle
              cx={reducedMotion ? node.staticX : 0}
              cy={reducedMotion ? node.staticY : 0}
              r={node.size * 2.2}
              className="equipment-node-halo"
            />
            <text
              x={reducedMotion ? node.staticX + node.size + 8 : node.size + 8}
              y={reducedMotion ? node.staticY + 4 : 4}
            >
              {node.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
