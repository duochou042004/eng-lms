import { SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { EmptyState } from '../../ui'
import styles from './Page.module.css'

export function NotFound() {
  const { t } = useTranslation()
  return (
    <main id="main" className={styles.page}>
      <EmptyState
        headingLevel={1}
        icon={<SearchX />}
        title={t('notFound.title')}
        description={t('notFound.description')}
        action={<Link to="/">{t('notFound.home')}</Link>}
      />
    </main>
  )
}
