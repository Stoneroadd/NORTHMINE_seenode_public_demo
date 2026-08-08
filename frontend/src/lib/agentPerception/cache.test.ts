import { describe, expect, it, vi } from 'vitest'
import { PerceptionCache, PerceptionRateLimiter, buildPerceptionFingerprint } from './cache'

/**
 * Cache y limites de tasa de percepcion (Etapa 5, secciones 30-31). Sin
 * mock de red ni DOM - son estructuras de datos puras (Map + timestamps).
 */

describe('PerceptionCache', () => {
  it('devuelve el valor cacheado si el fingerprint no cambio y el TTL no expiro', () => {
    const cache = new PerceptionCache<string>(1000)
    cache.set('widget:w1', 'fp-a', 'observacion-1')
    expect(cache.get('widget:w1', 'fp-a')).toBe('observacion-1')
  })

  it('invalida si el fingerprint cambio (dato/filtro/entidad distintos)', () => {
    const cache = new PerceptionCache<string>(1000)
    cache.set('widget:w1', 'fp-a', 'observacion-1')
    expect(cache.get('widget:w1', 'fp-b')).toBeNull()
  })

  it('invalida al expirar el TTL aunque el fingerprint sea identico', () => {
    vi.useFakeTimers()
    try {
      const cache = new PerceptionCache<string>(1000)
      cache.set('widget:w1', 'fp-a', 'observacion-1')
      vi.advanceTimersByTime(1001)
      expect(cache.get('widget:w1', 'fp-a')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('claves distintas no se pisan entre si (viewport vs widget)', () => {
    const cache = new PerceptionCache<string>(1000)
    cache.set('viewport', 'fp-a', 'observacion-viewport')
    cache.set('widget:w1', 'fp-a', 'observacion-widget')
    expect(cache.get('viewport', 'fp-a')).toBe('observacion-viewport')
    expect(cache.get('widget:w1', 'fp-a')).toBe('observacion-widget')
  })

  it('get de una clave nunca vista devuelve null sin lanzar', () => {
    const cache = new PerceptionCache<string>(1000)
    expect(cache.get('no-existe', 'fp-x')).toBeNull()
  })

  it('clear() vacia todas las entradas', () => {
    const cache = new PerceptionCache<string>(1000)
    cache.set('widget:w1', 'fp-a', 'observacion-1')
    cache.clear()
    expect(cache.get('widget:w1', 'fp-a')).toBeNull()
  })
})

describe('buildPerceptionFingerprint', () => {
  it('es deterministico e independiente del orden de las claves', () => {
    const a = buildPerceptionFingerprint({ widgetId: 'w1', moduleId: 'produccion', filters: { shift: 'DIA' } })
    const b = buildPerceptionFingerprint({ moduleId: 'produccion', filters: { shift: 'DIA' }, widgetId: 'w1' })
    expect(a).toBe(b)
  })

  it('cambia si cualquier valor cambia', () => {
    const a = buildPerceptionFingerprint({ widgetId: 'w1', semanticSummary: '8420 t/h.' })
    const b = buildPerceptionFingerprint({ widgetId: 'w1', semanticSummary: '9100 t/h.' })
    expect(a).not.toBe(b)
  })
})

describe('PerceptionRateLimiter', () => {
  it('permite hasta el limite configurado y luego rechaza dentro de la ventana', () => {
    const limiter = new PerceptionRateLimiter(2, 60_000)
    expect(limiter.allow()).toBe(true)
    expect(limiter.allow()).toBe(true)
    expect(limiter.allow()).toBe(false)
  })

  it('remaining() refleja el presupuesto restante', () => {
    const limiter = new PerceptionRateLimiter(3, 60_000)
    expect(limiter.remaining()).toBe(3)
    limiter.allow()
    expect(limiter.remaining()).toBe(2)
  })

  it('libera presupuesto una vez que la ventana desliza', () => {
    vi.useFakeTimers()
    try {
      const limiter = new PerceptionRateLimiter(1, 1000)
      expect(limiter.allow()).toBe(true)
      expect(limiter.allow()).toBe(false)
      vi.advanceTimersByTime(1001)
      expect(limiter.allow()).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
