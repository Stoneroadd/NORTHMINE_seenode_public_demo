import { CircleDashed, DatabaseZap } from 'lucide-react'
import type { MindMapGraph } from './mindMapModel'
import { categoryDefinitions } from './mindMapModel'
import { getCategoryColor } from './mindMapLayout'
import { useModuleT } from '../../i18n/useModuleT'
import { mindmap3dT } from '../../i18n/modules/mindmap3d'
import { categoryLabel } from './MindMapFilters'

interface Props {
  graph: MindMapGraph
  isFetching: boolean
}

function sourceClass(dataSource: string) {
  const normalized = dataSource.toLowerCase()
  if (normalized === 'real') return 'is-real'
  if (normalized === 'demo') return 'is-demo'
  if (normalized === 'estimado' || normalized === 'mixed') return 'is-estimated'
  return 'is-partial'
}

export function MindMapLegend({ graph, isFetching }: Props) {
  const t = useModuleT(mindmap3dT)
  return (
    <div className="nm-map-legend">
      <div className="nm-map-source-row">
        <span className={`nm-map-source-pill ${sourceClass(graph.data_source)}`}>
          <DatabaseZap size={14} />
          {graph.data_source}
        </span>
        <span>
          {t.legend_modulos(graph.metadata.modules_loaded, graph.metadata.modules_requested)}
        </span>
        <span>
          {isFetching ? <CircleDashed size={13} className="is-spinning" /> : null}
          {graph.status}
        </span>
      </div>
      <div className="nm-map-legend-grid">
        {categoryDefinitions.map(category => (
          <span key={category.id}>
            <i style={{ background: getCategoryColor(category.id) }} />
            {categoryLabel(t, category.id, category.label)}
          </span>
        ))}
      </div>
      <div className="nm-map-shape-legend" aria-label={t.legend_formas_aria}>
        <span className="nm-map-shape-title">{t.legend_formas_titulo}</span>
        <div className="nm-map-shape-grid">
          <span>
            <svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="2" width="8" height="8" rx="1" /></svg>
            {t.legend_shape_caex}
          </span>
          <span>
            <svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.4" y="2.4" width="7.2" height="7.2" rx="1" transform="rotate(45 6 6)" /></svg>
            {t.legend_shape_pala_uc}
          </span>
          <span>
            <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2 L10.5 10 H1.5 Z" fill="none" strokeWidth="1.4" /></svg>
            {t.legend_shape_destino}
          </span>
          <span>
            <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5 L10.8 10.2 H1.2 Z" /></svg>
            {t.legend_shape_riesgo_alerta}
          </span>
          <span>
            <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1 L10.8 4.6 L9 10.4 H3 L1.2 4.6 Z" /></svg>
            {t.legend_shape_meta}
          </span>
          <span>
            <svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.2" /></svg>
            {t.legend_shape_kpi}
          </span>
        </div>
      </div>
      {graph.metadata.api_errors.length > 0 && (
        <div className="nm-map-partial-note">
          {t.legend_partial_note(graph.metadata.api_errors.length)}
        </div>
      )}
    </div>
  )
}
