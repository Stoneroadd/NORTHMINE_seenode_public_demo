import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useTilt3D } from '../../hooks/useTilt3D'
import { AnimatedNumericValue } from '../ui/AnimatedNumericValue'

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
  const tilt = useTilt3D({ maxTilt: 4, scale: 1.015 })
  const reducedMotion = usePrefersReducedMotion()

  return (
    <motion.article
      className={`kpi-card executive-kpi-card tone-${tone} ${featured ? 'is-featured' : ''} stagger-item`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div style={tilt.style} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}>
        <div className="kpi-topline">
          <span className="kpi-icon"><Icon size={18} /></span>
          <span>{title}</span>
        </div>
        <div className="kpi-value-row">
          <div className="kpi-value"><AnimatedNumericValue value={value} enabled={!reducedMotion} /></div>
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
      </div>
    </motion.article>
  )
}
