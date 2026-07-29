import { CircleAlert } from 'lucide-react'
import { useModuleT } from '../../i18n/useModuleT'
import { commonT } from '../../i18n/modules/common'

export function ErrorState({ title, detail }: { title?: string; detail?: string }) {
  const t = useModuleT(commonT)
  return (
    <div className="state-card error-state">
      <CircleAlert size={30} />
      <h3>{title ?? t.errorStateTitle}</h3>
      <p>{detail ?? t.errorStateDetail}</p>
    </div>
  )
}

