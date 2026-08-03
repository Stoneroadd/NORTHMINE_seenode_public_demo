import { ScrollProgress } from './ScrollProgress'
import { SaaSHeader } from './SaaSHeader'
import { SaaSHero } from './SaaSHero'
import { ProductStage } from './ProductStage'
import { MineIntelligenceBand } from './MineIntelligenceBand'
import { TrustStrip } from './TrustStrip'
import { OperationalReading } from './OperationalReading'
import { DemoMetrics } from './DemoMetrics'
import { ModuleGallery } from './ModuleGallery'
import { OperationalBenefits } from './OperationalBenefits'
import { DecisionFlow } from './DecisionFlow'
import { SecurityTransparency } from './SecurityTransparency'
import { DemoCTA } from './DemoCTA'
import { SaaSFooter } from './SaaSFooter'
import '../../../styles/northmine-saas-tokens.css'
import '../../../styles/northmine-saas-layout.css'
import '../../../styles/northmine-saas-motion.css'
import '../../../styles/northmine-saas-responsive.css'

/*
 * THESIS: NORTHMINE sells connected operational judgment, not another dashboard grid.
 * OWN-WORLD: graphite control-room fields, copper actions, cinematic mine scale and real product evidence.
 * STORY: recognize fragmented signals, see them converge, inspect the platform, request a controlled demo.
 * FIRST VIEWPORT: left-aligned value proposition over a full-scale dozer and pit, followed immediately by the product.
 * FORM: premium B2B mining campaign with scroll-linked geological depth and restrained operational motion.
 */
export function SaaSPrototypePage() {
  return (
    <div className="nm-saas">
      <ScrollProgress />
      <SaaSHeader />
      <main id="ns-contenido">
        <SaaSHero />
        <ProductStage />
        <MineIntelligenceBand />
        <TrustStrip />
        <OperationalReading />
        <DemoMetrics />
        <ModuleGallery />
        <OperationalBenefits />
        <DecisionFlow />
        <SecurityTransparency />
        <DemoCTA />
      </main>
      <SaaSFooter />
    </div>
  )
}
