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
import { usePointerInteractions } from '../../../lib/animation/effects'
import { useModuleT } from '../../../i18n/useModuleT'
import { landingT } from '../../../i18n/modules/landing'
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
  const t = useModuleT(landingT)
  const scope = usePointerInteractions<HTMLDivElement>()

  return (
    <div className="nm-saas" ref={scope}>
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
            <p className="mono-label">{t.evidence.kicker}</p>
            <h2 id="ns-evidence-title">{t.evidence.title}</h2>
            <p>
              {t.evidence.body}
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
