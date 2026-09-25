import { useTranslation } from 'react-i18next'
import { Button } from '../../ui'
import { changeLocale, LOCALES } from '../../lib/i18n'
import styles from './LanguageSwitcher.module.css'

/** vi / en switch. The choice is kept in localStorage until account preferences exist (M2). */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  return (
    <fieldset className={styles.switcher}>
      <legend className={styles.legend}>{t('language.label')}</legend>
      {LOCALES.map((locale) => {
        const active = i18n.language === locale
        return (
          <Button
            key={locale}
            variant={active ? 'secondary' : 'quiet'}
            aria-pressed={active}
            lang={locale}
            onPress={() => void changeLocale(locale)}
          >
            {t(`language.${locale}`)}
          </Button>
        )
      })}
    </fieldset>
  )
}
