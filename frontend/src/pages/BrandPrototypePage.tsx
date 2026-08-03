import { OriginStoryPage } from '../components/brand-prototype/origin/OriginStoryPage'
import { PublicPageMeta } from '../components/landing/PublicPageMeta'

export function BrandPrototypePage() {
  return (
    <>
      <PublicPageMeta
        title="ORIGIN | La historia de NORTHMINE Intelligence"
        description="Quince años de experiencia minera dieron origen a NORTHMINE, una plataforma de inteligencia operacional construida desde la operación."
        robots="index,follow"
      />
      <OriginStoryPage />
    </>
  )
}
