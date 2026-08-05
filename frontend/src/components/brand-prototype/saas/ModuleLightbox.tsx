import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { Module } from './moduleData'

interface ModuleLightboxProps {
  module: Module | null
  onClose: () => void
  returnFocusRef: React.RefObject<HTMLElement>
}

export function ModuleLightbox({ module, onClose, returnFocusRef }: ModuleLightboxProps) {
  const reduceMotion = useReducedMotion()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!module) return undefined

    closeButtonRef.current?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      returnFocusRef.current?.focus()
    }
  }, [module, onClose, returnFocusRef])

  return (
    <AnimatePresence>
      {module && (
        <motion.div
          className="ns-lightbox"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ns-lightbox-title"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="ns-lightbox__backdrop" onClick={onClose} />
          <motion.figure
            className="ns-lightbox__frame"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="ns-lightbox__close"
              onClick={onClose}
              aria-label="Cerrar vista ampliada"
            >
              ×
            </button>
            <img src={module.image} alt={module.imageAlt} width="1600" height="916" />
            <figcaption>
              <p className="mono-label ns-lightbox__category">{module.category}</p>
              <h3 id="ns-lightbox-title">{module.name}</h3>
              <p>{module.description}</p>
            </figcaption>
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
