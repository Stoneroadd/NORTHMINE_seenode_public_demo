import type { Ref } from 'react'
import { X } from 'lucide-react'
import type { EquipmentDetail } from '../../../types/equipment'
import { getEquipmentImage } from '../../../data/equipmentAssets'
import { useTilt3D } from '../../../hooks/useTilt3D'
import { StatusPill, toneFromOperationalState } from '../../ui/StatusPill'
import { MachineStatusOverlay } from '../MachineStatusOverlay'
import { CommandButton } from '../../ui/CommandButton'
import { useModuleT } from '../../../i18n/useModuleT'
import { equipmentT } from '../../../i18n/modules/equipment'

interface Props {
  detail: EquipmentDetail
  onClose: () => void
  closeButtonRef: Ref<HTMLButtonElement>
  titleId: string
  descriptionId: string
}

export function EquipmentDetailHeader({ detail, onClose, closeButtonRef, titleId, descriptionId }: Props) {
  const t = useModuleT(equipmentT)
  const tilt = useTilt3D({ maxTilt: 5, scale: 1.025 })
  const image = getEquipmentImage(detail.equipment_id, detail.model)
  const tone = toneFromOperationalState(detail.status)
  const isPala1 = detail.equipment_id.replace(/\s/g, '').toUpperCase() === 'PALA1'

  return (
    <header className="equipment-detail-header">
      <div className={`equipment-detail-visual${isPala1 ? ' is-pala-1' : ''}`} {...tilt}>
        <img className={isPala1 ? 'is-pala-1' : undefined} src={image} alt={`${detail.equipment_id} ${detail.model}`} />
        <span className="equipment-scanline" />
        <MachineStatusOverlay
          state={detail.status}
          toneladas={detail.toneladas_turno}
          ciclos={detail.ciclos_turno}
          rendimiento={detail.rendimiento_tph}
          alert={detail.alerts[0]?.titulo}
        />
      </div>

      <div className="equipment-detail-heading">
        <div className="equipment-detail-actions">
          <span className="module-eyebrow">{t.operationalDetail}</span>
          <CommandButton buttonRef={closeButtonRef} variant="ghost" icon={X} onClick={onClose} aria-label={t.closeDetail}>{t.close}</CommandButton>
        </div>
        <h2 id={titleId}>{detail.equipment_id}</h2>
        <p id={descriptionId}>{detail.model}</p>
        <div className="equipment-detail-pills">
          <StatusPill tone={tone}>{detail.status}</StatusPill>
          <StatusPill tone="info">{detail.family_label}</StatusPill>
          <StatusPill tone={detail.risk_level === 'CRITICO' ? 'critical' : detail.risk_level === 'MEDIO' ? 'warning' : 'success'}>
            {t.risk(detail.risk_level)}
          </StatusPill>
        </div>
        <dl className="equipment-detail-meta">
          <div><dt>{t.operator}</dt><dd>{detail.operator}</dd></div>
          <div><dt>{t.location}</dt><dd>{detail.location}</dd></div>
          <div><dt>{t.shift}</dt><dd>{detail.shift}</dd></div>
          <div><dt>{t.lastActivity}</dt><dd>{new Date(detail.last_activity).toLocaleString('es-CL')}</dd></div>
        </dl>
      </div>
    </header>
  )
}
