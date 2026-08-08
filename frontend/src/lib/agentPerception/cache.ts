/**
 * Cache de percepcion (Etapa 5, secciones 30-31 del brief). Evita analizar
 * repetidamente la misma pantalla: fingerprint = widgetId + filtros +
 * entidades seleccionadas + un "data version" simple (semanticSummary del
 * widget, que ya cambia cuando el dato subyacente cambia). Si nada de eso
 * cambio desde la ultima observacion visual, se reutiliza dentro de un TTL
 * corto - nunca se reutiliza si datos/filtro/entidad/widget cambiaron o el
 * TTL expiro (invalidacion explicita, no "mejor esfuerzo").
 */

const DEFAULT_TTL_MS = 45_000

interface CacheEntry<T> {
  value: T
  fingerprint: string
  expiresAt: number
}

export class PerceptionCache<T> {
  private entries = new Map<string, CacheEntry<T>>()

  constructor(private readonly ttlMs: number = DEFAULT_TTL_MS) {}

  get(key: string, fingerprint: string): T | null {
    const entry = this.entries.get(key)
    if (!entry) return null
    if (entry.fingerprint !== fingerprint) return null
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key)
      return null
    }
    return entry.value
  }

  set(key: string, fingerprint: string, value: T): void {
    this.entries.set(key, { value, fingerprint, expiresAt: Date.now() + this.ttlMs })
  }

  clear(): void {
    this.entries.clear()
  }
}

export function buildPerceptionFingerprint(parts: Record<string, unknown>): string {
  const normalized = Object.keys(parts)
    .sort()
    .map((key) => `${key}=${JSON.stringify(parts[key])}`)
    .join('|')
  // Hash simple (no criptografico - solo para detectar "cambio si/no"),
  // evita strings de fingerprint enormes en memoria.
  let hash = 0
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0
  }
  return `fp-${hash}`
}

/**
 * Limite de tasa simple por ventana deslizante (Etapa 5, seccion 31).
 * Usado para capturas de widget/viewport - "Max viewport captures/minute: 4,
 * Max widget captures/minute: 10" son defaults configurables, no hardcode
 * silencioso: se pasan explicitamente al construir cada limitador.
 */
export class PerceptionRateLimiter {
  private timestamps: number[] = []

  constructor(private readonly limit: number, private readonly windowMs: number = 60_000) {}

  allow(): boolean {
    const now = Date.now()
    const cutoff = now - this.windowMs
    this.timestamps = this.timestamps.filter((t) => t > cutoff)
    if (this.timestamps.length >= this.limit) return false
    this.timestamps.push(now)
    return true
  }

  remaining(): number {
    const now = Date.now()
    const cutoff = now - this.windowMs
    this.timestamps = this.timestamps.filter((t) => t > cutoff)
    return Math.max(0, this.limit - this.timestamps.length)
  }
}
