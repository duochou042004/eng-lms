import { describe, expect, it } from 'vitest'
import { initialLocale, LOCALE_STORAGE_KEY } from '.'

describe('initial locale', () => {
  it('defaults to Vietnamese (DEC-039)', () => {
    expect(initialLocale()).toBe('vi')
  })

  it('uses a stored supported locale and ignores anything else', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    expect(initialLocale()).toBe('en')
    localStorage.setItem(LOCALE_STORAGE_KEY, 'fr')
    expect(initialLocale()).toBe('vi')
  })
})
