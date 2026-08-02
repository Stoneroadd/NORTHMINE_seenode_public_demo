import { motion, useReducedMotion } from 'framer-motion'

const benefits = [
  { number: '01', title: 'Contexto conectado', description: 'Producción, flota y mantenimiento comparten una misma lectura del turno.' },
  { number: '02', title: 'Menos señales aisladas', description: 'Las alertas llegan con su causa, no como un aviso suelto sin origen.' },
  { number: '03', title: 'Lectura de brecha', description: 'La diferencia entre meta y real queda visible antes de que sea tarde.' },
  { number: '04', title: 'Priorización operacional', description: 'La recomendación indica qué decidir primero, no una lista plana de datos.' },
  { number: '05', title: 'Evidencia auditable', description: 'Cada acción registrada queda vinculada a su resultado posterior.' },
  { number: '06', title: 'Continuidad entre turnos', description: 'El contexto no se pierde al cambiar de turno ni de operador.' },
]

export function OperationalBenefits() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="ns-benefits" aria-labelledby="ns-benefits-title">
      <div className="ns-saas__shell">
        <h2 id="ns-benefits-title" className="ns-benefits__title">
          Diseñado para decidir, no solo para observar.
        </h2>

        <ol className="ns-benefits__list">
          {benefits.map((benefit, index) => (
            <motion.li
              key={benefit.number}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: reduceMotion ? 0 : (index % 3) * 0.06 }}
            >
              <span className="mono-label ns-benefits__number">{benefit.number}</span>
              <div>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
