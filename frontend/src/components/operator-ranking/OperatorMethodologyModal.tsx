import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { getOperatorRankingMethodology } from '../../services/operatorRankingService'
import { DelayThresholdTable } from './DelayThresholdTable'
import { ResponsibleUseNotice } from './ResponsibleUseNotice'
import { ScoreFormulaCard } from './ScoreFormulaCard'
import { useModuleT } from '../../i18n/useModuleT'
import { operatorRankingT } from '../../i18n/modules/operatorRanking'
import { useModalA11y } from '../../hooks/useModalA11y'

interface Props {
  open: boolean
  onClose: () => void
}

export function OperatorMethodologyModal({ open, onClose }: Props) {
  const t = useModuleT(operatorRankingT)
  const { panelRef, closeButtonRef, titleId, descriptionId } = useModalA11y(open, onClose)
  const query = useQuery({
    queryKey: ['operator-ranking-methodology'],
    queryFn: getOperatorRankingMethodology,
    enabled: open,
    staleTime: 20 * 60 * 1000,
  })

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
