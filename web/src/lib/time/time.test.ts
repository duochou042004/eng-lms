import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime } from '.'

// T-M2.5 AC12 (f), design-system §7: day/month/year and a 24-hour clock in both languages (local time zone).
describe('lib/time', () => {
  it.each(['vi', 'en'])('formats %s as "HH:mm, dd/MM/yyyy"', (locale) => {
    const iso = new Date(2026, 9, 23, 10, 25).toISOString()
    expect(formatDateTime(iso, locale)).toBe('10:25, 23/10/2026')
    expect(formatDate(iso, locale)).toBe('23/10/2026')
    expect(formatDateTime(new Date(2026, 0, 5, 19, 0).toISOString(), locale)).toBe('19:00, 05/01/2026')
  })
})
