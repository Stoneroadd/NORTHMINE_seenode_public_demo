import { useReducedMotion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import type { CockpitEquipmentCardModel } from './cockpitModel'
import { formatNumber, formatPct, formatTons } from './cockpitModel'
import { getDetailModalAnchor, type DetailModalAnchor } from './detailModalPosition'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT } from '../../i18n/modules/cockpit'
import { cn } from '@/lib/utils'
import { LOADING_EQUIPMENT_DETAIL_ID } from './loadingEquipmentDetailA11y'

const toneDot: Record<CockpitEquipmentCardModel['tone'], string> = {
  good: 'bg-success',
  warn: 'bg-warning',
  bad: 'bg-critical',
  neutral: 'bg-text-tertiary',
}

// Fila densa, no tarjeta decorada: cada unidad de carguio es una linea de
// una lista operacional. El detalle completo (foto, ruta, historial) vive
// en el modal que ya abre esta misma fila (maestro-detalle, brief item 6).
export function LoadingEquipmentCard({
  item,
  rank,
  leaderTonnes,
  detailOpen = false,
  onOpenDetail,
}: {
  item: CockpitEquipmentCardModel
  rank?: number
  leaderTonnes?: number
  detailOpen?: boolean
  onOpenDetail?: (item: CockpitEquipmentCardModel, anchor: DetailModalAnchor) => void
}) {
  const t = useModuleT(cockpitT)
  useReducedMotion()
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

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={(event) => openDetail(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openDetail(event.currentTarget)
        }
      }}
      aria-label={t.loading_card_aria(item.id)}
      aria-controls={LOADING_EQUIPMENT_DETAIL_ID}
      aria-expanded={detailOpen}
      aria-haspopup="dialog"
      className="grid cursor-pointer grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-x-4 gap-y-1 border-b border-border-dim px-1 py-3 text-sm transition-colors last:border-b-0 hover:bg-hover"
    >
      <span className={cn('h-2 w-2 shrink-0 rounded-full', toneDot[item.tone])} aria-hidden="true" />

      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-text-primary">
          {item.id}
          {rank && <span className="ml-2 text-xs font-normal text-text-tertiary">{t.loading_card_rank(rank)}</span>}
        </span>
        <span className="truncate text-xs text-text-tertiary">{item.operator ?? t.common_sin_dato}</span>
      </div>

      <div className="flex flex-col items-end">
        <span className="font-industrial-mono font-semibold text-text-primary">{formatTons(item.tonnes)}</span>
        <span className="text-xs text-text-tertiary">
          {contributionPct === null ? t.loading_card_aporte_sin_dato : t.loading_card_pct_lider(formatPct(contributionPct, 1))}
        </span>
      </div>

      <div className="hidden flex-col items-end sm:flex">
        <span className="text-text-secondary">{item.cycles === null ? t.common_sin_dato : formatNumber(item.cycles)}</span>
        <span className="text-xs text-text-tertiary">{t.loading_card_ciclos}</span>
      </div>

      <span className={cn(
        'hidden whitespace-nowrap text-xs font-medium md:inline',
        item.tone === 'bad' ? 'text-critical' : item.tone === 'warn' ? 'text-warning' : 'text-success'
      )}>
        {priority}
      </span>

      <ChevronRight size={16} className="text-text-tertiary" aria-hidden="true" />
    </article>
  )
}
