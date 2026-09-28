import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { DelayedSkeleton, Skeleton, Stack } from '../../ui'
import shellStyles from '../shells/ShellLayout.module.css'
import styles from './Page.module.css'

const SHELL_PATH = /^\/(tutor|student)(\/|$)/

/** The page part: a PageHeader-shaped title line and a content block. */
function PageSkeleton() {
  return (
    <Stack gap={6}>
      <div className={styles.headerSkeleton}>
        <Skeleton inlineSize="14em" blockSize="1.875rem" />
      </div>
      <Skeleton shape="block" inlineSize="100%" blockSize="12rem" />
    </Stack>
  )
}

/**
 * Shown while a lazy route module loads on first visit (interaction-states §1: a layout-shaped skeleton, not a blank
 * page). The region is `aria-busy` with its label from 0 ms; the skeletons appear after 150 ms (`DelayedSkeleton`).
 * On the shell paths it includes a top-bar-shaped skeleton (the shell's own top-bar styles), elsewhere only the page.
 */
export function RouteLoading() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const shell = SHELL_PATH.test(pathname)
  return (
    <output aria-busy="true" aria-label={t('app.loading')} className={styles.loading}>
      <DelayedSkeleton>
        {shell ? (
          <>
            <div className={shellStyles.topBar} data-testid="route-loading-topbar">
              <div className={`${shellStyles.brand} ${styles.brandSkeleton}`}>
                <Skeleton inlineSize="4.5em" />
                <Skeleton inlineSize="8em" />
              </div>
              <Skeleton shape="block" inlineSize="13rem" blockSize="var(--size-control-md)" />
            </div>
            <div className={shellStyles.main}>
              <PageSkeleton />
            </div>
          </>
        ) : (
          <div className={styles.page}>
            <PageSkeleton />
          </div>
        )}
      </DelayedSkeleton>
    </output>
  )
}
