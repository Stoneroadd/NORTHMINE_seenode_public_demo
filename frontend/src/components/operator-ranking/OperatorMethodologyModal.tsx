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

export function OperatorMethodologyModal({ open, onClose }: Props) {
  const t = useModuleT(operatorRankingT)
  const query = useQuery({
    queryKey: ['operator-ranking-methodology'],
    queryFn: getOperatorRankingMethodology,
    enabled: open,
    staleTime: 20 * 60 * 1000,
  })

  return (
    <div className={`operator-methodology-modal ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="operator-methodology-backdrop" onClick={onClose} />
      <section className="operator-methodology-panel">
        <button type="button" className="operator-drawer-close" onClick={onClose} aria-label={t.method_close}>
          <X size={18} />
        </button>

        <header className="operator-methodology-header">
          <span className="panel-kicker">{t.method_kicker}</span>
          <h2>{t.method_titulo}</h2>
          <p>{t.method_desc}</p>
        </header>

        {query.isLoading && <div className="loading-state">{t.method_cargando}</div>}
        {query.isError && <div className="error-state">{t.method_error}</div>}

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
