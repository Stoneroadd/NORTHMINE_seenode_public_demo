import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import type { CockpitEquipmentCardModel } from './cockpitModel'
import { formatNumber, formatPct, formatTons } from './cockpitModel'
import { getDetailModalAnchor, type DetailModalAnchor } from './detailModalPosition'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT } from '../../i18n/modules/cockpit'

export function LoadingEquipmentCard({
  item,
  rank,
  leaderTonnes,
  onOpenDetail,
}: {
  item: CockpitEquipmentCardModel
  rank?: number
  leaderTonnes?: number
  onOpenDetail?: (item: CockpitEquipmentCardModel, anchor: DetailModalAnchor) => void
}) {
  const t = useModuleT(cockpitT)
  const reduceMotion = useReducedMotion()
  const openDetail = (element: HTMLElement) => {
    onOpenDetail?.(item, getDetailModalAnchor(element))
  }
  const contributionPct = leaderTonnes && leaderTonnes > 0 && item.tonnes !== null
    ? item.tonnes / leaderTonnes * 100
    : null
  const priority = item.tone === 'bad'
    ? t.loading_card_critico
    : item.tone === 'warn' || (item.efficiency !== null && item.efficiency < 55)
      ? t.loading_card_revisar
      : t.loading_card_operando
  const priorityClass = priority === t.loading_card_critico ? 'is-priority-bad' : priority === t.loading_card_revisar ? 'is-priority-warn' : 'is-priority-good'

  return (
    <motion.article
      className={`nmcp-equipment-card is-${item.tone} ${priorityClass}`}
      role="button"
      tabIndex={0}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      whileHover={reduceMotion ? undefined : { y: -5, scale: 1.012 }}
      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.26, ease: 'easeOut' }}
      onClick={(event) => openDetail(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openDetail(event.currentTarget)
        }
      }}
      aria-label={t.loading_card_aria(item.id)}
    >
      <div className="nmcp-equipment-card-top">
        <div>
          <span>{rank ? t.loading_card_rank(rank) : t.loading_card_unidad_carguio}</span>
          <strong>{item.id}</strong>
        </div>
        <em>{priority}</em>
      </div>

      <div className="nmcp-equipment-hero-metric">
        <span>{t.loading_card_tonelaje_turno}</span>
        <strong>{formatTons(item.tonnes)}</strong>
        <small>{contributionPct === null ? t.loading_card_aporte_sin_dato : t.loading_card_pct_lider(formatPct(contributionPct, 1))}</small>
      </div>

      <div className="nmcp-equipment-chip-row">
        <span><small>{t.loading_card_ciclos}</small><strong>{item.cycles === null ? t.common_sin_dato : formatNumber(item.cycles)}</strong></span>
        <span><small>{t.loading_card_t_ciclo}</small><strong>{item.averageCycle === null ? t.common_sin_dato : formatNumber(item.averageCycle, 1)}</strong></span>
        <span><small>{t.loading_card_eficiencia}</small><strong>{formatPct(item.efficiency, 1)}</strong></span>
      </div>

      <div className="nmcp-equipment-operator-line">
        <span>{t.loading_card_operador}</span>
        <strong>{item.operator ?? t.common_sin_dato}</strong>
      </div>

      <div className="nmcp-route-block">
        <span>{t.loading_card_origen_frente}</span>
        <strong>{item.front}</strong>
        <span>{t.loading_card_destino_principal}</span>
        <strong>{item.destination}</strong>
        <div className="nmcp-progress">
          <i style={{ width: `${Math.max(0, Math.min(item.destinationPct ?? 0, 100))}%` }} />
        </div>
        <em>{item.destinationPct === null ? t.loading_card_participacion_sin_dato : t.loading_card_pct_destino(formatPct(item.destinationPct, 1))}</em>
      </div>

      <span className="nmcp-card-action" aria-hidden="true">
        {t.loading_card_ver_detalle} <ArrowUpRight size={14} />
      </span>
    </motion.article>
  )
}
