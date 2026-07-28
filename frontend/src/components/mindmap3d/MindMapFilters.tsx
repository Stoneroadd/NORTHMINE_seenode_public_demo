import type { MindMapCategory, MindMapNodeStatus } from './mindMapModel'
import { categoryDefinitions } from './mindMapModel'
import { useModuleT } from '../../i18n/useModuleT'
import { mindmap3dT, type MindMap3dT } from '../../i18n/modules/mindmap3d'

interface Props {
  visibleCategories: Set<MindMapCategory | 'ROOT'>
  visibleStatuses: Set<MindMapNodeStatus>
  onToggleCategory: (category: MindMapCategory | 'ROOT') => void
  onToggleStatus: (status: MindMapNodeStatus) => void
}

function buildStatuses(t: MindMap3dT): Array<{ id: MindMapNodeStatus; label: string }> {
  return [
    { id: 'NORMAL', label: t.status_normal },
    { id: 'ATTENTION', label: t.status_atencion },
    { id: 'CRITICAL', label: t.status_critico },
    { id: 'INACTIVE', label: t.status_inactivo },
    { id: 'UNKNOWN', label: t.status_sin_dato },
  ]
}

const categoryLabelKeys: Record<string, keyof MindMap3dT> = {
  OPERATION: 'cat_operation',
  PRODUCTION: 'cat_production',
  FLEET: 'cat_fleet',
  LOADING: 'cat_loading',
  ECONOMY: 'cat_economy',
  RISK: 'cat_risk',
  INTELLIGENCE: 'cat_intelligence',
  MONTHLY_TARGET: 'cat_monthly_target',
}

export function categoryLabel(t: MindMap3dT, categoryId: string, fallback: string): string {
  const key = categoryLabelKeys[categoryId]
  return key ? (t[key] as string) : fallback
}

export function MindMapFilters({ visibleCategories, visibleStatuses, onToggleCategory, onToggleStatus }: Props) {
  const t = useModuleT(mindmap3dT)
  const statuses = buildStatuses(t)
  return (
    <div className="nm-map-filters">
      <div>
        <span>{t.filters_categorias}</span>
        <div className="nm-map-filter-list">
          <button type="button" className={visibleCategories.has('ROOT') ? 'is-active' : ''} onClick={() => onToggleCategory('ROOT')}>
            {t.filters_centro}
          </button>
          {categoryDefinitions.map(category => (
            <button
              key={category.id}
              type="button"
              className={visibleCategories.has(category.id) ? 'is-active' : ''}
              onClick={() => onToggleCategory(category.id)}
            >
              {categoryLabel(t, category.id, category.label)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span>{t.filters_criticidad}</span>
        <div className="nm-map-filter-list">
          {statuses.map(status => (
            <button
              key={status.id}
              type="button"
              className={`is-status-${status.id.toLowerCase()} ${visibleStatuses.has(status.id) ? 'is-active' : ''}`}
              onClick={() => onToggleStatus(status.id)}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
