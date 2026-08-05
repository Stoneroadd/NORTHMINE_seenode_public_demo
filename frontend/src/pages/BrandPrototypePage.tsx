import { SaaSPrototypePage } from '../components/brand-prototype/saas/SaaSPrototypePage'
import { PublicPageMeta } from '../components/landing/PublicPageMeta'
import { useModuleT } from '../i18n/useModuleT'
import { landingT } from '../i18n/modules/landing'

export function BrandPrototypePage() {
  const t = useModuleT(landingT)

  return (
    <>
      <PublicPageMeta
        title={t.meta.title}
        description={t.meta.description}
        robots="index,follow"
      />
      <SaaSPrototypePage />
    </>
  )
}
