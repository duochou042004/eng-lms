/**
 * Date and time formatting (frontend-architecture §4): always through `Intl` with the UI locale, in the browser's time
 * zone. shortcut: the browser's zone, not the account's `timeZone`; pass the session's zone once a page needs it.
 */
export function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso))
}

export function formatDateTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}
