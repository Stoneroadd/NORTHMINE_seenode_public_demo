import { describe, expect, it } from 'vitest'
import { chartDataIndex, firstChartParam } from './chartTheme'

describe('ECharts formatter parameter boundary', () => {
  it('normalizes axis arrays and item objects', () => {
    expect(chartDataIndex([{ dataIndex: 4 }])).toBe(4)
    expect(chartDataIndex({ dataIndex: 2 })).toBe(2)
    expect(firstChartParam([{ value: 17 }])?.value).toBe(17)
  })

  it('treats transient or malformed pointer frames as unavailable', () => {
    expect(chartDataIndex([])).toBeUndefined()
    expect(chartDataIndex(undefined)).toBeUndefined()
    expect(chartDataIndex({ dataIndex: -1 })).toBeUndefined()
    expect(chartDataIndex({ dataIndex: '0' })).toBeUndefined()
  })
})
