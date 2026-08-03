import { SaaSPrototypePage } from '../components/brand-prototype/saas/SaaSPrototypePage'
import { PublicPageMeta } from '../components/landing/PublicPageMeta'

export function BrandPrototypePage() {
  return (
    <>
      <PublicPageMeta
        title="NORTHMINE Intelligence | Decisiones operacionales mineras"
        description="NORTHMINE conecta producción, flota, carguío y riesgo para convertir señales operacionales dispersas en decisiones comprensibles y trazables."
        robots="index,follow"
      />
      <SaaSPrototypePage />
    </>
  )
}
