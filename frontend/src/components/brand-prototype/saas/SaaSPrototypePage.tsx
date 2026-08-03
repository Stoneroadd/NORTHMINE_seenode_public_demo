import { ScrollProgress } from './ScrollProgress'
import { SaaSHeader } from './SaaSHeader'
import { SaaSHero } from './SaaSHero'
import { NorthmineDefinition } from './NorthmineDefinition'
import { ProductStage } from './ProductStage'
import { MineIntelligenceBand } from './MineIntelligenceBand'
import { ProblemSolution } from './ProblemSolution'
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
        <NorthmineDefinition />
        <MineIntelligenceBand />
        <ProblemSolution />
        <DecisionFlow />
        <OperationalBenefits />
        <section className="ns-evidence" aria-labelledby="ns-evidence-title">
          <div className="ns-saas__shell ns-evidence__head">
            <p className="mono-label">Evidencia del producto</p>
            <h2 id="ns-evidence-title">Una lectura ejecutiva, no otra colección de KPI.</h2>
            <p>
              El Decision Cockpit concentra estado, brecha, ritmo, riesgo y
              acción. Esta única captura usa datos sintéticos identificados.
            </p>
          </div>
          <ProductStage />
        </section>
        <SecurityTransparency />
        <DemoCTA />
      </main>
      <SaaSFooter />
    </div>
  )
}
