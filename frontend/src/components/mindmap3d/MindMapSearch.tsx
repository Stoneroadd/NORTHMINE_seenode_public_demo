import { Search, X } from 'lucide-react'
import type { MindMapNode } from './mindMapModel'
import { useModuleT } from '../../i18n/useModuleT'
import { mindmap3dT } from '../../i18n/modules/mindmap3d'

interface Props {
  nodes: MindMapNode[]
  value: string
  onChange: (value: string) => void
  onFocusNode: (nodeId: string) => void
  onClear: () => void
}

export function MindMapSearch({ nodes, value, onChange, onFocusNode, onClear }: Props) {
  const t = useModuleT(mindmap3dT)
  const normalized = value.trim().toLowerCase()
  const results = normalized
    ? nodes
      .filter(node => `${node.label} ${node.displayValue ?? ''} ${node.type} ${node.category}`.toLowerCase().includes(normalized))
      .slice(0, 8)
    : []

  return (
    <div className="nm-map-search">
      <label htmlFor="mindmap-search">
        <Search size={15} />
        {t.search_label}
      </label>
      <div className="nm-map-search-box">
        <input
          id="mindmap-search"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder="PALA 1, CAEX01, F01, Perdida oculta..."
          autoComplete="off"
        />
        {value && (
          <button type="button" onClick={onClear} aria-label={t.search_clear_aria}>
            <X size={15} />
          </button>
        )}
      </div>
      {results.length > 0 && (
        <div className="nm-map-search-results">
          {results.map(node => (
            <button key={node.id} type="button" onClick={() => onFocusNode(node.id)}>
              <strong>{node.label}</strong>
              <span>{node.type} - {node.category}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
