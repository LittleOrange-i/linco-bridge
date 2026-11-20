import { describe, expect, it } from 'vitest'
import { getCustomNavBarPaddingStyle, getCustomNavPagePaddingTop } from '@/utils/page-safe-area'

describe('page-safe-area (Web)', () => {
  it('does not add a native status bar inset', () => {
    expect(getCustomNavPagePaddingTop()).toBe(0)
  })

  it('exposes nav bar padding style', () => {
    expect(getCustomNavBarPaddingStyle()).toEqual({ paddingTop: '0px' })
  })
})
