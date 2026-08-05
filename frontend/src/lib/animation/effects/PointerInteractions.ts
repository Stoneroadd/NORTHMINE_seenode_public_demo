import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '../gsap'

interface CharTarget {
  el: HTMLElement
  xTo: (value: number) => void
  yTo: (value: number) => void
  sxTo: (value: number) => void
  syTo: (value: number) => void
  cx: number
  cy: number
}

/**
 * Splits an element's text into one <span> per character, in place.
 * Preserves <br> line breaks. Keeps the element accessible by moving its
 * original text into aria-label and hiding the per-letter spans from AT.
 *
 * Idempotent: React StrictMode (and Vite HMR) re-run effect setup without
 * undoing manual DOM mutations, so a second call would otherwise re-split
 * the already-split spans into a broken double-nested mess. A marker
 * attribute makes the second call a no-op that just returns the existing
 * direct-child spans instead.
 */
function splitIntoChars(el: HTMLElement): HTMLElement[] {
  if (el.dataset.magneticSplit === 'true') {
    return Array.from(el.querySelectorAll<HTMLElement>(':scope > span[aria-hidden="true"]'))
  }
  el.dataset.magneticSplit = 'true'

  const chars: HTMLElement[] = []
  if (!el.getAttribute('aria-label')) {
    el.setAttribute('aria-label', el.textContent ?? '')
  }

  const walk = (node: ChildNode) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ''
      const frag = document.createDocumentFragment()
      for (const ch of text) {
        if (ch === ' ') {
          frag.appendChild(document.createTextNode(' '))
          continue
        }
        const span = document.createElement('span')
        span.textContent = ch
        span.setAttribute('aria-hidden', 'true')
        span.style.display = 'inline-block'
        span.style.willChange = 'transform'
        frag.appendChild(span)
        chars.push(span)
      }
      node.replaceWith(frag)
    } else if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName !== 'BR') {
      Array.from(node.childNodes).forEach(walk)
    }
  }
  Array.from(el.childNodes).forEach(walk)
  return chars
}

const TEXT_RADIUS = 90
const BUTTON_PULL = 0.3
const CARD_TILT_DEG = 10

/**
 * One pointermove listener, delegated from the page root, driving three
 * mouse-reactive effects at once: magnetic buttons ([.ns-btn]), letters
 * that lean away from the cursor ([data-magnetic-text]), and a 3D tilt on
 * module gallery cards. Disabled for touch, imprecise pointers, and
 * prefers-reduced-motion — those keep the plain CSS :hover states.
 */
export function usePointerInteractions<T extends HTMLElement>() {
  const scope = useRef<T>(null)

  useGSAP(() => {
    const root = scope.current
    if (!root) return

    // Plain matchMedia checks, not gsap.matchMedia(): gsap.matchMedia()
    // wraps its callback in a gsap.context() for auto-revert, and that
    // context's revert-tracking doesn't support quickTo-driven scale /
    // rotateX / rotateY (warns "not eligible for reset" and silently
    // no-ops the tween). x/y are unaffected, which is why buttons partly
    // worked before this was found. Plain checks avoid that context.
    const supportsFineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const prefersMotion = window.matchMedia('(prefers-reduced-motion: no-preference)').matches
    if (!supportsFineHover || !prefersMotion) return

    {
      // ---- Magnetic buttons ----
      // GSAP owns `transform` on these once quickTo touches it (inline
      // style beats the stylesheet's :hover/:active rules), so press
      // feedback moves here too — the CSS :active scale stays only as the
      // fallback for touch and reduced-motion, where this block never runs.
      const buttons = Array.from(root.querySelectorAll<HTMLElement>('.ns-btn'))
      const buttonMotion = new Map<HTMLElement, { xTo: (v: number) => void; yTo: (v: number) => void; sxTo: (v: number) => void; syTo: (v: number) => void }>()
      buttons.forEach((btn) => {
        buttonMotion.set(btn, {
          xTo: gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3' }),
          yTo: gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3' }),
          // GSAP's compound `scale` shorthand warns ("not eligible for
          // reset") and silently no-ops when driven by quickTo inside a
          // matchMedia() context — scaleX/scaleY avoid it.
          sxTo: gsap.quickTo(btn, 'scaleX', { duration: 0.2, ease: 'power3' }),
          syTo: gsap.quickTo(btn, 'scaleY', { duration: 0.2, ease: 'power3' }),
        })
      })
      let activeButton: HTMLElement | null = null
      let pressedButton: HTMLElement | null = null
      const releaseButton = () => {
        if (!activeButton) return
        buttonMotion.get(activeButton)?.xTo(0)
        buttonMotion.get(activeButton)?.yTo(0)
        activeButton.style.removeProperty('--gx')
        activeButton.style.removeProperty('--gy')
        activeButton = null
      }
      const handlePointerDown = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse') return
        const btn = (event.target as HTMLElement)?.closest?.('.ns-btn') as HTMLElement | null
        if (!btn || !buttonMotion.has(btn)) return
        pressedButton = btn
        buttonMotion.get(btn)!.sxTo(0.96)
        buttonMotion.get(btn)!.syTo(0.96)
      }
      const releasePress = () => {
        if (!pressedButton) return
        buttonMotion.get(pressedButton)?.sxTo(1)
        buttonMotion.get(pressedButton)?.syTo(1)
        pressedButton = null
      }

      // ---- Magnetic letters ----
      const chars: CharTarget[] = []
      root.querySelectorAll<HTMLElement>('[data-magnetic-text]').forEach((target) => {
        splitIntoChars(target).forEach((span) => {
          chars.push({
            el: span,
            xTo: gsap.quickTo(span, 'x', { duration: 0.3, ease: 'power3' }),
            yTo: gsap.quickTo(span, 'y', { duration: 0.3, ease: 'power3' }),
            sxTo: gsap.quickTo(span, 'scaleX', { duration: 0.3, ease: 'power3' }),
            syTo: gsap.quickTo(span, 'scaleY', { duration: 0.3, ease: 'power3' }),
            cx: 0,
            cy: 0,
          })
        })
      })
      const refreshCharRects = () => {
        chars.forEach((c) => {
          const r = c.el.getBoundingClientRect()
          c.cx = r.left + r.width / 2
          c.cy = r.top + r.height / 2
        })
      }
      refreshCharRects()
      let rectsDirty = false
      const markDirty = () => { rectsDirty = true }
      window.addEventListener('scroll', markDirty, { passive: true })
      window.addEventListener('resize', markDirty)
      // The hero title measured above may still be mid entrance-animation
      // (translateY) or on fallback font metrics at that instant — both
      // shift char positions after this first measurement without firing
      // scroll/resize. Re-measure once both have had time to settle.
      document.fonts?.ready?.then(markDirty).catch(() => undefined)
      const settleTimer = window.setTimeout(markDirty, 1200)

      // ---- Tilt cards ----
      // Plain gsap.to() here, not quickTo: quickTo's cached setter for
      // rotateX/rotateY silently no-ops ("not eligible for reset") on a
      // target that another gsap.context() already tracks transform
      // properties on (ProductStageReveal's entrance tween) — a one-off
      // tween per move with overwrite:'auto' composes with it correctly.
      let tiltCard: HTMLElement | null = null
      const releaseTilt = () => {
        if (!tiltCard) return
        gsap.to(tiltCard, { rotateX: 0, rotateY: 0, duration: 0.4, ease: 'power3', overwrite: 'auto' })
        tiltCard = null
      }
      // .ns-stage__frame plays a one-shot CSS entrance animation
      // (fill-mode: both) that sets `transform: translateY(0)` on finish.
      // A filled CSS animation keeps cascade priority over an inline
      // style, so GSAP's transform would silently never paint until that
      // animation is cleared — do it once it's had time to finish.
      const tiltTargets = Array.from(root.querySelectorAll<HTMLElement>('.ns-gallery__card-frame, .ns-stage__frame'))
      const clearEntranceAnimation = () => {
        tiltTargets.forEach((el) => { el.style.animation = 'none' })
      }
      const animationClearTimer = window.setTimeout(clearEntranceAnimation, 1200)

      let frameQueued = false
      const handlePointerMove = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse') return
        if (frameQueued) return
        frameQueued = true
        requestAnimationFrame(() => {
          frameQueued = false
          if (rectsDirty) {
            refreshCharRects()
            rectsDirty = false
          }

          const target = event.target as HTMLElement | null

          // magnetic buttons
          const btnTarget = target?.closest?.('.ns-btn') as HTMLElement | null
          if (btnTarget && buttonMotion.has(btnTarget)) {
            if (activeButton && activeButton !== btnTarget) releaseButton()
            activeButton = btnTarget
            const rect = btnTarget.getBoundingClientRect()
            const relX = event.clientX - rect.left - rect.width / 2
            const relY = event.clientY - rect.top - rect.height / 2
            const motion = buttonMotion.get(btnTarget)!
            motion.xTo(relX * BUTTON_PULL)
            motion.yTo(relY * (BUTTON_PULL + 0.05))
            btnTarget.style.setProperty('--gx', `${event.clientX - rect.left}px`)
            btnTarget.style.setProperty('--gy', `${event.clientY - rect.top}px`)
          } else if (activeButton) {
            releaseButton()
          }

          // magnetic letters
          for (const c of chars) {
            const dx = event.clientX - c.cx
            const dy = event.clientY - c.cy
            const dist = Math.hypot(dx, dy)
            if (dist < TEXT_RADIUS) {
              const power = 1 - dist / TEXT_RADIUS
              c.xTo(-dx * power * 0.3)
              c.yTo(-dy * power * 0.45)
              c.sxTo(1 + power * 0.16)
              c.syTo(1 + power * 0.16)
            } else {
              c.xTo(0)
              c.yTo(0)
              c.sxTo(1)
              c.syTo(1)
            }
          }

          // tilt cards
          const cardTarget = target?.closest?.('.ns-gallery__card-frame, .ns-stage__frame') as HTMLElement | null
          if (cardTarget) {
            if (tiltCard !== cardTarget) releaseTilt()
            tiltCard = cardTarget
            const rect = cardTarget.getBoundingClientRect()
            const px = (event.clientX - rect.left) / rect.width - 0.5
            const py = (event.clientY - rect.top) / rect.height - 0.5
            gsap.to(cardTarget, {
              rotateY: px * CARD_TILT_DEG,
              rotateX: -py * CARD_TILT_DEG,
              duration: 0.4,
              ease: 'power3',
              overwrite: 'auto',
            })
          } else if (tiltCard) {
            releaseTilt()
          }
        })
      }

      const handlePointerLeave = () => {
        releaseButton()
        releaseTilt()
        releasePress()
        chars.forEach((c) => {
          c.xTo(0)
          c.yTo(0)
          c.sxTo(1)
          c.syTo(1)
        })
      }

      root.addEventListener('pointermove', handlePointerMove)
      root.addEventListener('pointerleave', handlePointerLeave)
      root.addEventListener('pointerdown', handlePointerDown)
      root.addEventListener('pointerup', releasePress)

      return () => {
        root.removeEventListener('pointermove', handlePointerMove)
        root.removeEventListener('pointerleave', handlePointerLeave)
        root.removeEventListener('pointerdown', handlePointerDown)
        root.removeEventListener('pointerup', releasePress)
        window.removeEventListener('scroll', markDirty)
        window.removeEventListener('resize', markDirty)
        window.clearTimeout(settleTimer)
        window.clearTimeout(animationClearTimer)
      }
    }
  }, { scope })

  return scope
}
