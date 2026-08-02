import { motion, useReducedMotion } from 'framer-motion'

const indicators = [
  { label: 'Turno a esta hora', value: '+37.743 t', tone: 'positive' as const },
  { label: 'Proyectado fin turno', value: '112.600 t', tone: 'default' as const },
  { label: 'Requerido restante', value: '0 t/h', tone: 'positive' as const },
  { label: 'Equipo a revisar', value: 'CF 2', tone: 'critical' as const },
]

export function OperationalReading() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="ns-reading" id="lectura" aria-labelledby="ns-reading-title">
      <div className="ns-saas__shell">
        <div className="ns-reading__head">
          <p className="mono-label">Capacidades</p>
          <h2 id="ns-reading-title" className="ns-reading__title">
            Una lectura. Todo el turno.
          </h2>
          <p className="ns-reading__lead">
            La primera pantalla no muestra datos sueltos: muestra qué ocurrió,
            qué falta y qué acción corresponde ejecutar ahora.
          </p>
        </div>

        <div className="ns-reading__surface">
          <div className="ns-reading__indicators">
            {indicators.map((indicator, index) => (
              <motion.div
                key={indicator.label}
                className={`ns-reading__indicator ns-reading__indicator--${indicator.tone}`}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: reduceMotion ? 0 : index * 0.06 }}
              >
                <span className="mono-label">{indicator.label}</span>
                <strong>{indicator.value}</strong>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="ns-reading__frame"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src="/assets/landing/prototype/product/cockpit-operational-demo-capture.webp"
              srcSet="/assets/landing/prototype/product/cockpit-operational-demo-capture-900.webp 900w, /assets/landing/prototype/product/cockpit-operational-demo-capture.webp 1600w"
              sizes="(max-width: 900px) 100vw, 900px"
              alt="Captura del Decision Cockpit mostrando producción, brecha y ritmo requerido, datos sintéticos"
              width="1760"
              height="1010"
              loading="lazy"
              style={{ objectPosition: '30% 62%' }}
            />
            <div className="ns-reading__plate mono-label">LECTURA EJECUTIVA · DATOS SINTÉTICOS</div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
