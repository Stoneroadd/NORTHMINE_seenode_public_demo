import { ScrollProgress } from './ScrollProgress'
import { SaaSHeader } from './SaaSHeader'
import { SaaSHero } from './SaaSHero'
import { NorthmineDefinition } from './NorthmineDefinition'
import { ProductStage } from './ProductStage'
import { MineIntelligenceBand } from './MineIntelligenceBand'
import { ProblemSolution } from './ProblemSolution'
import { FMSComplement } from './FMSComplement'
import { ArchitectureDiagram } from './ArchitectureDiagram'
import { FMSComparison } from './FMSComparison'
import { IntelligenceLevels } from './IntelligenceLevels'
import { OperationalFlowOverview } from './OperationalFlowOverview'
import { DecisionFlow } from './DecisionFlow'
import { DecisionCases } from './DecisionCases'
import { ResponsibleAI } from './ResponsibleAI'
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
 * THESIS: NORTHMINE is an Operational Intelligence Layer that complements FMS
 * platforms (Wenco, Modular, MineStar, Hexagon) — it does not replace them.
 * STORY: what NORTHMINE is -> problem -> positioning -> how it connects ->
 * what it adds -> how it reasons -> how it works -> concrete decisions ->
 * real product evidence -> responsible-AI boundaries -> integration security
 * -> public demo -> request evaluation.
 * FORM: premium B2B mining campaign with scroll-linked geological depth and
 * restrained operational motion; no new animation dependency was added.
 * Product evidence stays to the single Decision Cockpit capture in
 * ProductStage per DESIGN.md — no module-catalogue grid on the public page.
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
        <ProblemSolution />
        <FMSComplement />
        <ArchitectureDiagram />
        <FMSComparison />
        <IntelligenceLevels />
        <OperationalFlowOverview />
        <DecisionFlow />
        <DecisionCases />
        <MineIntelligenceBand />
        <section className="ns-evidence" id="modulos" aria-labelledby="ns-evidence-title">
          <div className="ns-saas__shell ns-evidence__head">
            <p className="mono-label">{t.evidence.kicker}</p>
            <h2 id="ns-evidence-title">{t.evidence.title}</h2>
            <p>
              {t.evidence.body}
            </p>
          </div>
          <ProductStage />
        </section>
        <ResponsibleAI />
        <SecurityTransparency />
        <DemoCTA />
      </main>
      <SaaSFooter />
    </div>
  )
}
