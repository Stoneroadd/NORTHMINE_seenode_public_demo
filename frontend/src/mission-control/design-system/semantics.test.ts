import { describe, expect, it } from 'vitest'
import { dataConditionMeta, isLiveEligible, operationalToneMeta } from './semantics'

describe('Mission Control semantic states', () => {
  it('never treats unknown operational state as live eligible', () => {
    expect(operationalToneMeta('unknown')).toEqual({ label: 'Desconocido', liveEligible: false })
  })

  it('keeps copper brand identity outside operational semantics', () => {
    expect(Object.keys(operationalToneMeta('critical'))).not.toContain('brand')
  })

  it.each(['delayed', 'incomplete', 'conflicting', 'unavailable'] as const)(
    'removes LIVE eligibility when data is %s',
    (condition) => expect(dataConditionMeta(condition).liveEligible).toBe(false),
  )

  it('allows LIVE only for fresh data', () => {
    expect(dataConditionMeta('fresh').liveEligible).toBe(true)
  })

  it.each(['normal', 'attention', 'critical', 'informational', 'recovering'] as const)(
    'requires fresh data before %s can be represented as LIVE',
    (tone) => {
      expect(isLiveEligible(tone, 'fresh')).toBe(true)
      expect(isLiveEligible(tone, 'delayed')).toBe(false)
      expect(isLiveEligible(tone, 'incomplete')).toBe(false)
      expect(isLiveEligible(tone, 'conflicting')).toBe(false)
      expect(isLiveEligible(tone, 'unavailable')).toBe(false)
    },
  )

  it('never represents unknown operational state as LIVE, even with fresh data', () => {
    expect(isLiveEligible('unknown', 'fresh')).toBe(false)
  })
})
