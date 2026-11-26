import { describe, expect, it } from 'vitest'
import { dayPeriod, formatDate, formatDateTime } from '.'

// T-M2.5 AC12 (f), design-system §7: day/month/year and a 24-hour clock in both languages (local time zone).
describe('lib/time', () => {
  it.each(['vi', 'en'])('formats %s as "HH:mm, dd/MM/yyyy"', (locale) => {
    const iso = new Date(2026, 9, 23, 10, 25).toISOString()
    expect(formatDateTime(iso, locale)).toBe('10:25, 23/10/2026')
    expect(formatDate(iso, locale)).toBe('23/10/2026')
    expect(formatDateTime(new Date(2026, 0, 5, 19, 0).toISOString(), locale)).toBe('19:00, 05/01/2026')
  })

  // T-M2.6 AC9: the account's zone, not the browser's; Kiritimati (UTC+14) and Honolulu (UTC−10) are always 24 h apart.
  it.each(['vi', 'en'])('formats %s in the given time zone', (locale) => {
    const iso = '2026-11-21T09:30:00Z'
    expect(formatDateTime(iso, locale, 'Pacific/Kiritimati')).toBe('23:30, 21/11/2026')
    expect(formatDateTime(iso, locale, 'Pacific/Honolulu')).toBe('23:30, 20/11/2026')
    expect(formatDate(iso, locale, 'Pacific/Kiritimati')).toBe('21/11/2026')
    expect(formatDate(iso, locale, 'Pacific/Honolulu')).toBe('20/11/2026')
    expect(formatDate('2026-11-21T17:30:00Z', locale, 'Asia/Ho_Chi_Minh')).toBe('22/11/2026')
    expect(formatDate('2026-11-21T17:30:00Z', locale, 'UTC')).toBe('21/11/2026')
  })

  // T-M2.7 AC3: the band edges in the account's zone (UTC+7 and UTC−8 in November), not the browser's.
  it.each([
    ['03:59', 'evening'],
    ['04:00', 'morning'],
    ['11:59', 'morning'],
    ['12:00', 'afternoon'],
    ['17:59', 'afternoon'],
    ['18:00', 'evening'],
  ] as const)('%s local is %s in two zones', (local, period) => {
    const [h, m] = local.split(':').map(Number) as [number, number]
    // The UTC instant whose wall clock in the zone is `local` on 26/11/2026.
    const at = (offsetHours: number) => new Date(Date.UTC(2026, 10, 26, h - offsetHours, m))
    expect(dayPeriod(at(7), 'Asia/Ho_Chi_Minh')).toBe(period)
    expect(dayPeriod(at(-8), 'America/Los_Angeles')).toBe(period)
  })

  it('one instant has a different band in each zone', () => {
    const instant = new Date('2026-11-26T02:00:00Z') // 09:00 in Ho Chi Minh City, 18:00 the day before in Los Angeles
    expect(dayPeriod(instant, 'Asia/Ho_Chi_Minh')).toBe('morning')
    expect(dayPeriod(instant, 'America/Los_Angeles')).toBe('evening')
  })
})
