import { describe, expect, it } from 'vitest'
import config from '../../../vite.config'

/**
 * Etapa 6.1, seccion 13 del brief: regresion dedicada para el bug real que
 * dejaba el Agent Runtime en "Conectando..." - el proxy HTTP de Vite
 * reenvia REST normalmente sin `ws: true`, asi que ese caso NUNCA fallaba en
 * pruebas manuales de REST. Si alguien vuelve a quitar `ws: true` (por
 * ejemplo al "limpiar" la config), este test debe fallar de inmediato.
 */
describe('vite.config proxy', () => {
  it('reenvia upgrades WebSocket en /api (ws: true)', () => {
    const proxy = config.server?.proxy as Record<string, { ws?: boolean }> | undefined
    expect(proxy?.['/api']?.ws).toBe(true)
  })
})
