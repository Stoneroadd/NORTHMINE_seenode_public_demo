import { motion, useReducedMotion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT } from '../../i18n/modules/cockpit'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'

interface Props {
  icon: LucideIcon
  label: string
  value: string
  subtext?: string
  indicator?: string
  tone?: 'green' | 'cyan' | 'yellow' | 'orange' | 'red' | 'purple' | 'neutral'
  progress?: number | null
  sparkline?: number[]
  unavailable?: boolean
  children?: ReactNode
}

function Sparkline({ values, ariaLabel }: { values: number[]; ariaLabel: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(max - min, 1)
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 100
    const y = 28 - ((value - min) / range) * 24
    return `${x},${y}`
  }).join(' ')

  return (
    <svg className="nmcp-kpi-spark" viewBox="0 0 100 32" role="img" aria-label={ariaLabel}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function parseMetric(value: string) {
  const match = value.trim().match(/^([+-]?)(\d[\d.,]*)(.*)$/)
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
  return Number.isFinite(numeric) ? { numeric, suffix, decimalDigits } : null
}

function AnimatedMetric({ value, reducedMotion }: { value: string; reducedMotion: boolean | null }) {
  const parsed = parseMetric(value)
  const animated = useAnimatedNumber(parsed?.numeric ?? 0, {
    initialValue: 0,
    durationMs: 980,
    enabled: Boolean(parsed) && !reducedMotion,
  })

  if (!parsed) return <>{value}</>

  return (
    <span key={value} className="nmcp-animated-number">
      {animated.toLocaleString('es-CL', {
        minimumFractionDigits: parsed.decimalDigits,
        maximumFractionDigits: parsed.decimalDigits,
      })}
      {parsed.suffix}
    </span>
  )
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  subtext,
  indicator,
  tone = 'neutral',
  progress,
  sparkline,
  unavailable = false,
  children,
}: Props) {
  const t = useModuleT(cockpitT)
  const reduceMotion = useReducedMotion()

  return (
    <motion.article
      className={`nmcp-kpi-card nmcp-tone-${tone} ${unavailable ? 'is-unavailable' : ''}`}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div className="nmcp-kpi-primary">
        <div className="nmcp-kpi-top">
          <span className="nmcp-kpi-icon" aria-hidden="true"><Icon size={16} /></span>
          <span className="nmcp-kpi-label">{label}</span>
        </div>
        <strong className="nmcp-kpi-value"><AnimatedMetric value={value} reducedMotion={reduceMotion} /></strong>
        <div className="nmcp-kpi-meta">
          {subtext && <span>{subtext}</span>}
          {indicator && <em>{indicator}</em>}
        </div>
        {typeof progress === 'number' && (
          <div className="nmcp-progress" aria-label={t.kpi_card_progress_aria(Math.round(progress))}>
            <i style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }} />
          </div>
        )}
        {sparkline && <Sparkline values={sparkline} ariaLabel={t.kpi_card_sparkline_aria} />}
      </div>
      {children}
    </motion.article>
  )
}
