import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enCommon from './locales/en/common.json'
import enShell from './locales/en/shell.json'
import viCommon from './locales/vi/common.json'
import viShell from './locales/vi/shell.json'

export const LOCALES = ['vi', 'en'] as const
export type Locale = (typeof LOCALES)[number]
/** Vietnamese is the default and the fallback (DEC-039, A-012). */
export const DEFAULT_LOCALE: Locale = 'vi'
export const LOCALE_STORAGE_KEY = 'englms.locale'

/**
 * The production catalogues. The `dev` namespace (the `/dev/ui` gallery) is not here: `src/dev/i18n.ts` registers it
 * when the lazily loaded `/dev/ui` module runs, so no `dev` string reaches a production build (T-M1.3 QA F-1, DEC-045).
 */
export const resources = {
  vi: { common: viCommon, shell: viShell },
  en: { common: enCommon, shell: enShell },
} as const

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** The stored choice until account preferences exist (M2, PATCH /auth/preferences); otherwise Vietnamese. */
export function initialLocale(): Locale {
  try {
    const stored = globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY)
    return isLocale(stored) ? stored : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

export function changeLocale(locale: Locale) {
  try {
    globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Storage unavailable (private mode): the choice lasts for this page only.
  }
  return i18n.changeLanguage(locale)
}

i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng
})

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...LOCALES],
  ns: ['common', 'shell'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
})

export { i18n }
