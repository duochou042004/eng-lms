import { describe, expect, it } from 'vitest'
import { applyAccountLocale, i18n, initialLocale, LOCALE_STORAGE_KEY } from '.'

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

// T-M2.6 scope 7, DEC-190 (3): the account's locale only where the device has no stored choice.
describe('applyAccountLocale', () => {
  it('applies and stores the account locale on a device without a stored choice', async () => {
    applyAccountLocale('en')
    await expect.poll(() => i18n.language).toBe('en')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
  })

  it('never overrides a stored choice, and ignores an unknown locale', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'vi')
    applyAccountLocale('en')
    expect(i18n.language).toBe('vi')
    localStorage.clear()
    applyAccountLocale('fr')
    expect(i18n.language).toBe('vi')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull()
  })
})
