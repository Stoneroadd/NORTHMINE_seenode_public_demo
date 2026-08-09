import { afterEach, describe, expect, it, vi } from 'vitest'
import { classifyMicRequestError, queryMicPermissionState } from './micPermission'

/**
 * Onboarding de microfono (pedido explicito del usuario tras reportar que
 * "no tengo acceso al microfono" en 4 dispositivos distintos): la causa
 * real resulto ser un header Permissions-Policy del servidor, pero
 * ademas se separo el flujo de permiso de ConversationTurnManager para
 * que el primer click real dispare getUserMedia sin ningun await ajeno
 * de por medio (backend, Planner, WS, ElevenLabs, timers) - critico en
 * moviles, donde la "activacion de usuario" expira rapido.
 */

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('classifyMicRequestError', () => {
  it('NotAllowedError y SecurityError se tratan como bloqueado', () => {
    expect(classifyMicRequestError(new DOMException('x', 'NotAllowedError'))).toBe('blocked')
    expect(classifyMicRequestError(new DOMException('x', 'SecurityError'))).toBe('blocked')
  })

  it('NotFoundError/DevicesNotFoundError/OverconstrainedError se tratan como sin dispositivo', () => {
    expect(classifyMicRequestError(new DOMException('x', 'NotFoundError'))).toBe('no_device')
    expect(classifyMicRequestError(new DOMException('x', 'DevicesNotFoundError'))).toBe('no_device')
    expect(classifyMicRequestError(new DOMException('x', 'OverconstrainedError'))).toBe('no_device')
  })

  it('cualquier otro error cae en unknown, nunca se inventa una causa especifica', () => {
    expect(classifyMicRequestError(new DOMException('x', 'AbortError'))).toBe('unknown')
    expect(classifyMicRequestError(new Error('algo raro'))).toBe('unknown')
    expect(classifyMicRequestError(undefined)).toBe('unknown')
  })
})

describe('queryMicPermissionState', () => {
  it('devuelve unsupported si navigator.permissions no existe (Safari)', async () => {
    vi.stubGlobal('navigator', {})
    expect(await queryMicPermissionState()).toBe('unsupported')
  })

  it('devuelve unsupported si la consulta lanza una excepcion', async () => {
    vi.stubGlobal('navigator', { permissions: { query: vi.fn().mockRejectedValue(new Error('nope')) } })
    expect(await queryMicPermissionState()).toBe('unsupported')
  })

  it('propaga granted/denied/prompt tal cual las devuelve el navegador', async () => {
    for (const state of ['granted', 'denied', 'prompt'] as const) {
      vi.stubGlobal('navigator', { permissions: { query: vi.fn().mockResolvedValue({ state }) } })
      expect(await queryMicPermissionState()).toBe(state)
    }
  })
})
