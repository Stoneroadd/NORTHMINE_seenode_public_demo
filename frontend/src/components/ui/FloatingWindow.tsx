import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { getDetailModalStyle, type DetailModalAnchor } from '../cockpit/detailModalPosition'

export type FloatingWindowPlacement =
  | { mode: 'center' }
  | { mode: 'anchor'; anchor: DetailModalAnchor | null }

export type FloatingWindowSize = 'sm' | 'md' | 'lg' | 'full'

interface FloatingWindowProps {
  open: boolean
  onClose: () => void
  placement?: FloatingWindowPlacement
  size?: FloatingWindowSize
  ariaLabel?: string
  labelledBy?: string
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  initialFocusRef?: RefObject<HTMLElement>
  panelClassName?: string
  panelStyle?: CSSProperties
  backdropClassName?: string
  zIndex?: number
  children: ReactNode
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function FloatingWindow({
  open,
  onClose,
  placement = { mode: 'center' },
  size = 'md',
  ariaLabel,
  labelledBy,
  closeOnBackdrop = true,
  closeOnEscape = true,
  initialFocusRef,
  panelClassName,
  panelStyle,
  backdropClassName,
  zIndex,
  children,
}: FloatingWindowProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const prefersReducedMotion = usePrefersReducedMotion()
  const isAnchored = placement.mode === 'anchor'

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    const focusTarget =
      initialFocusRef?.current ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    focusTarget?.focus()

    return () => {
      previouslyFocused.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (closeOnEscape) onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, closeOnEscape])

  useEffect(() => {
    if (!open || isAnchored) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open, isAnchored])

  const anchorStyle: CSSProperties | undefined =
    placement.mode === 'anchor' ? getDetailModalStyle(placement.anchor) : undefined

  const transition = { duration: prefersReducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] as const }

  const panelInitial = isAnchored ? { opacity: 0, y: 8 } : { opacity: 0, scale: 0.96, y: 8 }
  const panelAnimate = isAnchored ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }
  const panelExit = panelInitial

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="nm-floating-window-layer"
          data-placement={isAnchored ? 'anchor' : 'center'}
          style={{ zIndex, ...anchorStyle }}
        >
          <motion.div
            className={`nm-floating-window-backdrop ${backdropClassName ?? ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            onClick={closeOnBackdrop ? onClose : undefined}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            aria-labelledby={labelledBy}
            className={`nm-floating-window-panel nm-floating-window-panel--${size} ${panelClassName ?? ''}`}
            style={panelStyle}
            initial={panelInitial}
            animate={panelAnimate}
            exit={panelExit}
            transition={transition}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
