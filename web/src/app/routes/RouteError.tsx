import { useTranslation } from 'react-i18next'
import { useRouteError } from 'react-router'
import { ApiError } from '../../lib/api'
import { Button, InlineAlert } from '../../ui'
import styles from './Page.module.css'

/** App-level error boundary. Shows a translated message and the request ID, never the raw error. */
export function RouteError() {
  const { t } = useTranslation()
  const error = useRouteError()
  const requestId = error instanceof ApiError ? error.requestId : null
  return (
    <main id="main" className={styles.page}>
      <h1 className={styles.visuallyHidden}>{t('error.title')}</h1>
      <InlineAlert
        tone="danger"
        title={t('error.title')}
        action={
          <Button variant="secondary" onPress={() => window.location.reload()}>
            {t('error.reload')}
          </Button>
        }
      >
        <p>{t('error.description')}</p>
        {requestId ? <p>{t('error.requestId', { requestId })}</p> : null}
      </InlineAlert>
    </main>
  )
}
