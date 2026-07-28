import { memo, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { CircleAlert, Inbox, Loader2 } from 'lucide-react'
import { useModuleT } from '../../../i18n/useModuleT'
import { chartsT } from '../../../i18n/modules/charts'

interface Props {
  children: ReactNode
  height?: number
  loading?: boolean
  error?: boolean | string
  empty?: boolean
  emptyLabel?: string
}

function PremiumChartFrameBase({
  children,
  height = 320,
  loading,
  error,
  empty,
  emptyLabel,
}: Props) {
  const t = useModuleT(chartsT)
  const minHeight = Math.max(height, 220)

  return (
    <motion.div
      className="premium-chart-shell"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: 'easeOut' }}
      style={{ minHeight }}
    >
      <div className="premium-chart-toolbar">
        <span>{t.liveBadge}</span>
        <strong>ECHARTS</strong>
      </div>
      {loading && (
        <div className="premium-chart-state" style={{ minHeight }}>
          <Loader2 className="spin-icon" size={24} />
          <span>{t.syncingData}</span>
        </div>
      )}

      {!loading && error && (
        <div className="premium-chart-state chart-error" style={{ minHeight }}>
          <CircleAlert size={24} />
          <span>{typeof error === 'string' ? error : t.couldNotLoadChart}</span>
        </div>
      )}

      {!loading && !error && empty && (
        <div className="premium-chart-state" style={{ minHeight }}>
          <Inbox size={24} />
          <span>{emptyLabel ?? t.noDataToDisplay}</span>
        </div>
      )}

      {!loading && !error && !empty && (
        <div className="premium-chart-body" style={{ height }}>
          {children}
        </div>
      )}
    </motion.div>
  )
}

export const PremiumChartFrame = memo(PremiumChartFrameBase)
