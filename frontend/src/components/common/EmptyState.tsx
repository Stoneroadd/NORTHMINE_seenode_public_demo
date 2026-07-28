import { Inbox } from 'lucide-react'
import { useModuleT } from '../../i18n/useModuleT'
import { commonT } from '../../i18n/modules/common'

export function EmptyState({ title, detail }: { title?: string; detail?: string }) {
  const t = useModuleT(commonT)
  return (
    <div className="state-card empty-state-card">
      <Inbox size={30} />
      <h3>{title ?? t.emptyStateTitle}</h3>
      <p>{detail ?? t.emptyStateDetail}</p>
    </div>
  )
}

