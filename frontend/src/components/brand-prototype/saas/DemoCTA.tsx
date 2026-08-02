export function DemoCTA() {
  return (
    <section className="ns-cta" id="cta" aria-labelledby="ns-cta-title">
      <div className="ns-cta__glow" aria-hidden="true" />
      <div className="ns-saas__shell ns-cta__inner">
        <h2 id="ns-cta-title" className="ns-cta__title">
          Vea NORTHMINE operando con contexto.
        </h2>
        <p className="ns-cta__lead">
          Solicite acceso al entorno demostrativo y explore el Cockpit, los
          equipos y el Mapa Operacional 3D.
        </p>
        <div className="ns-cta__actions">
          <a className="ns-btn ns-btn--primary" href="/solicitar-demo">
            Solicitar acceso
          </a>
          <a className="ns-btn ns-btn--ghost" href="/acceso-demo">
            Acceder al demo
          </a>
        </div>
      </div>
    </section>
  )
}
