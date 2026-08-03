import { motion, useReducedMotion } from 'framer-motion'
import { PitContourField } from '../landing/PitContourField'

const steps = [
  { label: 'Terreno', detail: 'Ortomosaico sintético' },
  { label: 'Curvas de nivel', detail: 'Geometría de banco' },
  { label: 'Capa DXF', detail: '4 823 polilíneas' },
  { label: 'Rutas', detail: 'Acarreo y carguío' },
  { label: 'Señales', detail: 'Producción y ciclo' },
  { label: 'Decisión', detail: 'Lectura convergente' },
]

export function TerrainDataTransition() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="nmp-transition" aria-labelledby="nmp-transition-title">
      <div className="nmp-transition__scene" aria-hidden="true">
        <img
          className="nmp-transition__ortho"
          src="/assets/landing/open-pit-orthomosaic-synthetic.webp"
          alt=""
          width="1600"
          height="1000"
          loading="lazy"
        />
        <motion.div
          className="nmp-transition__contours"
          initial={reduceMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
        >
          <PitContourField />
        </motion.div>
        <motion.div
          className="nmp-transition__convergence"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: reduceMotion ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="nmp-transition__copy">
        <p className="mono-label">Del terreno al dato</p>
        <h2 id="nmp-transition-title" className="nmp-transition__title">
          La misma geometría, leída en capas.
        </h2>
        <ol className="nmp-transition__steps">
          {steps.map((step, index) => (
            <motion.li
              key={step.label}
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.4, delay: reduceMotion ? 0 : index * 0.08 }}
            >
              <span className="mono-label">{String(index + 1).padStart(2, '0')}</span>
              <span className="nmp-transition__step-label">{step.label}</span>
              <span className="nmp-transition__step-detail">{step.detail}</span>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
