import { useArchitectureTimeline } from '../../../lib/animation/effects'
import { useModuleT } from '../../../i18n/useModuleT'
import { landingT, landingFallback } from '../../../i18n/modules/landing'

export function ArchitectureDiagram() {
  const t = useModuleT(landingT)
  const architecture = landingFallback(t, 'architecture')
  const scope = useArchitectureTimeline<HTMLElement>()

  return (
    <section ref={scope} className="ns-arch" aria-labelledby="ns-arch-title">
      <div className="ns-saas__shell">
        <div className="ns-arch__head" data-arch-fade>
          <p className="mono-label">{architecture.kicker}</p>
          <h2 id="ns-arch-title">{architecture.title}</h2>
        </div>

        <ol className="ns-arch__stages" aria-label={architecture.title}>
          {architecture.stages.map((stage, index) => (
            <li key={stage.label} className="ns-arch__stage" data-arch-stage>
              <div className="ns-arch__node" data-arch-marker>
                <svg viewBox="0 0 32 32" aria-hidden="true" className="ns-arch__node-ring">
                  <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1" />
                </svg>
                <span className="mono-label">{String(index + 1).padStart(2, '0')}</span>
                {index < architecture.stages.length - 1 && (
                  <svg viewBox="0 0 24 64" aria-hidden="true" className="ns-arch__connector" data-arch-connector>
                    <line x1="12" y1="0" x2="12" y2="52" pathLength="1" stroke="currentColor" strokeWidth="1" />
                    <path d="M6 46 L12 56 L18 46" pathLength="1" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                )}
              </div>
              <div className="ns-arch__copy" data-arch-copy>
                <h3>{stage.label}</h3>
                <p>{stage.sublabel}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="ns-arch__note" data-arch-fade>
          {architecture.note}
        </p>
      </div>
    </section>
  )
}
