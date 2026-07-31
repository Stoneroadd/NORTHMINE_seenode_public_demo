import { ArrowDown, ArrowRight, Database, ShieldCheck } from 'lucide-react'

export function LandingHero() {
  return (
    <section className="nm-landing-hero" aria-labelledby="landing-title">
      <img
        className="nm-landing-hero__media"
        src="/assets/brand/fondo_login.png"
        alt=""
        width="1766"
        height="1075"
        fetchPriority="high"
      />
      <div className="nm-landing-hero__veil" aria-hidden="true" />
      <div className="nm-public-shell nm-landing-hero__content">
        <div className="nm-landing-hero__copy">
          <p className="nm-public-eyebrow">Control operacional minero</p>
          <h1 id="landing-title">NORTHMINE Intelligence</h1>
          <p className="nm-landing-hero__lead">
            Produccion, flota, riesgos y brechas de turno convertidos en
            decisiones operacionales trazables para mineria a cielo abierto.
          </p>
          <div className="nm-landing-hero__actions">
            <a className="nm-public-button nm-public-button--primary" href="/solicitar-demo">
              Solicitar acceso al demo <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className="nm-public-button nm-public-button--quiet" href="#capacidades">
              Conocer capacidades <ArrowDown size={18} aria-hidden="true" />
            </a>
          </div>
        </div>

        <dl className="nm-landing-hero__facts" aria-label="Alcance del demo">
          <div>
            <dt><Database size={16} aria-hidden="true" /> Datos del entorno</dt>
            <dd>Sinteticos y representativos</dd>
          </div>
          <div>
            <dt><ShieldCheck size={16} aria-hidden="true" /> Acceso</dt>
            <dd>Revision y habilitacion manual</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
