import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useRouteError } from 'react-router'
import { ApiError } from '../../lib/api'
import { Button, PageHeader, Stack } from '../../ui'
import { usePageTitle } from '../routeAnnouncement'
import { isChunkLoadError, isOffline } from './chunkError'
import styles from './Page.module.css'

/**
 * App-level error boundary. Shows specific, translated copy and the request ID, never the raw error. The copy asks for
 * the request ID only when one is shown (DEC-045 N4). After the reload button, a quiet 44 px link back to the start page
 * (as on the 404), except when the failed route is the start page itself (T-M1.13).
 *
 * A route module that could not load (offline, or a failed chunk download) gets its own copy and Retry (T-M2.12,
 * DEC-116 (2)): offline, Retry keeps the page and announces the offline message again (no request); online, it reloads
 * the failed URL in full (the address bar already shows it; no URL is built, so it cannot leave the origin), because
 * React Router keeps a rejected `lazy()` for the router's life. Nothing reloads on its own.
 */
export function RouteError() {
  const { t } = useTranslation()
  const error = useRouteError()
  const { pathname } = useLocation()
  // Bumped by Retry while offline: re-renders (the copy follows `navigator.onLine`) and re-announces the message.
  const [offlineRetries, setOfflineRetries] = useState(0)
  const offline = isOffline()
  const chunk = offline || isChunkLoadError(error)
  const requestId = !chunk && error instanceof ApiError ? error.requestId : null
  usePageTitle(t('error.title'))

  const description = chunk
    ? t(offline ? 'error.offlineDescription' : 'error.chunkDescription')
    : requestId
      ? t('error.descriptionWithRequestId')
      : t('error.description')
  const retry = () => {
    if (isOffline()) setOfflineRetries((n) => n + 1)
    else window.location.reload()
  }

  return (
    <main id="main" className={styles.page}>
      <Stack gap={4}>
        <PageHeader title={t('error.title')} description={description} />
        {requestId ? <p>{t('error.requestId', { requestId })}</p> : null}
        <div className={styles.actions}>
          {chunk ? (
            <Button variant="secondary" onPress={retry}>
              {t('error.retry')}
            </Button>
          ) : (
            <Button variant="secondary" onPress={() => window.location.reload()}>
              {t('error.reload')}
            </Button>
          )}
          {pathname === '/' ? null : (
            <Link to="/" className={styles.homeLink}>
              {t('notFound.home')}
            </Link>
          )}
        </div>
        {chunk ? (
          <output className={styles.visuallyHidden}>
            {offlineRetries > 0 ? <span key={offlineRetries}>{t('error.offlineDescription')}</span> : null}
          </output>
        ) : null}
      </Stack>
    </main>
  )
}
