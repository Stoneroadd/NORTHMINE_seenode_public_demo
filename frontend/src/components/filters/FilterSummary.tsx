import { useMemo } from 'react'
import { useModuleT } from '../../i18n/useModuleT'
import { filtersT } from '../../i18n/modules/filters'
import { FilterChip } from './FilterChip'
import { buildFilterLabels, type AnalysisFilters } from './filterTypes'

interface Props {
  filters: AnalysisFilters
  onRemove?: (key: keyof AnalysisFilters) => void
}

export function FilterSummary({ filters, onRemove }: Props) {
  const t = useModuleT(filtersT)
  const filterLabels = useMemo(() => buildFilterLabels(t), [t])
  const entries = Object.entries(filters).filter(([, value]) => value)
  if (!entries.length) {
    return <span className="analysis-filter-empty">{t.noActiveFilters}</span>
  }

  return (
    <div className="analysis-filter-summary" aria-label={t.activeFiltersAria}>
      <span>{t.filteredBy}</span>
      {entries.map(([key, value]) => (
        <FilterChip
          key={key}
          label={filterLabels[key as keyof AnalysisFilters]}
          value={String(value)}
          onRemove={onRemove ? () => onRemove(key as keyof AnalysisFilters) : undefined}
        />
      ))}
    </div>
  )
}
