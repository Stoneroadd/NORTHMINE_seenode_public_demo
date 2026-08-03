import { SaaSPrototypePage } from '../components/brand-prototype/saas/SaaSPrototypePage'
import { PublicPageMeta } from '../components/landing/PublicPageMeta'

export function BrandPrototypePage() {
  return (
    <>
      <PublicPageMeta
        title="Prototipo de marca | NORTHMINE Intelligence"
        description="Prototipo interno de landing SaaS para NORTHMINE Intelligence. No publicado."
        robots="noindex,nofollow"
      />
      <SaaSPrototypePage />
    </>
  )
}
