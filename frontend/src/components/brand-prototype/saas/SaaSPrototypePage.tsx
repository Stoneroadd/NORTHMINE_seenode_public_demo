import { AmbientWash } from './AmbientWash'
import { ScrollProgress } from './ScrollProgress'
import { CursorGlow } from './CursorGlow'
import { SaaSHeader } from './SaaSHeader'
import { SaaSHero } from './SaaSHero'
import { ProductStage } from './ProductStage'
import { TrustStrip } from './TrustStrip'
import { OperationalReading } from './OperationalReading'
import { DemoMetrics } from './DemoMetrics'
import { ModuleGallery } from './ModuleGallery'
import { TerrainMaterials } from './TerrainMaterials'
import { OperationalBenefits } from './OperationalBenefits'
import { DecisionFlow } from './DecisionFlow'
import { SecurityTransparency } from './SecurityTransparency'
import { DemoCTA } from './DemoCTA'
import { SaaSFooter } from './SaaSFooter'
import { usePointerInteractions } from '../../../lib/animation/effects'
import '../../../styles/northmine-saas-tokens.css'
import '../../../styles/northmine-saas-layout.css'
import '../../../styles/northmine-saas-motion.css'
import '../../../styles/northmine-saas-responsive.css'

export function SaaSPrototypePage() {
  const scope = usePointerInteractions<HTMLDivElement>()

  return (
    <div className="nm-saas" ref={scope}>
      <AmbientWash />
      <ScrollProgress />
      <CursorGlow />
      <SaaSHeader />
      <main id="ns-contenido">
        <SaaSHero />
        <ProductStage />
        <TrustStrip />
        <OperationalReading />
        <DemoMetrics />
        <ModuleGallery />
        <TerrainMaterials />
        <OperationalBenefits />
        <DecisionFlow />
        <SecurityTransparency />
        <DemoCTA />
      </main>
      <SaaSFooter />
    </div>
  )
}
