import { apiFetch } from '../api'
import type { VisualCaptureResult, VisualObservation } from './types'

/**
 * Cliente del endpoint de vision (Etapa 5, seccion 15-17 del brief). El
 * blob capturado se sube directo al backend (nunca a un proveedor externo
 * desde el navegador) - la API key del proveedor generativo vive solo en
 * el backend, igual que ElevenLabs en Etapa 4.
 */

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // data:<mime>;base64,<payload> - solo interesa el payload
      const commaIndex = result.indexOf(',')
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la captura'))
    reader.readAsDataURL(blob)
  })
}

export interface VisionAnalysisContext {
  moduleId?: string | null
  widgetLabel?: string | null
  period?: string | null
  equipmentId?: string | null
  semanticSummary?: string | null
}

export async function analyzeCapture(capture: VisualCaptureResult, context: VisionAnalysisContext): Promise<VisualObservation> {
  const imageBase64 = await blobToBase64(capture.blob)
  const response = await apiFetch<{
    observation_id: string; capture_id: string; target_type: 'widget' | 'viewport'; widget_id: string | null
    summary: string; detected_elements: string[]; possible_anomalies: string[]; uncertainty: string[]
    confidence: 'low' | 'medium' | 'high'; created_at: string
  }>('/api/ai-agent/vision/analyze', {
    method: 'POST',
    body: JSON.stringify({
      capture_id: capture.captureId,
      target_type: capture.targetType,
      widget_id: capture.widgetId ?? null,
      mime_type: capture.mimeType,
      image_base64: imageBase64,
      context: {
        module_id: context.moduleId ?? null,
        widget_id: capture.widgetId ?? null,
        widget_label: context.widgetLabel ?? null,
        period: context.period ?? null,
        equipment_id: context.equipmentId ?? null,
        semantic_summary: context.semanticSummary ?? null,
      },
    }),
  })

  return {
    observationId: response.observation_id,
    captureId: response.capture_id,
    targetType: response.target_type,
    widgetId: response.widget_id ?? undefined,
    summary: response.summary,
    detectedElements: response.detected_elements,
    possibleAnomalies: response.possible_anomalies,
    uncertainty: response.uncertainty,
    confidence: response.confidence,
    createdAt: response.created_at,
  }
}
