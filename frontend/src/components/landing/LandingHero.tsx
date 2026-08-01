import { ArrowDown, ArrowRight, Database, Route, ShieldCheck } from 'lucide-react'
import { StrataHeroVisual } from './StrataHeroVisual'

export function LandingHero() {
  return (
    <section className="nm-landing-hero" aria-labelledby="landing-title">
      <img
        className="nm-landing-hero__media"
        src="/assets/landing/open-pit-blue-hour-synthetic.webp"
        alt=""
        width="1600"
        height="900"
        fetchPriority="high"
        aria-hidden="true"
      />
      <div className="nm-landing-hero__veil" aria-hidden="true" />
      <div className="nm-public-shell nm-landing-hero__content">
        <div className="nm-landing-hero__copy">
          <p className="nm-public-eyebrow">Estratos de decision</p>
          <h1 id="landing-title">NORTHMINE Intelligence</h1>
          <p className="nm-landing-hero__positioning">
            Control operacional para mineria a cielo abierto.
          </p>
          <p className="nm-landing-hero__lead">
            Reune produccion, flota, carguio y riesgo para convertir la brecha
            del turno en una accion explicable y trazable.
          </p>
          <div className="nm-landing-hero__actions">
            <a className="nm-public-button nm-public-button--primary" href="/solicitar-demo">
              Solicitar acceso al demo <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className="nm-public-button nm-public-button--quiet" href="#capacidades">
              Explorar capacidades <ArrowDown size={18} aria-hidden="true" />
            </a>
          </div>
          <p className="nm-landing-hero__disclosure">
            Imagen y datos sinteticos. Acceso revisado manualmente.
          </p>
        </div>

        <StrataHeroVisual />

        <dl className="nm-landing-hero__facts" aria-label="Alcance del demo">
          <div>
            <dt><Database size={16} aria-hidden="true" /> Datos del entorno</dt>
            <dd>Sinteticos y representativos</dd>
          </div>
          <div>
            <dt><Route size={16} aria-hidden="true" /> Flujo</dt>
            <dd>Estado, brecha, causa y accion</dd>
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
