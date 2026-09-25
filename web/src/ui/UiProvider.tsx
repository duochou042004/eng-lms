import type { ReactNode } from 'react'
import { I18nProvider } from 'react-aria-components'

/** Gives React Aria the active locale (dates, numbers, reading direction). */
export function UiProvider({ locale, children }: { locale: string; children: ReactNode }) {
  return <I18nProvider locale={locale}>{children}</I18nProvider>
}
