import type { ReactNode } from 'react'
import { useModuleT } from '../../i18n/useModuleT'
import { filtersT } from '../../i18n/modules/filters'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function FilterDrawer({ open, onClose, children }: Props) {
  const t = useModuleT(filtersT)
  if (!open) return null
  return (
    <div className="analysis-filter-drawer" role="dialog" aria-modal="true" aria-label={t.advancedFilters}>
      <button type="button" className="analysis-filter-drawer-backdrop" onClick={onClose} aria-label={t.closeFiltersAria} />
      <div className="analysis-filter-drawer-panel">
        {children}
      </div>
    </div>
  )
}
