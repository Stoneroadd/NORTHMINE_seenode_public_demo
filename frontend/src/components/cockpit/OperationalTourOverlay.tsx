import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, Download, Pause, Play, X } from 'lucide-react'
import '../../styles/operational-tour.css'

export interface TourStep {
  targetSelector: string
  title: string
  description: string
  /** Selectores CSS, evaluados dentro del target, de las tarjetas/filas cuyo color real hay que resaltar mientras se explica este paso. */
  highlightSelectors?: string[]
  /** Efecto secundario al entrar al paso -- p.ej. sincronizar la seleccion de un nodo/tab externo para que su panel de detalle se abra junto con el resaltado. */
  onEnter?: () => void
}

export interface TourReportLine {
  label: string
  value: string
  tone?: 'nominal' | 'caution' | 'critical'
}

export interface TourReport {
  title: string
  generatedAt: string
  lines: TourReportLine[]
  recommendation: string
}

interface Props {
  steps: TourStep[]
  report: TourReport
  onClose: () => void
  /** Si se entrega, la pantalla final del reporte muestra un boton para descargarlo (PDF, etc). */
  onDownload?: () => void
}

const STEP_DURATION_MS = 4200

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function sampleAccentColor(el: HTMLElement): string | null {
  // Lee el color YA aplicado por el propio dato en vez de inventar uno, para que el brillo
  // coincida con el semaforo real de la tarjeta. Los dots de estado usan background para su
  // tono; el resto (numeros grandes, chips) lo expresan via color de texto, no del contenedor
  // (el fondo del contenedor suele ser solo el panel oscuro de la tarjeta, no la señal real).
  const dot = el.querySelector<HTMLElement>('.nmcp-state-dot')
  if (dot) {
    const dotBg = getComputedStyle(dot).backgroundColor
    if (dotBg && !dotBg.startsWith('rgba(0, 0, 0, 0)') && dotBg !== 'transparent') return dotBg
  }
  // 'strong' antes que 'b': algunas tarjetas llevan un badge numerico en <b> (color neutro)
  // que precede en el DOM al valor real en <strong> -- querySelector('strong, b') agarraria
  // el badge por orden de documento, no por relevancia.
  const strong = el.querySelector<HTMLElement>('strong') ?? el.querySelector<HTMLElement>('b')
  const probe = strong ?? el
  return getComputedStyle(probe).color || null
}

export function OperationalTourOverlay({ steps, report, onClose, onDownload }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const reducedMotion = useMemo(prefersReducedMotion, [])

  const step = steps[stepIndex]
  const isLastStep = stepIndex === steps.length - 1

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (showReport || !step) return
    step.onEnter?.()
    const target = document.querySelector<HTMLElement>(step.targetSelector)
    if (!target) {
      // Seccion no montada (tab distinto, etc.): saltar automaticamente.
      if (isLastStep) setShowReport(true)
      else setStepIndex((i) => i + 1)
      return
    }
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
    const measure = () => setRect(target.getBoundingClientRect())
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)

    const highlighted: HTMLElement[] = []
    step.highlightSelectors?.forEach((selector) => {
      target.querySelectorAll<HTMLElement>(selector).forEach((node) => highlighted.push(node))
    })
    highlighted.forEach((node, index) => {
      const accent = sampleAccentColor(node)
      if (accent) node.style.setProperty('--op-glow-color', accent)
      node.style.setProperty('--op-glow-delay', `${Math.min(index, 8) * 140}ms`)
      node.classList.add('op-tour-spotlight-item')
    })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      highlighted.forEach((node) => {
        node.classList.remove('op-tour-spotlight-item')
        node.style.removeProperty('--op-glow-color')
        node.style.removeProperty('--op-glow-delay')
      })
    }
  }, [stepIndex, showReport, step, isLastStep, reducedMotion])

  const elapsedRef = useRef(0)

  useEffect(() => {
    // Mutacion sincronica de ref (a diferencia de setState) para que el
    // efecto del ticker, que corre justo despues en el mismo commit, nunca
    // lea un elapsed "viejo" de un closure desactualizado -- eso causaba que
    // el paso saltara instantaneamente al reporte al cambiar de stepIndex.
    elapsedRef.current = 0
    setElapsedMs(0)
  }, [stepIndex])

  useEffect(() => {
    if (paused || showReport) return
    const start = performance.now() - elapsedRef.current
    let frame = 0
    const tick = (now: number) => {
      const next = now - start
      elapsedRef.current = next
      setElapsedMs(next)
      if (next >= STEP_DURATION_MS) {
        if (isLastStep) setShowReport(true)
        else setStepIndex((i) => i + 1)
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, showReport, stepIndex])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const progressPct = Math.min(100, (elapsedMs / STEP_DURATION_MS) * 100)

  return createPortal(
    <div className="op-tour-root" role="dialog" aria-modal="true" aria-label="Recorrido operacional automático">
      <div className="op-tour-scrim" onClick={onClose} />

      {!showReport && rect && (
        <>
          <div
            className="op-tour-frame"
            style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
            aria-hidden="true"
          />
          <div
            className="op-tour-caption"
            style={{
              left: Math.min(Math.max(rect.left, 16), window.innerWidth - 340),
              top: rect.bottom + 16 > window.innerHeight - 140 ? Math.max(rect.top - 132, 16) : rect.bottom + 16,
            }}
          >
            <span className="op-tour-caption-kicker">PASO {stepIndex + 1} / {steps.length}</span>
            <h3>{step?.title}</h3>
            <p>{step?.description}</p>
            <div className="op-tour-progress"><span style={{ width: `${progressPct}%` }} /></div>
          </div>
        </>
      )}

      {!showReport && !rect && (
        <div className="op-tour-caption op-tour-caption-center">
          <span className="op-tour-caption-kicker">PASO {stepIndex + 1} / {steps.length}</span>
          <h3>{step?.title}</h3>
          <p>{step?.description}</p>
        </div>
      )}

      {showReport && (
        <div className="op-tour-report" role="document">
          <header>
            <div>
              <span className="op-tour-caption-kicker">RECORRIDO COMPLETO</span>
              <h2>{report.title}</h2>
              <p className="op-tour-report-meta">Generado {report.generatedAt} · datos ya cargados en pantalla, sin nuevas consultas</p>
            </div>
            <button ref={closeButtonRef} type="button" className="op-tour-close" onClick={onClose} aria-label="Cerrar reporte">
              <X size={18} />
            </button>
          </header>

          <div className="op-tour-report-grid">
            {report.lines.map((line) => (
              <div key={line.label} className={`op-tour-report-line is-${line.tone ?? 'nominal'}`}>
                <span>{line.label}</span>
                <strong>{line.value}</strong>
              </div>
            ))}
          </div>

          <section className="op-tour-recommendation">
            <span className="op-tour-caption-kicker">RECOMENDACIÓN</span>
            <p>{report.recommendation}</p>
          </section>

          <footer>
            {onDownload && (
              <button type="button" className="op-tour-btn" onClick={onDownload}>
                <Download size={16} /> Descargar reporte
              </button>
            )}
            <button type="button" className="op-tour-btn op-tour-btn-primary" onClick={onClose}>Cerrar recorrido</button>
          </footer>
        </div>
      )}

      {!showReport && (
        <div className="op-tour-controls">
          <button ref={showReport ? undefined : closeButtonRef} type="button" className="op-tour-btn" onClick={onClose} aria-label="Cerrar recorrido">
            <X size={16} /> Cerrar
          </button>
          <button type="button" className="op-tour-btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Reanudar' : 'Pausar'}>
            {paused ? <Play size={16} /> : <Pause size={16} />} {paused ? 'Reanudar' : 'Pausar'}
          </button>
          <button
            type="button"
            className="op-tour-btn op-tour-btn-primary"
            onClick={() => (isLastStep ? setShowReport(true) : setStepIndex((i) => i + 1))}
          >
            {isLastStep ? 'Ver reporte' : 'Siguiente'} <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}
