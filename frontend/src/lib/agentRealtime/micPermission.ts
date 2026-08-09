/**
 * Onboarding de permiso de microfono (separado deliberadamente de
 * ConversationTurnManager): un click fisico del usuario debe llegar a
 * `getUserMedia` sin ningun await ajeno de por medio (llamada a backend,
 * Planner, espera de WebSocket, ElevenLabs, timers) - eso es lo que
 * garantiza que el navegador siga considerando la llamada "activada por
 * el usuario" en todos los dispositivos, incluidos moviles.
 *
 * `queryMicPermissionState` es la UNICA excepcion: se usa antes del click
 * real para decidir si hace falta mostrar el modal explicativo de
 * NORTHMINE o si se puede pedir el stream directo (permiso ya concedido).
 * No consume "activacion de usuario" - resuelve casi instantaneo y no
 * requiere gesto propio, a diferencia de getUserMedia.
 */

export type MicPermissionQueryState = 'granted' | 'prompt' | 'denied' | 'unsupported'

export const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
}

export async function queryMicPermissionState(): Promise<MicPermissionQueryState> {
  try {
    // Safari (desktop y iOS) no soporta 'microphone' en la Permissions API -
    // ahi esto siempre cae al catch y se trata como 'unsupported', que el
    // llamador debe tratar igual que 'prompt' (mostrar la explicacion antes
    // de pedir, unico camino seguro sin poder pre-consultar el estado real).
    const permissions = (navigator as Navigator & { permissions?: Permissions }).permissions
    if (!permissions?.query) return 'unsupported'
    const status = await permissions.query({ name: 'microphone' as PermissionName })
    if (status.state === 'granted' || status.state === 'denied' || status.state === 'prompt') {
      return status.state
    }
    return 'unsupported'
  } catch {
    return 'unsupported'
  }
}

export type MicRequestErrorKind = 'blocked' | 'no_device' | 'unknown'

export function classifyMicRequestError(error: unknown): MicRequestErrorKind {
  const name = (error as DOMException | undefined)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'blocked'
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return 'no_device'
  return 'unknown'
}

/** Unico punto de llamada directa a getUserMedia para el flujo de
 * onboarding - se invoca SOLO desde el handler de un click real, sin
 * ningun await previo salvo esta misma promesa. */
export async function requestMicrophoneStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS)
}
