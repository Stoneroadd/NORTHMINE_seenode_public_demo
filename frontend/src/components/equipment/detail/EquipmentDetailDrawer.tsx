import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { CircleAlert, Loader2 } from 'lucide-react'
import { getEquipmentDetail } from '../../../services/equipmentService'
import { useModuleT } from '../../../i18n/useModuleT'
import { equipmentT } from '../../../i18n/modules/equipment'
import { useModalA11y } from '../../../hooks/useModalA11y'
import { EQUIPMENT_DETAIL_DRAWER_ID } from '../equipmentDetailA11y'
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
  const { panelRef, closeButtonRef, titleId, descriptionId } = useModalA11y(open, onClose)
  const query = useQuery({
    queryKey: ['equipment-detail', equipmentId],
    queryFn: () => getEquipmentDetail(equipmentId ?? ''),
    enabled: open && Boolean(equipmentId),
  })

  useEffect(() => {
    if (!open || !query.data) return undefined
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    return () => window.cancelAnimationFrame(focusFrame)
  }, [closeButtonRef, open, query.data])

  const drawer = (
    <AnimatePresence>
      {open && (
        <div className="equipment-drawer-layer">
          <motion.button
            className="equipment-drawer-backdrop"
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            id={EQUIPMENT_DETAIL_DRAWER_ID}
            ref={panelRef}
            className="equipment-detail-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={query.data ? titleId : undefined}
            aria-describedby={query.data ? descriptionId : undefined}
            aria-label={query.data ? undefined : `${t.equipmentDetailAria}${equipmentId ? ` ${equipmentId}` : ''}`}
            tabIndex={-1}
            initial={{ x: '100%', opacity: 0.7 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.7 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          >
            {query.isLoading && (
              <div className="equipment-drawer-state" role="status" aria-live="polite">
                <Loader2 className="spin-icon" size={28} />
                <span>{t.loadingOperationalDetail}</span>
              </div>
            )}

            {query.isError && (
              <div className="equipment-drawer-state drawer-error" role="alert">
                <CircleAlert size={30} />
                <h3>{t.couldNotLoadEquipment}</h3>
                <p>{t.checkBackendRetry}</p>
                <CommandButton variant="secondary" onClick={onClose}>{t.close}</CommandButton>
              </div>
            )}

            {query.data && (
              <div className="equipment-detail-content">
                <EquipmentDetailHeader
                  detail={query.data}
                  onClose={onClose}
                  closeButtonRef={closeButtonRef}
                  titleId={titleId}
                  descriptionId={descriptionId}
                />
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
