import type { ReactNode } from 'react'

export type StatusTone = 'success' | 'warning' | 'critical' | 'neutral' | 'info'

interface Props {
  tone?: StatusTone
  children: ReactNode
  className?: string
}

export function StatusPill({ tone = 'neutral', children, className = '' }: Props) {
  return <span className={`command-status-pill status-tone-${tone} ${className}`}>{children}</span>
}

export function toneFromOperationalState(state?: string): StatusTone {
  const normalized = (state ?? '').toUpperCase()
  if (normalized.includes('MANT') || normalized.includes('AVER') || normalized.includes('CRIT')) return 'critical'
  if (normalized.includes('DEMORA') || normalized.includes('BAJO') || normalized.includes('OBS')) return 'warning'
  if (normalized.includes('ACTIVO')) return 'success'
  if (normalized.includes('SIN')) return 'neutral'
  return 'info'
}

