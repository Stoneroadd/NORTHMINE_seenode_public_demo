import { motion, useReducedMotion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cva } from 'class-variance-authority'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT } from '../../i18n/modules/cockpit'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'
import { Card } from '../ui/card'
import { cn } from '@/lib/utils'

type Tone = 'green' | 'cyan' | 'yellow' | 'orange' | 'red' | 'purple' | 'neutral'

interface Props {
  icon: LucideIcon
  label: string
  value: string
  subtext?: string
  indicator?: string
  tone?: Tone
  progress?: number | null
  sparkline?: number[]
  unavailable?: boolean
  children?: ReactNode
}

// Un unico acento por KPI (icono, barra, sparkline) — nunca borde de color;
// el estado se comunica con causa (DESIGN.md: La Regla del Color con Causa).
const toneChip = cva('flex h-7 w-7 items-center justify-center rounded-md', {
  variants: {
    tone: {
      green: 'bg-success/15 text-success',
      cyan: 'bg-info/15 text-info',
      yellow: 'bg-warning/15 text-warning',
      orange: 'bg-alert/15 text-alert',
      red: 'bg-critical/15 text-critical',
      purple: 'bg-brand-violet/15 text-brand-violet',
      neutral: 'bg-elevated text-text-secondary',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

const toneAccent = cva('', {
  variants: {
    tone: {
      green: 'text-success',
      cyan: 'text-info',
      yellow: 'text-warning',
      orange: 'text-alert',
      red: 'text-critical',
      purple: 'text-brand-violet',
      neutral: 'text-text-secondary',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

const toneProgressFill = cva('h-full rounded-full transition-[width] duration-300', {
  variants: {
    tone: {
      green: 'bg-success',
      cyan: 'bg-info',
      yellow: 'bg-warning',
      orange: 'bg-alert',
      red: 'bg-critical',
      purple: 'bg-brand-violet',
      neutral: 'bg-text-secondary',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

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
    <svg className="h-8 w-full" viewBox="0 0 100 32" role="img" aria-label={ariaLabel}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
    <span key={value}>
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
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <Card
        className={cn(
          'flex flex-col gap-3 p-5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.35)]',
          unavailable && 'opacity-60'
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className={toneChip({ tone })} aria-hidden="true">
            <Icon size={15} />
          </span>
          <span className="text-xs font-medium tracking-wide text-text-secondary">{label}</span>
        </div>

        <strong className="font-industrial-mono text-2xl font-semibold leading-none text-text-primary">
          <AnimatedMetric value={value} reducedMotion={reduceMotion} />
        </strong>

        {(subtext || indicator) && (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-text-secondary">
            {subtext && <span>{subtext}</span>}
            {indicator && <em className={cn('not-italic font-medium', toneAccent({ tone }))}>{indicator}</em>}
          </div>
        )}

        {typeof progress === 'number' && (
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-elevated"
            aria-label={t.kpi_card_progress_aria(Math.round(progress))}
          >
            <div className={toneProgressFill({ tone })} style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }} />
          </div>
        )}

        {sparkline && (
          <div className={toneAccent({ tone })}>
            <Sparkline values={sparkline} ariaLabel={t.kpi_card_sparkline_aria} />
          </div>
        )}

        {children}
      </Card>
    </motion.div>
  )
}
