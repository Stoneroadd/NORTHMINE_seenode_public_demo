import { useEffect, useId, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { getOperatorRankingMethodology } from '../../services/operatorRankingService'
import { DelayThresholdTable } from './DelayThresholdTable'
import { ResponsibleUseNotice } from './ResponsibleUseNotice'
import { ScoreFormulaCard } from './ScoreFormulaCard'
import { useModuleT } from '../../i18n/useModuleT'
import { operatorRankingT } from '../../i18n/modules/operatorRanking'

interface Props {
  open: boolean
  onClose: () => void
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function visibleFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true',
  )
}

export function OperatorMethodologyModal({ open, onClose }: Props) {
  const t = useModuleT(operatorRankingT)
  const panelRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descriptionId = useId()
  const query = useQuery({
    queryKey: ['operator-ranking-methodology'],
    queryFn: getOperatorRankingMethodology,
    enabled: open,
    staleTime: 20 * 60 * 1000,
  })

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = visibleFocusableElements(panelRef.current)
      if (focusable.length === 0) {
        event.preventDefault()
        panelRef.current.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !panelRef.current.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown, true)
      if (opener?.isConnected) opener.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="operator-methodology-modal is-open">
      <div className="operator-methodology-backdrop" aria-hidden="true" onClick={onClose} />
      <section
        id="operator-methodology-dialog"
        ref={panelRef}
        className="operator-methodology-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <button ref={closeButtonRef} type="button" className="operator-drawer-close" onClick={onClose} aria-label={t.method_close}>
          <X size={18} />
        </button>

        <header className="operator-methodology-header">
          <span className="panel-kicker">{t.method_kicker}</span>
          <h2 id={titleId}>{t.method_titulo}</h2>
          <p id={descriptionId}>{t.method_desc}</p>
        </header>

        {query.isLoading && <div className="loading-state" role="status" aria-live="polite">{t.method_cargando}</div>}
        {query.isError && <div className="error-state" role="alert">{t.method_error}</div>}

        {query.data && (
          <div className="operator-methodology-content">
            <ResponsibleUseNotice note={query.data.responsible_use_note} />
            <ScoreFormulaCard methodology={query.data} />

            <section className="operator-method-card">
              <span className="panel-kicker">{t.method_umbral_kicker}</span>
              <h3>{t.method_umbral_titulo}</h3>
              <DelayThresholdTable methodology={query.data} />
            </section>

            <section className="operator-method-card">
              <span className="panel-kicker">{t.method_interp_kicker}</span>
              <h3>{t.method_interp_titulo}</h3>
              <div className="operator-interpretation-grid">
                {Object.entries(query.data.interpretation).map(([key, value]) => (
                  <div key={key}>
                    <strong>{key}</strong>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  )
}
