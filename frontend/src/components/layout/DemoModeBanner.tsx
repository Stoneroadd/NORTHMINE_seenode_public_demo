import { FlaskConical } from 'lucide-react'
import { FAST_PUBLIC_DEMO } from '../../demo/fastDemo'
import { settingsService } from '../../services/settingsService'
import { useModuleT } from '../../i18n/useModuleT'
import { layoutT } from '../../i18n/modules/layout'

export function DemoModeBanner() {
  const t = useModuleT(layoutT)
  const isDemo = FAST_PUBLIC_DEMO || settingsService.isDemoLike
  if (!isDemo) return null
  return (
    <div className="demo-mode-banner" role="note">
      <FlaskConical size={13} aria-hidden="true" />
      <span>{t.demo_banner}</span>
    </div>
  )
}
