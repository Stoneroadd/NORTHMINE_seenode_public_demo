import { ReactNode } from 'react'
import { motion } from 'framer-motion'

type CommandCardState = 'normal' | 'warning' | 'critical' | 'success'

interface Props {
  children: ReactNode
  state?: CommandCardState
  className?: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function CommandCard({
  children,
  state = 'normal',
  className = '',
  onMouseEnter,
  onMouseLeave,
}: Props) {
  return (
    <motion.article
      className={`command-card command-card-${state} ${className}`}
      data-state={state}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      whileHover={{ y: -4, scale: 1.006 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <span className="command-card-circuit" />
      {children}
    </motion.article>
  )
}

