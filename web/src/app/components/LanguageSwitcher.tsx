import { useTranslation } from 'react-i18next'
import { changeLocale, isLocale, LOCALES } from '../../lib/i18n'
import { SegmentedControl } from '../../ui'

/**
 * vi / en switch (a `SegmentedControl`; each endonym keeps its own `lang`). The choice is kept in localStorage until
 * account preferences exist (M2).
 */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const current = isLocale(i18n.language) ? i18n.language : LOCALES[0]
  return (
    <SegmentedControl
      label={t('language.label')}
      options={LOCALES.map((locale) => ({ id: locale, label: t(`language.${locale}`), lang: locale }))}
      selected={current}
      onChange={(locale) => void changeLocale(locale)}
    />
  )
}
