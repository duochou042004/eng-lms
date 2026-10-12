import { SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { EmptyState } from '../../ui'
import { usePageTitle } from '../routeAnnouncement'
import styles from './Page.module.css'

/** The 404 content (a level-1 `EmptyState` with a link home), without a `main`: also used inside the shells. */
export function NotFoundContent({ home }: { home: string }) {
  const { t } = useTranslation()
  usePageTitle(t('notFound.title'))
  return (
    <EmptyState
      headingLevel={1}
      icon={<SearchX />}
      title={t('notFound.title')}
      description={t('notFound.description')}
      action={
        <Link to={home} className={styles.homeLink}>
          {t('notFound.home')}
        </Link>
      }
    />
  )
}

/** The top-level 404 (outside the shells): its own `main`, the link goes to `/` (which redirects by role). */
export function NotFound() {
  return (
    <main id="main" className={styles.page}>
      <NotFoundContent home="/" />
    </main>
  )
}
