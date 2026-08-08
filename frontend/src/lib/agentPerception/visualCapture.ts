import html2canvas from 'html2canvas-pro'
import { agentWidgetRegistry } from '../agentRegistry/registry'
import { applyRedactions, isVisualCaptureAllowed } from './privacy'
import type { VisualCaptureFailureReason, VisualCaptureMimeType, VisualCaptureResult } from './types'

/**
 * VisualCaptureService (Etapa 5, secciones 10-14 del brief). Captura
 * focalizada SOLO bajo demanda - nunca automatica, nunca periodica
 * (seccion 29). Prioridad de objetivo: widget > viewport completo (seccion
 * 11) - nunca se captura todo el viewport si existe un widget enfocado.
 *
 * Explicitamente NO implementado en esta etapa (seccion 14): getDisplayMedia
 * de escritorio completo, otras ventanas/tabs, webcam. Solo el DOM de
 * NORTHMINE dentro de esta pestaña.
 *
 * Usa `html2canvas-pro` (no `html2canvas`): validado en Chrome real, el
 * `html2canvas` original 1.4.1 no sabe parsear el `color(srgb ...)` que
 * Chrome moderno usa para serializar `getComputedStyle` de cualquier color
 * con alpha (lo que incluye casi cualquier elemento de esta UI, via
 * color-mix() y variables CSS) y la captura fallaba con "Attempting to
 * parse an unsupported color function". `html2canvas-pro` es un fork con la
 * misma API mantenido especificamente para soportar color(), oklch(), etc.
 */

const MAX_CAPTURE_DIMENSION_PX = 1600
const CAPTURE_MIME: VisualCaptureMimeType = 'image/webp'
const CAPTURE_QUALITY = 0.82

export class VisualCaptureUnavailableError extends Error {
  constructor(public readonly reason: VisualCaptureFailureReason, message: string) {
    super(message)
    this.name = 'VisualCaptureUnavailableError'
  }
}

let captureCounter = 0
function newCaptureId(): string {
  captureCounter += 1
  return `cap-${Date.now().toString(36)}-${captureCounter}`
}

async function canvasToBlob(canvas: HTMLCanvasElement, mimeType: VisualCaptureMimeType, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo codificar la captura'))), mimeType, quality)
  })
}

function clampCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  if (source.width <= MAX_CAPTURE_DIMENSION_PX && source.height <= MAX_CAPTURE_DIMENSION_PX) return source
  const scale = MAX_CAPTURE_DIMENSION_PX / Math.max(source.width, source.height)
  const scaled = document.createElement('canvas')
  scaled.width = Math.round(source.width * scale)
  scaled.height = Math.round(source.height * scale)
  const ctx = scaled.getContext('2d')
  if (!ctx) return source
  ctx.drawImage(source, 0, 0, scaled.width, scaled.height)
  return scaled
}

async function captureElement(element: HTMLElement): Promise<{ canvas: HTMLCanvasElement; redactedSelectors: string[] }> {
  const { redactedSelectors, restore } = applyRedactions(document)
  try {
    const canvas = await html2canvas(element, { backgroundColor: null, logging: false, useCORS: true })
    return { canvas, redactedSelectors }
  } finally {
    restore()
  }
}

export async function captureWidget(widgetId: string): Promise<VisualCaptureResult> {
  if (!isVisualCaptureAllowed()) {
    throw new VisualCaptureUnavailableError('privacy_disabled', 'La percepcion visual esta desactivada por el usuario.')
  }
  const element = agentWidgetRegistry.getElement(widgetId)
  if (!element) {
    throw new VisualCaptureUnavailableError('target_not_found', `El widget "${widgetId}" no esta montado en esta vista.`)
  }
  const perceived = agentWidgetRegistry.perceivedWidget(widgetId)
  if (perceived && perceived.visibility.level !== 'visible' && perceived.visibility.level !== 'partially_visible') {
    throw new VisualCaptureUnavailableError('target_not_visible', `El widget "${widgetId}" no esta visible en pantalla ahora mismo.`)
  }

  let canvas: HTMLCanvasElement
  let redactedSelectors: string[]
  try {
    ({ canvas, redactedSelectors } = await captureElement(element))
  } catch (error) {
    throw new VisualCaptureUnavailableError('capture_failed', error instanceof Error ? error.message : 'Fallo la captura del widget.')
  }
  const clamped = clampCanvas(canvas)
  const blob = await canvasToBlob(clamped, CAPTURE_MIME, CAPTURE_QUALITY)

  return {
    captureId: newCaptureId(),
    targetType: 'widget',
    widgetId,
    width: clamped.width,
    height: clamped.height,
    mimeType: CAPTURE_MIME,
    capturedAt: new Date().toISOString(),
    redactionsApplied: redactedSelectors,
    blob,
  }
}

export async function captureViewport(): Promise<VisualCaptureResult> {
  if (!isVisualCaptureAllowed()) {
    throw new VisualCaptureUnavailableError('privacy_disabled', 'La percepcion visual esta desactivada por el usuario.')
  }
  const root = document.querySelector('main') ?? document.body

  let canvas: HTMLCanvasElement
  let redactedSelectors: string[]
  try {
    ({ canvas, redactedSelectors } = await captureElement(root as HTMLElement))
  } catch (error) {
    throw new VisualCaptureUnavailableError('capture_failed', error instanceof Error ? error.message : 'Fallo la captura del viewport.')
  }
  const clamped = clampCanvas(canvas)
  const blob = await canvasToBlob(clamped, CAPTURE_MIME, CAPTURE_QUALITY)

  return {
    captureId: newCaptureId(),
    targetType: 'viewport',
    width: clamped.width,
    height: clamped.height,
    mimeType: CAPTURE_MIME,
    capturedAt: new Date().toISOString(),
    redactionsApplied: redactedSelectors,
    blob,
  }
}
