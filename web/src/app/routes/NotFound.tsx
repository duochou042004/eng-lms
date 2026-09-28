import { SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { EmptyState } from '../../ui'
import { usePageTitle } from '../routeAnnouncement'
import styles from './Page.module.css'

export function NotFound() {
  const { t } = useTranslation()
  usePageTitle(t('notFound.title'))
  return (
    <main id="main" className={styles.page}>
      <EmptyState
        headingLevel={1}
        icon={<SearchX />}
        title={t('notFound.title')}
        description={t('notFound.description')}
        action={
          <Link to="/" className={styles.homeLink}>
            {t('notFound.home')}
          </Link>
        }
      />
    </main>
  )
}
