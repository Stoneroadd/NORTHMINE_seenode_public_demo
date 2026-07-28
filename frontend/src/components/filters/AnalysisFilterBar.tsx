import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, X } from 'lucide-react'
import { getFilterCatalog } from '../../services/filterCatalogService'
import { useModuleT } from '../../i18n/useModuleT'
import { filtersT } from '../../i18n/modules/filters'
import { FilterSummary } from './FilterSummary'
import { buildDefaultFilterFields, type AnalysisFilterKey, type AnalysisFilters, type FilterCatalog, type FilterFieldConfig } from './filterTypes'

interface Props {
  title?: string
  fields?: AnalysisFilterKey[]
  advancedMode?: 'drawer' | 'inline'
  compactMode?: boolean
  draftFilters: AnalysisFilters
  appliedFilters: AnalysisFilters
  activeCount: number
  setFilter: (key: AnalysisFilterKey, value: string) => void
  applyFilters: () => void
  clearFilters: () => void
  removeFilter?: (key: AnalysisFilterKey) => void
  loading?: boolean
  showEmptySummary?: boolean
}

function optionsFor(field: FilterFieldConfig, catalog: FilterCatalog | undefined) {
  if (!field.catalogKey || !catalog) return []
  return catalog[field.catalogKey] ?? []
}

function FilterControl({
  field,
  catalog,
  value,
  onChange,
  allLabel,
}: {
  field: FilterFieldConfig
  catalog?: FilterCatalog
  value?: string
  onChange: (value: string) => void
  allLabel: string
}) {
  if (field.type === 'date') {
    return (
      <label className="analysis-filter-control compact">
        <span>{field.label}</span>
        <input type="date" value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
      </label>
    )
  }

  return (
    <label className={`analysis-filter-control ${field.compact ? 'compact' : ''}`}>
      <span>{field.label}</span>
      <select value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">{field.allLabel ?? allLabel}</option>
        {optionsFor(field, catalog).map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

export function AnalysisFilterBar({
  title,
  fields,
  compactMode = false,
  draftFilters,
  appliedFilters,
  activeCount,
  setFilter,
  applyFilters,
  clearFilters,
  removeFilter,
  loading,
  showEmptySummary = true,
}: Props) {
  const t = useModuleT(filtersT)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const catalogQuery = useQuery({ queryKey: ['filters-catalog'], queryFn: getFilterCatalog, staleTime: 10 * 60 * 1000 })
  const defaultFilterFields = useMemo(() => buildDefaultFilterFields(t), [t])
  const fieldConfig = useMemo(
    () => (key: AnalysisFilterKey) => defaultFilterFields.find((field) => field.key === key) ?? { key, label: key },
    [defaultFilterFields],
  )
  const selectedFields = useMemo(
    () => (fields ?? defaultFilterFields.map((field) => field.key)).map(fieldConfig),
    [fields, defaultFilterFields, fieldConfig],
  )
  const primaryFields = selectedFields.filter((field) => field.compact).slice(0, 4)
  const advancedFields = selectedFields.filter((field) => !primaryFields.includes(field))
  const visibleAdvancedFields = advancedFields.slice(0, 3)
  const hiddenAdvancedFields = advancedFields.slice(3)
  const expandedFields = compactMode ? selectedFields : hiddenAdvancedFields.length ? hiddenAdvancedFields : advancedFields

  const controls = (items: FilterFieldConfig[]) => items.map((field) => (
    <FilterControl
      key={field.key}
      field={field}
      catalog={catalogQuery.data}
      value={draftFilters[field.key]}
      onChange={(value) => setFilter(field.key, value)}
      allLabel={t.all}
    />
  ))

  return (
    <section className={`analysis-filter-bar is-inline-advanced ${compactMode ? 'is-command-compact' : ''}`}>
      <div className="analysis-filter-head">
        <div>
          <span className="panel-kicker">{title ?? t.barTitle}</span>
          <strong>{t.activeFilters(activeCount)}</strong>
        </div>
        <div className="analysis-filter-actions">
          <button
            type="button"
            className="command-button command-button-secondary"
            onClick={() => setAdvancedOpen((open) => !open)}
            aria-expanded={advancedOpen}
          >
            <SlidersHorizontal size={15} /> {advancedOpen ? t.hideFilters : t.moreFilters}
          </button>
          <button type="button" className="command-button command-button-secondary" onClick={clearFilters}>
            <X size={15} /> {t.clear}
          </button>
          <button type="button" className="command-button command-button-matrix" onClick={applyFilters} disabled={loading}>
            {loading ? t.applying : t.apply}
          </button>
        </div>
      </div>

      <div className="analysis-filter-controls">
        {controls(primaryFields)}
        {visibleAdvancedFields.map((field) => (
          <div key={field.key} className="analysis-filter-wide">
            <FilterControl
              field={field}
              catalog={catalogQuery.data}
              value={draftFilters[field.key]}
              onChange={(value) => setFilter(field.key, value)}
              allLabel={t.all}
            />
          </div>
        ))}
      </div>

      {(showEmptySummary || activeCount > 0) && (
        <FilterSummary
          filters={appliedFilters}
          onRemove={removeFilter}
        />
      )}

      {advancedOpen && (
        <div className="analysis-filter-inline-panel" aria-label={t.advancedFiltersAria}>
          <div className="analysis-filter-drawer-header">
            <div><span className="panel-kicker">{t.commandFilters}</span><h2>{t.advancedFiltersInline}</h2></div>
            <button type="button" onClick={() => setAdvancedOpen(false)}>{t.close}</button>
          </div>
          <div className="analysis-filter-drawer-grid">
            {controls(expandedFields)}
          </div>
          <div className="analysis-filter-drawer-footer">
            <button type="button" className="command-button command-button-secondary" onClick={clearFilters}>{t.clear}</button>
            <button type="button" className="command-button command-button-matrix" onClick={() => { applyFilters(); setAdvancedOpen(false) }}>{t.apply}</button>
          </div>
        </div>
      )}

    </section>
  )
}
