import { SaaSHeader } from './SaaSHeader'
import { SaaSHero } from './SaaSHero'
import { ProductStage } from './ProductStage'
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

export function SaaSPrototypePage() {
  return (
    <div className="nm-saas">
      <SaaSHeader />
      <main id="ns-contenido">
        <SaaSHero />
        <ProductStage />
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
