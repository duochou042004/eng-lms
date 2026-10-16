/**
 * Date and time formatting (frontend-architecture §4, design-system §7: "19:00 · 26/09"): numbers through `Intl` in the
 * UI locale, in a fixed order in every language: day/month/year and a 24-hour clock ("10:25, 23/10/2026").
 * shortcut: the browser's time zone, not the account's `timeZone`; pass the session's zone once a page needs it.
 */
function parts(iso: string, locale: string, options: Intl.DateTimeFormatOptions) {
  const values: Record<string, string> = {}
  for (const part of new Intl.DateTimeFormat(locale, options).formatToParts(new Date(iso)))
    values[part.type] = part.value
  return values
}

/** "23/10/2026". */
export function formatDate(iso: string, locale: string) {
  const p = parts(iso, locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${p.day}/${p.month}/${p.year}`
}

/** "10:25, 23/10/2026". */
export function formatDateTime(iso: string, locale: string) {
  const p = parts(iso, locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  return `${p.hour}:${p.minute}, ${formatDate(iso, locale)}`
}
