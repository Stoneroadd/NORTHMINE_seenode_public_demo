import { motion, useReducedMotion } from 'framer-motion'

const categories = ['Terreno', 'Equipos', 'Producción', 'Riesgo', 'Decisión']

export function OperationalManifesto() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="nmp-manifesto" id="momento-2" aria-labelledby="nmp-manifesto-title">
      <div className="nmp-manifesto__scene" aria-hidden="true">
        {/* the geometry that "crosses" the light-to-dark transition: a single
            bench-cut wedge, reused from the symbol's own diagonal language */}
        <svg className="nmp-manifesto__wedge" viewBox="0 0 200 400" preserveAspectRatio="none">
          <path d="M0,0 L120,0 L60,400 L0,400 Z" fill="currentColor" />
        </svg>
      </div>

      <div className="nmp-manifesto__panel nmp-manifesto__panel--light">
        <p className="mono-label">Manifiesto</p>
        <h2 id="nmp-manifesto-title" className="nmp-manifesto__title">
          Observe el turno completo.
          <br />
          Decida con contexto.
        </h2>
      </div>

      <div className="nmp-manifesto__panel nmp-manifesto__panel--dark">
        <p className="nmp-manifesto__body">
          Transformamos señales del terreno, equipos y producción en una
          lectura operacional conectada.
        </p>
        <ul className="nmp-manifesto__categories" aria-label="Categorías operacionales">
          {categories.map((category, index) => (
            <motion.li
              key={category}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: reduceMotion ? 0 : index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="mono-label">{String(index + 1).padStart(2, '0')}</span>
              {category}
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
