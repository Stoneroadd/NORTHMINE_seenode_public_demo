import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { CircleAlert, Loader2 } from 'lucide-react'
import { getEquipmentDetail } from '../../../services/equipmentService'
import { useModuleT } from '../../../i18n/useModuleT'
import { equipmentT } from '../../../i18n/modules/equipment'
import { CommandButton } from '../../ui/CommandButton'
import { EquipmentAlertsPanel } from './EquipmentAlertsPanel'
import { EquipmentCycleBreakdown } from './EquipmentCycleBreakdown'
import { EquipmentDetailHeader } from './EquipmentDetailHeader'
import { EquipmentHourlyChart } from './EquipmentHourlyChart'
import { EquipmentOperationalKpis } from './EquipmentOperationalKpis'
import { EquipmentRecommendationPanel } from './EquipmentRecommendationPanel'

interface Props {
  equipmentId: string | null
  open: boolean
  onClose: () => void
}

export function EquipmentDetailDrawer({ equipmentId, open, onClose }: Props) {
  const t = useModuleT(equipmentT)
  const query = useQuery({
    queryKey: ['equipment-detail', equipmentId],
    queryFn: () => getEquipmentDetail(equipmentId ?? ''),
    enabled: open && Boolean(equipmentId),
  })

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  const drawer = (
    <AnimatePresence>
      {open && (
        <div className="equipment-drawer-layer" role="dialog" aria-modal="true" aria-label={t.equipmentDetailAria}>
          <motion.button
            className="equipment-drawer-backdrop"
            type="button"
            aria-label={t.closeDetailAria}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            className="equipment-detail-drawer"
            initial={{ x: '100%', opacity: 0.7 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.7 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          >
            {query.isLoading && (
              <div className="equipment-drawer-state">
                <Loader2 className="spin-icon" size={28} />
                <span>{t.loadingOperationalDetail}</span>
              </div>
            )}

            {query.isError && (
              <div className="equipment-drawer-state drawer-error">
                <CircleAlert size={30} />
                <h3>{t.couldNotLoadEquipment}</h3>
                <p>{t.checkBackendRetry}</p>
                <CommandButton variant="secondary" onClick={onClose}>{t.close}</CommandButton>
              </div>
            )}

            {query.data && (
              <div className="equipment-detail-content">
                <EquipmentDetailHeader detail={query.data} onClose={onClose} />
                <EquipmentOperationalKpis detail={query.data} />
                <div className="equipment-detail-two-column">
                  <EquipmentCycleBreakdown cycleTimes={query.data.cycle_times} />
                  <EquipmentAlertsPanel alerts={query.data.alerts} />
                </div>
                <EquipmentHourlyChart data={query.data.hourly_history} />
                <EquipmentRecommendationPanel detail={query.data} />
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )

  if (typeof document === 'undefined') return drawer

  return createPortal(drawer, document.body)
}
