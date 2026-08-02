import { motion, useReducedMotion } from 'framer-motion'

export function DemoMetrics() {
  const reduceMotion = useReducedMotion()
  const fadeUp = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.5, delay },
  })

  return (
    <section className="ns-metrics" aria-labelledby="ns-metrics-title">
      <div className="ns-saas__shell">
        <p className="mono-label">Estado, brecha y acción</p>
        <h2 id="ns-metrics-title" className="ns-metrics-title">
          Datos sintéticos del entorno demostrativo
        </h2>

        <div className="ns-metrics__grid">
          <motion.div className="ns-metrics__main" {...fadeUp(0)}>
            <span className="mono-label">Estado del turno</span>
            <strong className="ns-metrics__value ns-metrics__value--positive">107.043 t</strong>
            <span className="ns-metrics__sub">152,9% de avance real sobre meta de turno (70.000 t)</span>
          </motion.div>

          <motion.div className="ns-metrics__side" {...fadeUp(0.08)}>
            <span className="mono-label">Brecha</span>
            <strong className="ns-metrics__value">+42.600 t</strong>
            <span className="ns-metrics__sub">Proyección de cierre 112.600 t</span>
          </motion.div>

          <motion.div className="ns-metrics__side" {...fadeUp(0.14)}>
            <span className="mono-label">Ritmo requerido</span>
            <strong className="ns-metrics__value ns-metrics__value--positive">0 t/h</strong>
            <span className="ns-metrics__sub">Meta de turno ya cubierta</span>
          </motion.div>

          <motion.div className="ns-metrics__side ns-metrics__side--critical" {...fadeUp(0.2)}>
            <span className="mono-label">Acción recomendada</span>
            <strong className="ns-metrics__value ns-metrics__value--critical">CF 2</strong>
            <span className="ns-metrics__sub">Mantener pala y mover un CAEX hacia CF2 por 30 min</span>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
