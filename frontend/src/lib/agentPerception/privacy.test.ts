import { beforeEach, describe, expect, it } from 'vitest'
import { applyRedactions, getPerceptionMode, isVisualCaptureAllowed, setPerceptionMode } from './privacy'

/**
 * Privacidad visual (Etapa 5, secciones 12 y 33). El entorno de test es
 * Node puro (vitest.config.ts: environment 'node'), sin `localStorage` ni
 * DOM real - por eso: (1) se instala un polyfill de localStorage minimo en
 * memoria para probar la persistencia real del modo, y (2) applyRedactions
 * se prueba con objetos que solo implementan el subconjunto de ParentNode/
 * HTMLElement que la funcion realmente usa (querySelectorAll/style/
 * getAttribute), no jsdom.
 */

class MemoryStorage {
  private store = new Map<string, string>()
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  clear(): void {
    this.store.clear()
  }
}

beforeEach(() => {
  ;(globalThis as any).localStorage = new MemoryStorage()
})

describe('getPerceptionMode / setPerceptionMode', () => {
  it('sin nada persistido, el default es semantic_plus_visual_on_demand (vision on-demand, nunca automatica)', () => {
    expect(getPerceptionMode()).toBe('semantic_plus_visual_on_demand')
  })

  it('persiste y relee el modo elegido por el usuario', () => {
    setPerceptionMode('visual_disabled')
    expect(getPerceptionMode()).toBe('visual_disabled')
  })

  it('un valor corrupto en localStorage cae al default seguro, no lanza', () => {
    localStorage.setItem('northmine-agent-perception-mode', 'algo-invalido')
    expect(getPerceptionMode()).toBe('semantic_plus_visual_on_demand')
  })

  it('sin localStorage disponible (entorno restringido), no lanza y usa el default', () => {
    delete (globalThis as any).localStorage
    expect(() => getPerceptionMode()).not.toThrow()
    expect(getPerceptionMode()).toBe('semantic_plus_visual_on_demand')
  })
})

describe('isVisualCaptureAllowed', () => {
  it('true en el modo por defecto y en semantic_only', () => {
    expect(isVisualCaptureAllowed()).toBe(true)
    setPerceptionMode('semantic_only')
    expect(isVisualCaptureAllowed()).toBe(true)
  })

  it('false solo cuando el usuario desactivo la percepcion visual explicitamente', () => {
    setPerceptionMode('visual_disabled')
    expect(isVisualCaptureAllowed()).toBe(false)
  })
})

function fakeElement(attrs: Record<string, string>) {
  const attributes = new Map(Object.entries(attrs))
  return {
    tagName: 'DIV',
    id: attrs.id ?? '',
    style: { visibility: '', display: '' },
    getAttribute: (name: string) => attributes.get(name) ?? null,
  }
}

describe('applyRedactions', () => {
  it('oculta (visibility hidden) cada elemento marcado privado/redactado y nada mas', () => {
    const priv = fakeElement({ 'data-agent-private': 'true' })
    const other = fakeElement({})
    const root = { querySelectorAll: () => [priv] } as unknown as ParentNode

    const { redactedSelectors } = applyRedactions(root)

    expect(priv.style.visibility).toBe('hidden')
    expect(other.style.visibility).toBe('')
    expect(redactedSelectors).toEqual(['data-agent-private:div'])
  })

  it('restore() devuelve visibility/display al valor previo exacto', () => {
    const el = fakeElement({ 'data-agent-redact': 'true' })
    el.style.visibility = 'visible'
    el.style.display = 'flex'
    const root = { querySelectorAll: () => [el] } as unknown as ParentNode

    const { restore } = applyRedactions(root)
    expect(el.style.visibility).toBe('hidden')

    restore()
    expect(el.style.visibility).toBe('visible')
    expect(el.style.display).toBe('flex')
  })

  it('etiqueta el selector segun cual atributo disparo la redaccion, incluyendo el id', () => {
    const el = fakeElement({ 'data-agent-redact': 'true', id: 'salary-widget' })
    const root = { querySelectorAll: () => [el] } as unknown as ParentNode

    const { redactedSelectors } = applyRedactions(root)
    expect(redactedSelectors).toEqual(['data-agent-redact:div#salary-widget'])
  })

  it('sin elementos marcados, no redacta nada', () => {
    const root = { querySelectorAll: () => [] } as unknown as ParentNode
    const { redactedSelectors } = applyRedactions(root)
    expect(redactedSelectors).toEqual([])
  })
})
