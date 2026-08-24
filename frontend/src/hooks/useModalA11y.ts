import { useEffect, useId, useRef } from 'react'

/*
 * Shared dialog accessibility contract for this app's CSS-driven overlay
 * panels (operator ranking's methodology modal, audit drawer and detail
 * drawer all share the same "always mounted, opacity + aria-hidden toggle"
 * markup). Extracted 2026-08-23 from OperatorMethodologyModal.tsx (fixed by
 * Codex, see AGENT_LOG.md) after the same missing-focus-management bug was
 * found, unfixed, in its two sibling drawers -- rather than triplicate the
 * same effect three times.
 *
 * Callers still own conditional rendering (`if (!open) return null`): this
 * hook only manages focus movement/containment/restoration and Escape, it
 * does not mount or unmount anything itself.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function visibleFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true',
  )
}

export function useModalA11y(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = visibleFocusableElements(panelRef.current)
      if (focusable.length === 0) {
        event.preventDefault()
        panelRef.current.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !panelRef.current.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown, true)
      if (opener?.isConnected) opener.focus()
    }
  }, [open])

  return { panelRef, closeButtonRef, titleId, descriptionId }
}
