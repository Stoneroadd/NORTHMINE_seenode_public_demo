import { NorthminePrototype } from '../components/brand-prototype/NorthminePrototype'
import { PublicPageMeta } from '../components/landing/PublicPageMeta'

export function BrandPrototypePage() {
  return (
    <>
      <PublicPageMeta
        title="Prototipo de marca | NORTHMINE Intelligence"
        description="Prototipo interno de identidad editorial para NORTHMINE Intelligence. No publicado."
        robots="noindex,nofollow"
      />
      <NorthminePrototype />
    </>
  )
}
