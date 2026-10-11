import { ShieldX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useSession } from '../../features/auth/api/session'
import { roleHome } from '../../features/auth/model/redirect'
import { EmptyState } from '../../ui'
import { PublicPage } from '../components/PublicPage'
import { usePageTitle } from '../routeAnnouncement'
import styles from './Page.module.css'

/** `/forbidden` (403; interaction-states §1): a wrong-role visit lands here, with a link to the visitor's own home. */
export function Forbidden() {
  const { t } = useTranslation('auth')
  usePageTitle(t('forbidden.title'))
  const session = useSession().data
  return (
    <PublicPage>
      <EmptyState
        headingLevel={1}
        icon={<ShieldX />}
        title={t('forbidden.title')}
        description={t('forbidden.description')}
        action={
          <Link to={session ? roleHome(session.role) : '/'} className={styles.homeLink}>
            {t('forbidden.home')}
          </Link>
        }
      />
    </PublicPage>
  )
}
