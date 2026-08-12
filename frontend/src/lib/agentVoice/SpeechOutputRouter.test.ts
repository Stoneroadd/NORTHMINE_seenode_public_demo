import { describe, expect, it } from 'vitest'
import { SpeechOutputRouter } from './SpeechOutputRouter'
import type { AgentSpeechOutput, AgentSpeechSegment, SpeechPlaybackResult, VoiceOutputProviderName } from './types'

/**
 * Doble de prueba controlable: `speak()` no resuelve solo hasta que el test
 * llama `resolveCurrent()`, para poder inspeccionar la cola mientras un
 * segmento sigue "en curso" - sin esto, la reproduccion sincronica de un
 * fake ingenuo haria que la cola se vaciara antes de poder observarla.
 */
class ControllableFakeOutput implements AgentSpeechOutput {
  readonly providerName: VoiceOutputProviderName
  readonly calls: AgentSpeechSegment[] = []
  shouldFail = false
  private speaking = false
  private pending: { resolve: () => void; reject: (e: Error) => void } | null = null

  constructor(name: VoiceOutputProviderName) {
    this.providerName = name
  }

  speak(segment: AgentSpeechSegment): Promise<void> {
    this.calls.push(segment)
    if (this.shouldFail) {
      return Promise.reject(new Error('provider failed'))
    }
    this.speaking = true
    return new Promise((resolve, reject) => {
      this.pending = {
        resolve: () => { this.speaking = false; resolve() },
        reject: (e) => { this.speaking = false; reject(e) },
      }
    })
  }

  resolveCurrent(): void {
    this.pending?.resolve()
    this.pending = null
  }

  stop(): void {
    this.speaking = false
    const pending = this.pending
    this.pending = null
    pending?.reject(new Error('stopped'))
  }

  clearQueue(): void {}
  setMuted(): void {}
  isSpeaking(): boolean {
    return this.speaking
  }
}

function makeSegment(overrides: Partial<AgentSpeechSegment>): AgentSpeechSegment {
  return { segmentId: 'seg-1', text: 'hola', priority: 'status', sequence: 1, interruptible: true, ...overrides }
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('SpeechOutputRouter', () => {
  it('reproduce segmentos en orden de prioridad: warning > result > finding > status', async () => {
    const eleven = new ControllableFakeOutput('elevenlabs')
    const browser = new ControllableFakeOutput('browser')
    const textOnly = new ControllableFakeOutput('text_only')
    const router = new SpeechOutputRouter(eleven, browser, textOnly)

    router.enqueue(makeSegment({ segmentId: 's1', priority: 'status', sequence: 1 }))
    await flushMicrotasks()
    // el primer segmento ya esta "en curso" (controllable, no resuelve solo)
    router.enqueue(makeSegment({ segmentId: 's2', priority: 'finding', sequence: 2 }))
    router.enqueue(makeSegment({ segmentId: 's3', priority: 'warning', sequence: 3 }))
    router.enqueue(makeSegment({ segmentId: 's4', priority: 'result', sequence: 4 }))

    const queued = router.peekQueue().map((s) => s.segmentId)
    expect(queued).toEqual(['s3', 's4', 's2']) // warning, result, finding (status s1 ya se esta reproduciendo)

    eleven.resolveCurrent()
    await flushMicrotasks()
  })

  it('deduplica por segmentId - el mismo segmento nunca se reproduce dos veces', async () => {
    const eleven = new ControllableFakeOutput('elevenlabs')
    const browser = new ControllableFakeOutput('browser')
    const textOnly = new ControllableFakeOutput('text_only')
    const router = new SpeechOutputRouter(eleven, browser, textOnly)

    router.enqueue(makeSegment({ segmentId: 'dup-1' }))
    router.enqueue(makeSegment({ segmentId: 'dup-1' }))
    router.enqueue(makeSegment({ segmentId: 'dup-1' }))
    await flushMicrotasks()

    expect(eleven.calls.filter((c) => c.segmentId === 'dup-1')).toHaveLength(1)
    eleven.resolveCurrent()
  })

  it('un resultado reemplaza los status pendientes en cola', async () => {
    const eleven = new ControllableFakeOutput('elevenlabs')
    const browser = new ControllableFakeOutput('browser')
    const textOnly = new ControllableFakeOutput('text_only')
    const router = new SpeechOutputRouter(eleven, browser, textOnly)

    router.enqueue(makeSegment({ segmentId: 's1', priority: 'status', sequence: 1 }))
    await flushMicrotasks()
    router.enqueue(makeSegment({ segmentId: 's2', priority: 'status', sequence: 2 }))
    router.enqueue(makeSegment({ segmentId: 's3', priority: 'result', sequence: 3 }))

    expect(router.peekQueue().map((s) => s.segmentId)).toEqual(['s3'])
    eleven.resolveCurrent()
  })

  it('hace fallback a BrowserSpeechOutput cuando ElevenLabs falla', async () => {
    const eleven = new ControllableFakeOutput('elevenlabs')
    eleven.shouldFail = true
    const browser = new ControllableFakeOutput('browser')
    const textOnly = new ControllableFakeOutput('text_only')
    const router = new SpeechOutputRouter(eleven, browser, textOnly)

    const results: SpeechPlaybackResult[] = []
    router.onPlaybackResult((r) => results.push(r))

    router.enqueue(makeSegment({ segmentId: 's1' }))
    await flushMicrotasks()
    expect(browser.calls).toHaveLength(1)
    browser.resolveCurrent()
    await flushMicrotasks()

    expect(results).toHaveLength(1)
    expect(results[0].provider).toBe('browser')
    expect(results[0].result).toBe('completed')
  })

  it('barge-in: stop() interrumpe sin encadenar fallback ni reproducir la cola descartada', async () => {
    const eleven = new ControllableFakeOutput('elevenlabs')
    const browser = new ControllableFakeOutput('browser')
    const textOnly = new ControllableFakeOutput('text_only')
    const router = new SpeechOutputRouter(eleven, browser, textOnly)

    const results: SpeechPlaybackResult[] = []
    router.onPlaybackResult((r) => results.push(r))

    router.enqueue(makeSegment({ segmentId: 's1' }))
    await flushMicrotasks()
    router.enqueue(makeSegment({ segmentId: 's2', priority: 'finding', sequence: 2 }))
    expect(router.peekQueue()).toHaveLength(1)

    router.stop()
    await flushMicrotasks()

    expect(results).toHaveLength(1)
    expect(results[0].result).toBe('interrupted')
    // el segmento obsoleto en cola se descarta, nunca se reproduce
    expect(router.peekQueue()).toHaveLength(0)
    expect(browser.calls).toHaveLength(0)
  })

  it('una advertencia interrumpe lo que se este reproduciendo', async () => {
    const eleven = new ControllableFakeOutput('elevenlabs')
    const browser = new ControllableFakeOutput('browser')
    const textOnly = new ControllableFakeOutput('text_only')
    const router = new SpeechOutputRouter(eleven, browser, textOnly)

    router.enqueue(makeSegment({ segmentId: 's1', priority: 'status' }))
    await flushMicrotasks()
    expect(router.isSpeaking()).toBe(true)

    router.enqueue(makeSegment({ segmentId: 'warn-1', priority: 'warning', sequence: 2 }))
    // enqueue de una warning llama stop() sobre el provider activo
    expect(eleven.isSpeaking()).toBe(false)
  })

  it('mute detiene la reproduccion y evita nuevos audios', async () => {
    const eleven = new ControllableFakeOutput('elevenlabs')
    const browser = new ControllableFakeOutput('browser')
    const textOnly = new ControllableFakeOutput('text_only')
    const router = new SpeechOutputRouter(eleven, browser, textOnly)

    router.enqueue(makeSegment({ segmentId: 's1' }))
    await flushMicrotasks()
    router.setMuted(true)
    expect(eleven.isSpeaking()).toBe(false)

    router.enqueue(makeSegment({ segmentId: 's2' }))
    await flushMicrotasks()
    expect(eleven.calls.filter((c) => c.segmentId === 's2')).toHaveLength(0)
  })

  it('demo deterministica conserva el ACK usando solo salida de texto', async () => {
    const eleven = new ControllableFakeOutput('elevenlabs')
    const browser = new ControllableFakeOutput('browser')
    const textOnly = new ControllableFakeOutput('text_only')
    const router = new SpeechOutputRouter(eleven, browser, textOnly)
    const results: SpeechPlaybackResult[] = []
    router.onPlaybackResult((result) => results.push(result))
    router.setForcedTextOnly(true)

    router.enqueue(makeSegment({ segmentId: 'demo-text' }))
    await flushMicrotasks()
    expect(eleven.calls).toHaveLength(0)
    expect(browser.calls).toHaveLength(0)
    expect(textOnly.calls).toHaveLength(1)
    textOnly.resolveCurrent()
    await flushMicrotasks()
    expect(results[0]).toMatchObject({ segmentId: 'demo-text', provider: 'text_only', result: 'completed' })
  })
})
