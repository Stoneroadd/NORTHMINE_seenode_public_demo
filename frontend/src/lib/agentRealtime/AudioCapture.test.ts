import { afterEach, describe, expect, it, vi } from 'vitest'
import { AudioCapture } from './AudioCapture'

/**
 * Onboarding de microfono: `start(existingStream)` existe para que el modal
 * de permiso (micPermission.ts) entregue el MediaStream que ya obtuvo con
 * getUserMedia, sin que AudioCapture lo vuelva a pedir (seccion "no volver
 * a pedir el microfono" del pedido del usuario).
 */

function fakeAnalyser() {
  return {
    fftSize: 0,
    frequencyBinCount: 8,
    connect: vi.fn(),
    getByteTimeDomainData: vi.fn(),
  }
}

function fakeAudioContext() {
  return {
    createMediaStreamSource: vi.fn(() => ({ connect: vi.fn() })),
    createAnalyser: vi.fn(() => fakeAnalyser()),
    close: vi.fn().mockResolvedValue(undefined),
  }
}

function fakeStream() {
  const track = { enabled: true, stop: vi.fn() }
  return { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream
}

describe('AudioCapture.start(existingStream)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('con un stream ya obtenido, nunca llama a getUserMedia de nuevo', async () => {
    const getUserMedia = vi.fn()
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia, addEventListener: vi.fn(), removeEventListener: vi.fn() } })
    vi.stubGlobal('window', { AudioContext: vi.fn().mockImplementation(fakeAudioContext) })
    vi.stubGlobal('requestAnimationFrame', vi.fn())

    const capture = new AudioCapture()
    await capture.start(fakeStream())

    expect(getUserMedia).not.toHaveBeenCalled()
    expect(capture.getPermissionState()).toBe('granted')
  })

  it('sin stream previo, pide el microfono con getUserMedia como siempre', async () => {
    const stream = fakeStream()
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia, addEventListener: vi.fn(), removeEventListener: vi.fn() } })
    vi.stubGlobal('window', { AudioContext: vi.fn().mockImplementation(fakeAudioContext) })
    vi.stubGlobal('requestAnimationFrame', vi.fn())

    const capture = new AudioCapture()
    await capture.start()

    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(capture.getPermissionState()).toBe('granted')
  })
})
