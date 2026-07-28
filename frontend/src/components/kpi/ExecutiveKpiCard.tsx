import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

type Tone = 'green' | 'cyan' | 'amber' | 'red' | 'slate'
type TrendDirection = 'up' | 'down' | 'flat'

interface Props {
  title: string
  value: string
  unit?: string
  subtitle?: string
  trend?: string
  trendDirection?: TrendDirection
  status?: string
  comparison?: string
  tone?: Tone
  icon: LucideIcon
  featured?: boolean
}

function parseNumericValue(value: string) {
  const match = value.match(/^([+-]?)(\d[\d.,]*)(.*)$/)
  if (!match) return null

  const [, sign, rawNumber, suffix] = match
  const hasComma = rawNumber.includes(',')
  const dotCount = (rawNumber.match(/\./g) ?? []).length
  const decimalDigits = hasComma
    ? rawNumber.split(',')[1]?.length ?? 0
    : dotCount === 1 && rawNumber.split('.')[1]?.length !== 3
      ? rawNumber.split('.')[1]?.length ?? 0
      : 0
  const normalized = hasComma
    ? rawNumber.replace(/\./g, '').replace(',', '.')
    : dotCount > 1 || rawNumber.split('.')[1]?.length === 3
      ? rawNumber.replace(/\./g, '')
      : rawNumber
  const numeric = Number(normalized) * (sign === '-' ? -1 : 1)

  if (!Number.isFinite(numeric)) return null
  return { numeric, suffix, decimalDigits }
}

function AnimatedKpiValue({ value }: { value: string }) {
  const reducedMotion = usePrefersReducedMotion()
  const parsed = parseNumericValue(value)
  const animated = useAnimatedNumber(parsed?.numeric ?? 0, {
    enabled: Boolean(parsed) && !reducedMotion,
    initialValue: 0,
    durationMs: 900,
  })

  if (!parsed) return <>{value}</>

  return (
    <>
      {animated.toLocaleString('es-CL', {
        minimumFractionDigits: parsed.decimalDigits,
        maximumFractionDigits: parsed.decimalDigits,
      })}
      {parsed.suffix}
    </>
  )
}

function TrendIcon({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <ArrowUpRight size={14} />
  if (direction === 'down') return <ArrowDownRight size={14} />
  return <ArrowRight size={14} />
}

export function ExecutiveKpiCard({
  title,
  value,
  unit,
  subtitle,
  trend,
  trendDirection = 'flat',
  status,
  comparison,
  tone = 'cyan',
  icon: Icon,
  featured = false,
}: Props) {
  return (
    <motion.article
      className={`kpi-card executive-kpi-card tone-${tone} ${featured ? 'is-featured' : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="kpi-topline">
        <span className="kpi-icon"><Icon size={18} /></span>
        <span>{title}</span>
      </div>
      <div className="kpi-value-row">
        <div className="kpi-value"><AnimatedKpiValue value={value} /></div>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      <div className="kpi-status-row">
        {status && <span className="kpi-status">{status}</span>}
        {trend && (
          <strong className={`kpi-trend trend-${trendDirection}`}>
            <TrendIcon direction={trendDirection} />
            {trend}
          </strong>
        )}
      </div>
      <div className="kpi-bottomline">
        <span>{subtitle}</span>
        {comparison && <strong>{comparison}</strong>}
      </div>
    </motion.article>
  )
}
