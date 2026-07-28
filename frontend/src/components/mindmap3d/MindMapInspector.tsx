import { ExternalLink, GitBranch, Info, Link2 } from 'lucide-react'
import type { MindMapEdge, MindMapGraph, MindMapNode } from './mindMapModel'
import { useModuleT } from '../../i18n/useModuleT'
import { mindmap3dT, type MindMap3dT } from '../../i18n/modules/mindmap3d'

interface Props {
  graph: MindMapGraph
  selectedNodeId: string | null
}

// Ancla del cockpit operacional que mejor representa cada categoria del mapa.
const cockpitSectionByCategory: Record<string, string> = {
  OPERATION: 'sec-turno',
  PRODUCTION: 'sec-produccion',
  FLEET: 'sec-equipos',
  LOADING: 'sec-equipos',
  ECONOMY: 'sec-decisiones',
  RISK: 'sec-decisiones',
  INTELLIGENCE: 'sec-decisiones',
  MONTHLY_TARGET: 'sec-mensual',
}

function renderMetadata(t: MindMap3dT, value: MindMapNode['metadata'][string]) {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? t.inspector_si : t.inspector_no
  if (value === null || value === undefined || value === '') return t.inspector_no_disponible
  return String(value)
}

function relationLabel(edge: MindMapEdge, node: MindMapNode, graph: MindMapGraph): string {
  const otherId = edge.source === node.id ? edge.target : edge.source
  const other = graph.nodes.find(item => item.id === otherId)
  return `${edge.type} - ${other?.label ?? otherId}`
}

export function MindMapInspector({ graph, selectedNodeId }: Props) {
  const t = useModuleT(mindmap3dT)
  const selected = graph.nodes.find(node => node.id === selectedNodeId) ?? graph.nodes[0] ?? null
  const relations = selected
    ? graph.edges.filter(edge => edge.source === selected.id || edge.target === selected.id).slice(0, 10)
    : []

  if (!selected) {
    return (
      <aside className="nm-map-inspector">
        <div className="nm-map-empty">
          <Info size={18} />
          {t.inspector_sin_nodos}
        </div>
      </aside>
    )
  }

  const metadata = Object.entries(selected.metadata).filter(([, value]) => value !== undefined && value !== null && value !== '')
  const cockpitSection = cockpitSectionByCategory[selected.category] ?? 'sec-turno'

  return (
    <aside className="nm-map-inspector" aria-label={t.inspector_aria_label}>
      <div className="nm-map-inspector-header">
        <span>{selected.type}</span>
        <h2>{selected.label}</h2>
        <p>{selected.displayValue ?? t.inspector_sin_valor}</p>
        <button
          className="nm-map-cockpit-link"
          type="button"
          onClick={() => {
            window.location.href = `/cockpit#${cockpitSection}`
          }}
        >
          <ExternalLink size={13} />
          {t.inspector_ver_cockpit}
        </button>
      </div>

      <div className="nm-map-inspector-kpis">
        <article>
          <span>{t.inspector_estado}</span>
          <strong>{selected.status}</strong>
        </article>
        <article>
          <span>{t.inspector_riesgo}</span>
          <strong>{Math.round(selected.risk * 100)}%</strong>
        </article>
        <article>
          <span>{t.inspector_importancia}</span>
          <strong>{Math.round(selected.importance * 100)}%</strong>
        </article>
      </div>

      <div className="nm-map-inspector-section">
        <h3><Info size={14} /> {t.inspector_fuente}</h3>
        <p><strong>{selected.data_source}</strong></p>
        <p>{selected.sourceEndpoint ?? t.inspector_fuente_agregada}</p>
        <p>{selected.generated_at ?? graph.generated_at}</p>
      </div>

      {metadata.length > 0 && (
        <div className="nm-map-inspector-section">
          <h3><GitBranch size={14} /> {t.inspector_evidencia}</h3>
          {metadata.slice(0, 10).map(([key, value]) => (
            <p key={key}>
              <span>{key.replace(/_/g, ' ')}</span>
              <strong>{renderMetadata(t, value)}</strong>
            </p>
          ))}
        </div>
      )}

      <div className="nm-map-inspector-section">
        <h3><Link2 size={14} /> {t.inspector_relaciones}</h3>
        {relations.length === 0 ? (
          <p>{t.inspector_sin_relaciones}</p>
        ) : relations.map(edge => (
          <p key={edge.id}>
            <span>{relationLabel(edge, selected, graph)}</span>
            <strong>{Math.round(edge.weight * 100)}%</strong>
          </p>
        ))}
      </div>
    </aside>
  )
}
