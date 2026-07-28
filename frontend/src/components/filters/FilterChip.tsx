import { useModuleT } from '../../i18n/useModuleT'
import { filtersT } from '../../i18n/modules/filters'

interface Props {
  label: string
  value: string
  onRemove?: () => void
}

export function FilterChip({ label, value, onRemove }: Props) {
  const t = useModuleT(filtersT)
  return (
    <span className="analysis-filter-chip">
      <small>{label}</small>
      <strong>{value}</strong>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={t.removeFilterAria(label)}>
          x
        </button>
      )}
    </span>
  )
}
