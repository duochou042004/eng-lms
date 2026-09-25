import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { PageHeader, Stack } from '../../ui'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import styles from './Page.module.css'

/** Neutral entry page until sign-in exists (M2). */
export function Landing() {
  const { t } = useTranslation()
  return (
    <main id="main" className={styles.page}>
      <Stack gap={6}>
        <div className={styles.toolbar}>
          <LanguageSwitcher />
        </div>
        <PageHeader title={t('landing.title')} description={t('landing.description')} />
        <ul className={styles.choices}>
          <li>
            <Link className={styles.choice} to="/tutor">
              {t('landing.tutor')}
            </Link>
          </li>
          <li>
            <Link className={styles.choice} to="/student">
              {t('landing.student')}
            </Link>
          </li>
        </ul>
      </Stack>
    </main>
  )
}
