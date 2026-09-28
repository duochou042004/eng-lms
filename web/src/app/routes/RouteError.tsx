import { useTranslation } from 'react-i18next'
import { useRouteError } from 'react-router'
import { ApiError } from '../../lib/api'
import { Button, PageHeader, Stack } from '../../ui'
import { usePageTitle } from '../routeAnnouncement'
import styles from './Page.module.css'

/**
 * App-level error boundary. Shows specific, translated copy and the request ID, never the raw error. The copy asks for
 * the request ID only when one is shown (DEC-045 N4).
 */
export function RouteError() {
  const { t } = useTranslation()
  const error = useRouteError()
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
        <div>
          <Button variant="secondary" onPress={() => window.location.reload()}>
            {t('error.reload')}
          </Button>
        </div>
      </Stack>
    </main>
  )
}
