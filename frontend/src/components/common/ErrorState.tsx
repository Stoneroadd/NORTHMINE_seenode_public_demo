import { CircleAlert, RefreshCcw } from 'lucide-react'
import { useModuleT } from '../../i18n/useModuleT'
import { commonT } from '../../i18n/modules/common'

export function ErrorState({
  title,
  detail,
  onRetry,
}: {
  title?: string
  detail?: string
  onRetry?: () => void
}) {
  const t = useModuleT(commonT)
  return (
    <div className="state-card error-state">
      <CircleAlert size={30} />
      <h3>{title ?? t.errorStateTitle}</h3>
      <p>{detail ?? t.errorStateDetail}</p>
      {onRetry && (
        <button type="button" className="command-button command-button-secondary" onClick={onRetry}>
          <RefreshCcw size={14} /> {t.retryAction}
        </button>
      )}
    </div>
  )
}
