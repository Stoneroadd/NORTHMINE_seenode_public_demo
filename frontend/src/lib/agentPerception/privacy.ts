import type { PerceptionMode } from './types'

/**
 * Privacidad visual (Etapa 5, secciones 12 y 33 del brief). Dos mecanismos
 * complementarios:
 *
 * 1. Modo de percepcion global (persistido en localStorage, por-pestaña no
 *    hace falta ser por-sesion): el usuario puede desactivar la vision por
 *    completo. Si `visual_disabled`, VisualCaptureService rechaza CUALQUIER
 *    captura antes de tocar el DOM.
 * 2. Redaccion por elemento: cualquier nodo marcado `data-agent-private` o
 *    `data-agent-redact` se oculta/enmascara temporalmente, se captura, y
 *    se restaura de inmediato - nunca queda oculto mas tiempo del necesario
 *    para el propio html2canvas.
 */

const STORAGE_KEY = 'northmine-agent-perception-mode'
const DEFAULT_MODE: PerceptionMode = 'semantic_plus_visual_on_demand'

export function getPerceptionMode(): PerceptionMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'semantic_only' || stored === 'semantic_plus_visual_on_demand' || stored === 'visual_disabled') {
      return stored
    }
  } catch {
    // localStorage no disponible - se mantiene el default seguro (visual on-demand, nunca automatico)
  }
  return DEFAULT_MODE
}

export function setPerceptionMode(mode: PerceptionMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // sin persistencia disponible - el modo sigue aplicandose en memoria para esta sesion via el caller
  }
}

export function isVisualCaptureAllowed(): boolean {
  return getPerceptionMode() !== 'visual_disabled'
}

interface RedactedElement {
  element: HTMLElement
  previousVisibility: string
  previousDisplay: string
}

/**
 * Oculta temporalmente todo elemento marcado como privado/redactado DENTRO
 * de `root` (o todo el documento si no se pasa root). Devuelve una funcion
 * de restauracion que DEBE llamarse inmediatamente despues de capturar,
 * incluso si la captura fallo (try/finally en el llamador).
 */
export function applyRedactions(root: ParentNode = document): { redactedSelectors: string[]; restore: () => void } {
  const selector = '[data-agent-private="true"], [data-agent-redact="true"]'
  const elements = Array.from(root.querySelectorAll<HTMLElement>(selector))
  const redacted: RedactedElement[] = []
  const redactedSelectors: string[] = []

  for (const element of elements) {
    redacted.push({
      element,
      previousVisibility: element.style.visibility,
      previousDisplay: element.style.display,
    })
    const label = element.getAttribute('data-agent-private') === 'true' ? 'data-agent-private' : 'data-agent-redact'
    redactedSelectors.push(`${label}:${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}`)
    element.style.visibility = 'hidden'
  }

  const restore = () => {
    for (const { element, previousVisibility, previousDisplay } of redacted) {
      element.style.visibility = previousVisibility
      element.style.display = previousDisplay
    }
  }

  return { redactedSelectors, restore }
}
