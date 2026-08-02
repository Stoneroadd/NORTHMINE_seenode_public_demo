import { useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { modules, moduleFilters } from './moduleData'
import { useSaveData } from '../../../hooks/useSaveData'

export function ModuleGallery() {
  const [filter, setFilter] = useState<(typeof moduleFilters)[number]>('Todos')
  const reduceMotion = useReducedMotion()
  const saveData = useSaveData()

  const visible = useMemo(
    () => (filter === 'Todos' ? modules : modules.filter((m) => m.category === filter)),
    [filter],
  )

  return (
    <section className="ns-gallery" id="modulos" aria-labelledby="ns-gallery-title">
      <div className="ns-saas__shell">
        <div className="ns-gallery__head">
          <p className="mono-label">Módulos</p>
          <h2 id="ns-gallery-title" className="ns-gallery__title">
            Evidencia del producto, no promesas
          </h2>
          <p className="ns-gallery__lead">
            Cada módulo es una captura real del entorno de demostración
            público, con datos sintéticos identificados.
          </p>
        </div>

        <div className="ns-gallery__filters" role="tablist" aria-label="Filtrar módulos por categoría">
          {moduleFilters.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={filter === item}
              className="ns-gallery__filter"
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="ns-gallery__grid">
          <AnimatePresence mode="popLayout">
            {visible.map((module) => (
              <motion.article
                key={module.id}
                className="ns-gallery__card"
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="mono-label ns-gallery__card-category">{module.category}</p>
                <h3 className="ns-gallery__card-title">{module.name}</h3>
                <p className="ns-gallery__card-description">{module.description}</p>
                <div className="ns-gallery__card-frame">
                  <img
                    src={saveData ? module.imageMobile : module.image}
                    srcSet={saveData ? undefined : `${module.imageMobile} 600w, ${module.image} 1200w`}
                    sizes={saveData ? undefined : '(max-width: 700px) 100vw, 50vw'}
                    alt={module.imageAlt}
                    width="1200"
                    height="686"
                    loading="lazy"
                  />
                  <span className="ns-gallery__card-plate mono-label">DEMO</span>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
