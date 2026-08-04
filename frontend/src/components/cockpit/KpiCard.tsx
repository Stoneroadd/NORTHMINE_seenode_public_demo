import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cva } from 'class-variance-authority'
import { useModuleT } from '../../i18n/useModuleT'
import { cockpitT } from '../../i18n/modules/cockpit'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'
import { formatNumber } from './cockpitModel'
import { cn } from '@/lib/utils'

type Tone = 'green' | 'cyan' | 'yellow' | 'orange' | 'red' | 'purple' | 'neutral'

// Un unico acento por KPI (icono, barra, sparkline) — nunca borde de color;
// el estado se comunica con causa (DESIGN.md: La Regla del Color con Causa).
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

const toneFrame = cva(
  'relative rounded-lg border bg-card/85 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:px-5',
  {
    variants: {
      tone: {
        green: 'border-success/25 border-t-success/55',
        cyan: 'border-info/25 border-t-info/55',
        yellow: 'border-warning/25 border-t-warning/50',
        orange: 'border-alert/25 border-t-alert/50',
        red: 'border-critical/25 border-t-critical/50',
        purple: 'border-brand-violet/25 border-t-brand-violet/50',
        neutral: 'border-border-mid border-t-border-bright/45',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

const toneDot = cva('h-1.5 w-1.5 shrink-0 rounded-full', {
  variants: {
    tone: {
      green: 'bg-success',
      cyan: 'bg-info',
      yellow: 'bg-warning',
      orange: 'bg-alert',
      red: 'bg-critical',
      purple: 'bg-brand-violet',
      neutral: 'bg-text-tertiary',
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
  return Number.isFinite(numeric) ? { numeric, suffix, decimalDigits, explicitPlus: sign === '+' } : null
}

function AnimatedMetricToken({ value, reducedMotion }: { value: string; reducedMotion: boolean | null }) {
  const parsed = parseMetric(value)
  const enabled = Boolean(parsed) && !reducedMotion
  const { value: animated, ref } = useAnimatedNumber(parsed?.numeric ?? 0, {
    initialValue: enabled ? 0 : parsed?.numeric ?? 0,
    durationMs: 980,
    enabled,
  })

  if (!parsed) return <>{value}</>

  return (
    <span key={value} ref={ref}>
      {parsed.explicitPlus && animated >= 0 ? '+' : ''}
      {animated.toLocaleString('es-CL', {
        minimumFractionDigits: parsed.decimalDigits,
        maximumFractionDigits: parsed.decimalDigits,
      })}
      {parsed.suffix}
    </span>
  )
}

function AnimatedMetric({ value, reducedMotion }: { value: string; reducedMotion: boolean | null }) {
  return <AnimatedMetricToken value={value} reducedMotion={reducedMotion} />
}

export function AnimatedMetricText({ value, reducedMotion }: { value: string; reducedMotion: boolean | null }) {
  const parts = value.split(/([+-]?\d[\d.,]*)/g)

  return (
    <>
      {parts.map((part, index) => (
        /^[+-]?\d[\d.,]*$/.test(part)
          ? <AnimatedMetricToken key={`${index}-${part}`} value={part} reducedMotion={reducedMotion} />
          : part
      ))}
    </>
  )
}

// La lectura principal del turno: un unico numero grande, sin caja ni
// icono compitiendo por atencion. Todo lo demas en esta seccion es
// secundario a esta cifra (DESIGN.md: jerarquia por tamano/peso, no color).
export function KpiHero({
  label,
  value,
  statusLine,
  tone = 'neutral',
  sparkline,
  progress,
  footer,
  children,
}: {
  label: string
  value: string
  statusLine?: ReactNode
  tone?: Tone
  sparkline?: number[]
  progress?: number | null
  footer?: ReactNode
  children?: ReactNode
}) {
  const t = useModuleT(cockpitT)
  const reduceMotion = useReducedMotion()
  const normalizedProgress = typeof progress === 'number'
    ? Math.min(100, Math.max(0, progress))
    : null

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: 'easeOut' }}
      className={toneFrame({ tone })}
      aria-label={label}
    >
      <div className="relative grid gap-4 lg:grid-cols-[minmax(250px,0.72fr)_minmax(0,1.28fr)] lg:items-end">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-xs font-medium uppercase tracking-[0.1em] text-text-secondary">{label}</span>
            {sparkline && (
              <div className={cn('h-5 w-24 opacity-90', toneAccent({ tone }))}>
                <Sparkline values={sparkline} ariaLabel={t.kpi_card_sparkline_aria} />
              </div>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-1">
            <strong className="font-industrial-mono text-4xl font-semibold leading-none tracking-tight text-text-primary sm:text-5xl">
              <AnimatedMetric value={value} reducedMotion={reduceMotion} />
            </strong>
            {statusLine && (
              <span className={cn('pb-0.5 text-sm font-medium', toneAccent({ tone }))}>{statusLine}</span>
            )}
          </div>

          {normalizedProgress !== null && (
            <div
              className="mt-3 h-1.5 rounded-sm bg-elevated"
              role="progressbar"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={normalizedProgress}
              aria-valuetext={`${formatNumber(progress ?? 0, 1)}%`}
            >
              <span
                className="block h-full rounded-sm bg-info transition-[width] duration-300"
                style={{ width: `${normalizedProgress}%` }}
              />
            </div>
          )}
        </div>

        {children && <div>{children}</div>}
      </div>

      {footer && <div className="relative mt-3 border-t border-border-bright/35 pt-3">{footer}</div>}
    </motion.section>
  )
}

// Banda operacional secundaria dentro del hero. No crea otra tarjeta ni
// establece altura: la grilla se adapta al viewport y al contenido real.
export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-0 lg:divide-x lg:divide-border-dim">
      {children}
    </div>
  )
}

const statItemTone = cva(
  'min-w-0 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 gap-y-0.5 rounded-md px-2 py-1 transition-[background-color,box-shadow,transform] duration-200 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none lg:flex lg:flex-col lg:items-stretch lg:px-4 lg:first:pl-0 lg:last:pr-0',
  {
    variants: {
      tone: {
        green: 'hover:bg-success/[0.08] hover:shadow-[0_6px_16px_rgba(0,0,0,0.18)]',
        cyan: 'hover:bg-info/[0.08] hover:shadow-[0_6px_16px_rgba(0,0,0,0.18)]',
        yellow: 'hover:bg-warning/[0.08] hover:shadow-[0_6px_16px_rgba(0,0,0,0.18)]',
        orange: 'hover:bg-alert/[0.08] hover:shadow-[0_6px_16px_rgba(0,0,0,0.18)]',
        red: 'hover:bg-critical/[0.08] hover:shadow-[0_6px_16px_rgba(0,0,0,0.18)]',
        purple: 'hover:bg-brand-violet/[0.08] hover:shadow-[0_6px_16px_rgba(0,0,0,0.18)]',
        neutral: 'hover:bg-elevated/60 hover:shadow-[0_6px_16px_rgba(0,0,0,0.18)]',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export function StatItem({
  label,
  value,
  indicator,
  tone = 'neutral',
  unavailable = false,
}: {
  label: string
  value: string
  indicator?: string
  tone?: Tone
  unavailable?: boolean
}) {
  const reduceMotion = useReducedMotion()
  return (
    <div className={cn(statItemTone({ tone }), unavailable && 'opacity-50')}>
      <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium leading-tight text-text-secondary">
        <span className={toneDot({ tone })} aria-hidden="true" />
        <span>{label}</span>
      </span>
      <strong className="font-industrial-mono text-lg font-semibold leading-tight text-text-primary">
        <AnimatedMetric value={value} reducedMotion={reduceMotion} />
      </strong>
      {indicator && (
        <span className={cn('col-span-2 text-xs font-medium leading-tight lg:col-auto', toneAccent({ tone }))}>
          {indicator}
        </span>
      )}
    </div>
  )
}
