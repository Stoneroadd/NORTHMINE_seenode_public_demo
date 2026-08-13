import { describe, expect, it } from 'vitest'
import { buildOperationalInsights } from './operationalInsights'
import type { DemoSummary, SmartAlert, DashboardKpis } from './api'

/**
 * lib/operationalInsights.ts es, desde C2, la unica fuente de verdad del
 * dominio "diagnostico ejecutivo operacional" (services/operationalInsights.ts,
 * su duplicado sin consumidores reales, fue eliminado). Estos tests cubren
 * el contrato de salida (status/severity/domain) para que un futuro cambio
 * no reintroduzca una segunda definicion incompatible sin que un test falle.
 */

function kpis(overrides: Partial<DashboardKpis> = {}): DashboardKpis {
  return {
    tonelaje_total: 500_000,
    ciclos: 1200,
    meta_acumulada: 490_000,
    meta_mensual: 900_000,
    cumplimiento_pct: 102,
    promedio_por_ciclo: 416,
    caex_activos: 30,
    carguios_activos: 5,
    proyeccion_fin_mes: 910_000,
    ritmo_necesario_diario: 15_000,
    dias_restantes: 10,
    ...overrides,
  }
}

function summary(overrides: Partial<DemoSummary> = {}): DemoSummary {
  return {
    source: 'demo',
    mode: 'demo',
    generated_at: '2026-08-14T12:00:00Z',
    period: { from: '2026-08-01', to: '2026-08-31', days_elapsed: 14, days_in_month: 31 },
    kpis: kpis(),
    daily: [],
    hourly_shift: [],
    top_loaders: [],
    top_trucks: [],
    destinations: [],
    phase_breakdown: [],
    current_shift: {
      fecha: '2026-08-14',
      turno: 'DIA',
      tonelaje: 8000,
      ciclos: 20,
      caex_activos: 30,
      carguios_activos: 5,
    },
    ...overrides,
  }
}

function alert(overrides: Partial<SmartAlert> = {}): SmartAlert {
  return {
    id: 'alert-1',
    titulo: 'Alerta operacional',
    descripcion: 'Descripcion de prueba',
    severidad: 'MEDIA',
    ...overrides,
  }
}

describe('buildOperationalInsights', () => {
  it('devuelve status controlado cuando el cumplimiento esta sobre plan y no hay alertas criticas', () => {
    const result = buildOperationalInsights({ summary: summary(), alerts: [] })
    expect(result.status).toBe('controlado')
    expect(result.statusLabel).toBe('Controlado')
    expect(result.score).toBeLessThan(35)
  })

  it('devuelve status critico cuando el cumplimiento cae fuerte y hay alertas criticas', () => {
    const result = buildOperationalInsights({
      summary: summary({ kpis: kpis({ cumplimiento_pct: 70 }) }),
      alerts: [alert({ severidad: 'CRITICA' }), alert({ id: 'alert-2', severidad: 'CRITICA' })],
    })
    expect(result.status).toBe('critico')
    expect(result.statusLabel).toBe('Critico')
  })

  it('cada insight generado usa el vocabulario de dominio/severidad unico (sin mezclar con el schema eliminado)', () => {
    const result = buildOperationalInsights({
      summary: summary({ kpis: kpis({ cumplimiento_pct: 80 }) }),
      alerts: [alert({ severidad: 'ALTA' })],
    })
    expect(result.insights.length).toBeGreaterThan(0)
    for (const insight of result.insights) {
      expect(['Produccion', 'Operacion', 'Seguridad', 'Mantencion']).toContain(insight.domain)
      expect(['critical', 'high', 'medium', 'low']).toContain(insight.severity)
      expect(insight.recommendedAction).toEqual(expect.any(String))
      expect(insight.recommendedAction.length).toBeGreaterThan(0)
    }
  })

  it('nunca deja severity/domain como undefined silencioso: cada insight trae los campos requeridos', () => {
    const result = buildOperationalInsights({
      summary: summary(),
      alerts: [alert({ severidad: undefined, severity: undefined })],
    })
    for (const insight of result.insights) {
      expect(insight.severity).toBeDefined()
      expect(insight.domain).toBeDefined()
      expect(insight.title).toBeDefined()
    }
  })

  it('produce como maximo 10 insights ordenados por severidad', () => {
    const manyAlerts = Array.from({ length: 15 }, (_, i) =>
      alert({ id: `alert-${i}`, severidad: i % 2 === 0 ? 'CRITICA' : 'ALTA' }),
    )
    const result = buildOperationalInsights({
      summary: summary({ kpis: kpis({ cumplimiento_pct: 70 }) }),
      alerts: manyAlerts,
    })
    expect(result.insights.length).toBeLessThanOrEqual(10)
  })
})
