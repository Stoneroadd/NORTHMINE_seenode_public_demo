import { describe, expect, it } from 'vitest'
import {
  ARABIC_FONT_STYLESHEET,
  OPERATIONAL_FONT_STYLESHEET,
  operationalFontStylesheets,
} from './OperationalFontLoader'

describe('operationalFontStylesheets', () => {
  it('keeps the operational family without downloading Cairo for non-Arabic sessions', () => {
    expect(operationalFontStylesheets('es')).toEqual([OPERATIONAL_FONT_STYLESHEET])
    expect(operationalFontStylesheets('en')).not.toContain(ARABIC_FONT_STYLESHEET)
  })

  it('adds Cairo only when the active language is Arabic', () => {
    expect(operationalFontStylesheets('ar')).toEqual([
      OPERATIONAL_FONT_STYLESHEET,
      ARABIC_FONT_STYLESHEET,
    ])
  })
})
