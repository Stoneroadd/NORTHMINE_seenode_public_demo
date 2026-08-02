import { motion, useReducedMotion } from 'framer-motion'

const steps = [
  {
    number: '01',
    title: 'Conectar señales',
    description: 'Producción, flota, carguío y riesgo se integran desde sus fuentes operacionales, sin planillas intermedias.',
  },
  {
    number: '02',
    title: 'Interpretar la operación',
    description: 'NORTHMINE ordena las señales en estado, brecha y ritmo requerido para cerrar el turno.',
  },
  {
    number: '03',
    title: 'Recomendar y auditar decisiones',
    description: 'Cada recomendación queda registrada junto a la acción tomada y su resultado posterior.',
  },
]

export function DecisionFlow() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="ns-flow" aria-labelledby="ns-flow-title">
      <div className="ns-saas__shell">
        <p className="mono-label">Cómo funciona</p>
        <h2 id="ns-flow-title" className="ns-flow__title">
          De la señal dispersa a la decisión trazable.
        </h2>

        <ol className="ns-flow__steps">
          {steps.map((step, index) => (
            <motion.li
              key={step.number}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: reduceMotion ? 0 : index * 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="ns-flow__marker">
                <span className="mono-label">{step.number}</span>
                {index < steps.length - 1 && <span className="ns-flow__line" aria-hidden="true" />}
              </div>
              <div className="ns-flow__copy">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
