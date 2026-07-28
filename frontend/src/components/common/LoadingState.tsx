import { Loader2 } from 'lucide-react'
import { useModuleT } from '../../i18n/useModuleT'
import { commonT } from '../../i18n/modules/common'

export function LoadingState({ label }: { label?: string }) {
  const t = useModuleT(commonT)
  return (
    <div className="state-card">
      <Loader2 className="spin-icon" size={28} />
      <span>{label ?? t.loadingStateLabel}</span>
    </div>
  )
}

