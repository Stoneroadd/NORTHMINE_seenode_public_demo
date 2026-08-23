import { describe, expect, it } from 'vitest'
import { buildCrossoverOption } from './Simulator'
import { simulatorT } from '../i18n/modules/simulator'

/**
 * buildCrossoverOption's ECharts tooltip formatter used to assume
 * params[0] always exists. ECharts genuinely calls axis-trigger tooltip
 * formatters with an empty array in some pointer-move edge cases (a fast
 * hover crossing a resize/re-render boundary), and an unguarded
 * params[0].axisValue there threw inside ECharts' own render loop,
 * crashing the whole chart instead of just skipping that tooltip frame.
 */

const CURVA = [
  { caex: 26, produccion: 480000, sobre_meta: false },
  { caex: 28, produccion: 520000, sobre_meta: true },
  { caex: 30, produccion: 560000, sobre_meta: true },
]

function formatter(option: ReturnType<typeof buildCrossoverOption>) {
  const tooltip = Array.isArray(option.tooltip) ? option.tooltip[0] : option.tooltip
  const fn = tooltip?.formatter as ((params: unknown) => string) | undefined
  if (typeof fn !== 'function') throw new Error('tooltip.formatter is not a function')
  return fn
}

describe('buildCrossoverOption tooltip formatter', () => {
  it('never throws when ECharts calls it with an empty params array', () => {
    const option = buildCrossoverOption(CURVA, 28, 26, 500000, simulatorT.es)
    expect(() => formatter(option)([])).not.toThrow()
    expect(formatter(option)([])).toBe('')
  })

  it('renders the normal tooltip text for a real single-row params array', () => {
    const option = buildCrossoverOption(CURVA, 28, 26, 500000, simulatorT.es)
    const text = formatter(option)([{ axisValue: 28, value: 520000 }])
    expect(text).toContain('28')
    expect(text).toContain('520.000')
  })
})
