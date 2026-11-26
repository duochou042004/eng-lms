/**
 * Date and time formatting (frontend-architecture §4, design-system §7: "19:00 · 26/09"): numbers through `Intl` in the
 * UI locale, in a fixed order in every language: day/month/year and a 24-hour clock ("10:25, 23/10/2026"). `timeZone`
 * is the account's (`session.timeZone`, FR-SET-02); without one (no session) the browser's zone.
 */
function parts(iso: string, locale: string, options: Intl.DateTimeFormatOptions, timeZone?: string) {
  const values: Record<string, string> = {}
  for (const part of new Intl.DateTimeFormat(locale, { ...options, timeZone }).formatToParts(new Date(iso)))
    values[part.type] = part.value
  return values
}

/** "23/10/2026". */
export function formatDate(iso: string, locale: string, timeZone?: string) {
  const p = parts(iso, locale, { day: '2-digit', month: '2-digit', year: 'numeric' }, timeZone)
  return `${p.day}/${p.month}/${p.year}`
}

/** "10:25, 23/10/2026". */
export function formatDateTime(iso: string, locale: string, timeZone?: string) {
  const p = parts(iso, locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, timeZone)
  return `${p.hour}:${p.minute}, ${formatDate(iso, locale, timeZone)}`
}

export type DayPeriod = 'morning' | 'afternoon' | 'evening'

/**
 * The greeting's time of day (T-M2.7 UI rules) of `now` in `timeZone` (the account's): 04:00–11:59 morning, 12:00–17:59
 * afternoon, 18:00–03:59 evening.
 */
export function dayPeriod(now: Date, timeZone?: string): DayPeriod {
  const hour = Number(new Intl.DateTimeFormat('en', { hour: '2-digit', hourCycle: 'h23', timeZone }).format(now))
  return hour >= 4 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening'
}
