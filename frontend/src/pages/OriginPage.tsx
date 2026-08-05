import { OriginStoryPage } from '../components/brand-prototype/origin/OriginStoryPage'
import { PublicPageMeta } from '../components/landing/PublicPageMeta'
import { useModuleT } from '../i18n/useModuleT'
import { originT } from '../i18n/modules/origin'

export function OriginPage() {
  const t = useModuleT(originT)
  return (
    <>
      <PublicPageMeta
        title={t.meta.title}
        description={t.meta.description}
        robots="index,follow"
      />
      <OriginStoryPage />
    </>
  )
}
