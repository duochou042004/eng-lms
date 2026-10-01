import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { DelayedSkeleton, Skeleton, Stack } from '../../ui'
import shellStyles from '../shells/ShellLayout.module.css'
import styles from './Page.module.css'

const SHELL_PATH = /^\/(tutor|student)(\/|$)/

/**
 * The page part: a PageHeader-shaped title line and a content block. With `toolbar` (the landing page), first a 44 px,
 * end-aligned row in the shape of the landing page's language switcher, so the heading appears where its line was.
 */
function PageSkeleton({ toolbar = false }: { toolbar?: boolean }) {
  return (
    <Stack gap={6}>
      {toolbar ? (
        <div className={styles.toolbar} data-testid="route-loading-toolbar">
          <Skeleton shape="block" inlineSize="13rem" blockSize="var(--size-control-md)" />
        </div>
      ) : null}
      <div className={styles.headerSkeleton} data-testid="route-loading-title">
        <Skeleton inlineSize="14em" blockSize="1.875rem" />
      </div>
      <Skeleton shape="block" inlineSize="100%" blockSize="12rem" />
    </Stack>
  )
}

/**
 * Shown while a lazy route module loads on first visit (interaction-states §1: a layout-shaped skeleton, not a blank
 * page). The region is `aria-busy` with its label from 0 ms; the skeletons appear after 150 ms (`DelayedSkeleton`).
 * On the shell paths it includes a top-bar-shaped skeleton (the shell's own top-bar styles), elsewhere only the page; on
 * the landing page (`/`) the page part starts with the language switcher's toolbar row (T-M1.13).
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
            <PageSkeleton toolbar={pathname === '/'} />
          </div>
        )}
      </DelayedSkeleton>
    </output>
  )
}
