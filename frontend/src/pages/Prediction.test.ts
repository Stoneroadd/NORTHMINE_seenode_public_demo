import { describe, expect, it } from 'vitest'
import { buildHourlyOption, confidenceLabel } from './Prediction'
import { predictionT } from '../i18n/modules/prediction'
import type { CockpitResponse } from '../lib/api'

const HOURLY: CockpitResponse['hourly_production'] = [
  { hour: '19:00', tons: 400, accumulated: 400 },
  { hour: '20:00', tons: 420, accumulated: 820 },
  { hour: '21:00', tons: 410, accumulated: 1230 },
]

describe('confidenceLabel', () => {
  it('maps the backend BAJA/MEDIA/ALTA codes to the localized label', () => {
    expect(confidenceLabel('BAJA', predictionT.es)).toBe('baja')
    expect(confidenceLabel('MEDIA', predictionT.es)).toBe('media')
    expect(confidenceLabel('ALTA', predictionT.es)).toBe('alta')
  })

  it('falls back to the raw value for an unknown code instead of hiding it', () => {
    expect(confidenceLabel('DESCONOCIDA', predictionT.es)).toBe('DESCONOCIDA')
  })
})

describe('buildHourlyOption', () => {
  it('plots the real accumulated series and a flat target reference line of the same length', () => {
    const option = buildHourlyOption(HOURLY, 5000, predictionT.es)
    const series = option.series as { name?: string; data?: unknown[] }[]
    const actualSeries = series.find((s) => s.name === predictionT.es.series_actual)
    const targetSeries = series.find((s) => s.name === predictionT.es.series_target)
    expect(actualSeries?.data).toEqual([400, 820, 1230])
    expect(targetSeries?.data).toEqual([5000, 5000, 5000])
  })

  it('never throws on an empty hourly_production array (shift just started)', () => {
    expect(() => buildHourlyOption([], 5000, predictionT.es)).not.toThrow()
    const option = buildHourlyOption([], 5000, predictionT.es)
    const series = option.series as { data?: unknown[] }[]
    expect(series.every((s) => (s.data ?? []).length === 0)).toBe(true)
  })
})
