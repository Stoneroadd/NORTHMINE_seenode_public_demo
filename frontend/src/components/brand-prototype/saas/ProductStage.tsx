import { motion, useReducedMotion } from 'framer-motion'
import { useSaveData } from '../../../hooks/useSaveData'

export function ProductStage() {
  const reduceMotion = useReducedMotion()
  const saveData = useSaveData()

  return (
    <div className="ns-stage">
      <motion.figure
        className="ns-stage__frame"
        initial={reduceMotion ? false : { opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="ns-stage__glow" aria-hidden="true" />
        <div className="ns-stage__toolbar">
          <span className="ns-stage__toolbar-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="ns-stage__toolbar-label mono-label">CAPTURA DEL DEMO · DATOS SINTÉTICOS</span>
        </div>
        <img
          className="ns-stage__image"
          src={
            saveData
              ? '/assets/landing/prototype/product/cockpit-operational-demo-capture-900.webp'
              : '/assets/landing/prototype/product/cockpit-operational-demo-capture.webp'
          }
          srcSet={
            saveData
              ? undefined
              : '/assets/landing/prototype/product/cockpit-operational-demo-capture-900.webp 900w, /assets/landing/prototype/product/cockpit-operational-demo-capture.webp 1600w'
          }
          sizes={saveData ? undefined : '(max-width: 900px) 100vw, 1200px'}
          alt="Captura del Decision Cockpit de NORTHMINE mostrando la lectura ejecutiva del turno con datos de demostración sintéticos"
          width="1760"
          height="1010"
          fetchPriority="high"
        />
        <div className="ns-stage__fade" aria-hidden="true" />
      </motion.figure>
    </div>
  )
}
