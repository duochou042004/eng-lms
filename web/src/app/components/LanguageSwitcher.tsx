import { useTranslation } from 'react-i18next'
import { useSession, useUpdatePreferences } from '../../features/auth/api/session'
import { changeLocale, isLocale, LOCALES } from '../../lib/i18n'
import { SegmentedControl } from '../../ui'

/**
 * vi / en switch (a `SegmentedControl`; each endonym keeps its own `lang`). The device choice (localStorage) is the UI's
 * source; signed in and not forced to change the password, a switch also saves the account's locale (FR-SET-02,
 * DEC-190 (3)), best effort: a failure keeps the device choice and shows nothing. `labelVisible` shows "Language" above it
 * (Settings › Account, T-M2.35 scope 8).
 */
export function LanguageSwitcher({ labelVisible = false }: { labelVisible?: boolean }) {
  const { t, i18n } = useTranslation()
  const session = useSession().data
  const save = useUpdatePreferences()
  const current = isLocale(i18n.language) ? i18n.language : LOCALES[0]
  return (
    <SegmentedControl
      label={t('language.label')}
      labelVisible={labelVisible}
      options={LOCALES.map((locale) => ({ id: locale, label: t(`language.${locale}`), lang: locale }))}
      selected={current}
      onChange={(locale) => {
        void changeLocale(locale)
        if (session && !session.mustChangePassword) save.mutate({ locale })
      }}
    />
  )
}
