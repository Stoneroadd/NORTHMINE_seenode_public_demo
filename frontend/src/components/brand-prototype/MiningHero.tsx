import { motion, useReducedMotion } from 'framer-motion'

export function MiningHero() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="nmp-hero" aria-labelledby="nmp-hero-title">
      <div className="nmp-hero__grid">
        <div className="nmp-hero__copy">
          <p className="mono-label nmp-hero__eyebrow">Inteligencia operacional minera</p>
          <motion.h1
            id="nmp-hero-title"
            className="nmp-hero__title"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            Del terreno a la decisión.
          </motion.h1>
          <p className="nmp-hero__lead">
            NORTHMINE relaciona producción, flota, carguío y riesgo para
            convertir señales operacionales dispersas en decisiones
            comprensibles.
          </p>
          <div className="nmp-hero__actions">
            <a className="nmp-btn nmp-btn--primary" href="#momento-4">
              Explorar NORTHMINE
            </a>
            <a className="nmp-btn nmp-btn--quiet" href="/solicitar-demo">
              Solicitar acceso
            </a>
          </div>
          <p className="nmp-hero__disclosure mono-label">
            Entorno demostrativo · datos sintéticos identificados
          </p>
        </div>

        <div className="nmp-hero__figure">
          <img
            className="nmp-hero__image"
            src="/assets/landing/open-pit-blue-hour-synthetic.webp"
            srcSet="/assets/landing/open-pit-blue-hour-synthetic-900.webp 900w, /assets/landing/open-pit-blue-hour-synthetic.webp 1600w"
            sizes="(max-width: 900px) 100vw, 56vw"
            alt=""
            width="1600"
            height="900"
            fetchPriority="high"
            aria-hidden="true"
          />
          <div className="nmp-hero__coordinates mono-label" aria-hidden="true">
            <span>E 491 496</span>
            <span>N 7 449 154</span>
            <span>RL 2 424</span>
          </div>
        </div>
      </div>

      <a className="nmp-hero__scroll mono-label" href="#momento-2" aria-label="Ir al siguiente momento">
        <span>Desplázate</span>
        <svg viewBox="0 0 16 24" width="12" height="18" aria-hidden="true">
          <path d="M8 2 L8 20 M2 14 L8 20 L14 14" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </a>
    </section>
  )
}
