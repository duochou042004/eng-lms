import { useTranslation } from 'react-i18next'
import { Link, useLocation, useRouteError } from 'react-router'
import { ApiError } from '../../lib/api'
import { Button, PageHeader, Stack } from '../../ui'
import { usePageTitle } from '../routeAnnouncement'
import styles from './Page.module.css'

/**
 * App-level error boundary. Shows specific, translated copy and the request ID, never the raw error. The copy asks for
 * the request ID only when one is shown (DEC-045 N4). After the reload button, a quiet 44 px link back to the start page
 * (as on the 404), except when the failed route is the start page itself (T-M1.13).
 */
export function RouteError() {
  const { t } = useTranslation()
  const error = useRouteError()
  const { pathname } = useLocation()
  const requestId = error instanceof ApiError ? error.requestId : null
  usePageTitle(t('error.title'))
  return (
    <main id="main" className={styles.page}>
      <Stack gap={4}>
        <PageHeader
          title={t('error.title')}
          description={requestId ? t('error.descriptionWithRequestId') : t('error.description')}
        />
        {requestId ? <p>{t('error.requestId', { requestId })}</p> : null}
        <div className={styles.actions}>
          <Button variant="secondary" onPress={() => window.location.reload()}>
            {t('error.reload')}
          </Button>
          {pathname === '/' ? null : (
            <Link to="/" className={styles.homeLink}>
              {t('notFound.home')}
            </Link>
          )}
        </div>
      </Stack>
    </main>
  )
}
