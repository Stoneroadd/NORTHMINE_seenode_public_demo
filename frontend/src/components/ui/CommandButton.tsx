import { MouseEvent, ReactNode, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, type LucideIcon } from 'lucide-react'
import { useMagneticHover } from '../../hooks/useMagneticHover'

type CommandButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'matrix' | 'industrial'

interface Ripple {
  x: number
  y: number
  id: number
}

interface Props {
  variant?: CommandButtonVariant
  icon?: LucideIcon
  loading?: boolean
  children: ReactNode
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  title?: string
  'aria-label'?: string
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
}

export function CommandButton({
  variant = 'primary',
  icon: Icon,
  loading,
  children,
  className = '',
  disabled,
  onClick,
  ...props
}: Props) {
  const [ripples, setRipples] = useState<Ripple[]>([])
  const idRef = useRef(0)
  const timeoutRefs = useRef<number[]>([])
  const magnetic = useMagneticHover({ enabled: !disabled && !loading, strength: 0.22, maxOffset: 7 })

  useEffect(() => () => {
    timeoutRefs.current.forEach((timeout) => window.clearTimeout(timeout))
  }, [])

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const id = idRef.current + 1
    idRef.current = id
    setRipples((items) => [...items, { id, x: event.clientX - rect.left, y: event.clientY - rect.top }])
    const timeout = window.setTimeout(() => {
      setRipples((items) => items.filter((item) => item.id !== id))
    }, 520)
    timeoutRefs.current.push(timeout)
    onClick?.(event)
  }

  return (
    <motion.button
      {...props}
      type={props.type ?? 'button'}
      disabled={disabled || loading}
      className={`command-button command-button-${variant} ${className}`}
      onClick={handleClick}
      onPointerMove={magnetic.onPointerMove}
      onPointerLeave={magnetic.onPointerLeave}
      style={{ x: magnetic.x, y: magnetic.y }}
      whileHover={{ scale: disabled || loading ? 1 : 1.015 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.985 }}
    >
      <span className="command-button-shine" />
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="command-button-ripple"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
      {loading ? <Loader2 className="spin-icon" size={16} /> : Icon ? <Icon size={16} /> : null}
      <span className="command-button-label">{children}</span>
    </motion.button>
  )
}
