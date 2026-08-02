import { motion, useReducedMotion } from 'framer-motion'
import { PitContourField } from '../../landing/PitContourField'

export function SaaSHero() {
  const reduceMotion = useReducedMotion()
  const fadeUp = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  })

  return (
    <section className="ns-hero" id="hero" aria-labelledby="ns-hero-title">
      <div className="ns-hero__glow" aria-hidden="true" />
      <div className="ns-hero__contours" aria-hidden="true">
        <PitContourField />
      </div>

      <div className="ns-hero__content">
        <motion.p className="ns-hero__badge" {...fadeUp(0)}>
          <span className="ns-hero__badge-dot" />
          Inteligencia operacional para minería
        </motion.p>

        <motion.h1 id="ns-hero-title" className="ns-hero__title" {...fadeUp(0.08)}>
          Observe la operación completa.
          <br />
          Decida con contexto.
        </motion.h1>

        <motion.p className="ns-hero__lead" {...fadeUp(0.16)}>
          NORTHMINE conecta producción, flota, carguío y riesgo para
          transformar señales operacionales dispersas en decisiones
          comprensibles.
        </motion.p>

        <motion.div className="ns-hero__actions" {...fadeUp(0.24)}>
          <a className="ns-btn ns-btn--primary" href="/solicitar-demo">
            Solicitar acceso al demo
          </a>
          <a className="ns-btn ns-btn--ghost" href="#modulos">
            Explorar la plataforma
          </a>
        </motion.div>
      </div>
    </section>
  )
}
