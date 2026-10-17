import { SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { EmptyState } from '../../../ui'
import styles from './Students.module.css'

/**
 * A missing, not owned or malformed student (interaction-states §1 "not found"): the feature's own view inside the shell
 * (the address stays; route focus lands on its `h1`), never saying whether the student exists.
 */
export function StudentNotFound() {
  const { t } = useTranslation('students')
  return (
    <EmptyState
      headingLevel={1}
      icon={<SearchX />}
      title={t('workspace.notFoundTitle')}
      description={t('workspace.notFoundDescription')}
      action={
        <Link to="/tutor/students" className={styles.textLink}>
          {t('workspace.notFoundLink')}
        </Link>
      }
    />
  )
}
