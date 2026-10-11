import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { LOCALES } from '../../lib/i18n'
import { DelayedSkeleton, Skeleton, Stack } from '../../ui'
import shellStyles from '../shells/ShellLayout.module.css'
import styles from './Page.module.css'

const SHELL_PATH = /^\/(tutor|student)(\/|$)/
// The pages in the PublicPage frame (toolbar row + 400 px column); `/` redirects, usually to /login.
const PUBLIC_PATHS = new Set(['/', '/login', '/change-password', '/forbidden'])

/**
 * A 44 px block as wide as the language switcher (T-M1.16): an invisible, zero-height row of its endonyms in the
 * segments' own chrome (see `.switcherSizer`) sets the inline size; the block fills it.
 */
function SwitcherSkeleton() {
  const { t } = useTranslation()
  return (
    <div className={styles.switcherSkeleton} data-testid="route-loading-switcher">
      <div aria-hidden="true" className={styles.switcherSizer}>
        {LOCALES.map((locale) => (
          <span key={locale}>{t(`language.${locale}`)}</span>
        ))}
      </div>
      <Skeleton shape="block" inlineSize="100%" blockSize="var(--size-control-md)" />
    </div>
  )
}

/**
 * A 44 px block as wide as a shell-header control with a text label (T-M2.4): an invisible, zero-height copy of the
 * label with the control's inline padding (`sizerClass`) sets the inline size, as `SwitcherSkeleton` does.
 */
function ControlSkeleton({ label, sizerClass }: { label: string; sizerClass: string | undefined }) {
  return (
    <div className={styles.switcherSkeleton}>
      <div aria-hidden="true" className={`${styles.labelSizer} ${sizerClass}`}>
        <span>{label}</span>
      </div>
      <Skeleton shape="block" inlineSize="100%" blockSize="var(--size-control-md)" />
    </div>
  )
}

function TitleAndContent() {
  return (
    <>
      <div className={styles.headerSkeleton} data-testid="route-loading-title">
        <Skeleton inlineSize="14em" blockSize="1.875rem" />
      </div>
      <Skeleton shape="block" inlineSize="100%" blockSize="12rem" />
    </>
  )
}

/**
 * The page part: a PageHeader-shaped title line and a content block. With `toolbar` (the public pages: sign-in,
 * password change, forbidden), first a 44 px, end-aligned row in the shape of their language switcher, and the title and
 * content in their 400 px column, so the heading appears where its line was.
 */
function PageSkeleton({ toolbar = false }: { toolbar?: boolean }) {
  return (
    <Stack gap={6}>
      {toolbar ? (
        <>
          <div className={styles.toolbar} data-testid="route-loading-toolbar">
            <SwitcherSkeleton />
          </div>
          <div className={styles.narrow}>
            <Stack gap={6}>
              <TitleAndContent />
            </Stack>
          </div>
        </>
      ) : (
        <TitleAndContent />
      )}
    </Stack>
  )
}

/**
 * Shown while a lazy route module loads on first visit (interaction-states §1: a layout-shaped skeleton, not a blank
 * page). The region is `aria-busy` with its label from 0 ms; the skeletons appear after 150 ms (`DelayedSkeleton`).
 * On the shell paths it includes a top-bar-shaped skeleton (the shell's own top-bar styles, with the switcher and the
 * T-M2.4 account controls), elsewhere only the page; on the public pages the page part starts with the language
 * switcher's toolbar row (T-M1.13) and uses their column.
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
              <div className={shellStyles.actions}>
                <ControlSkeleton label={t('auth:header.changePassword')} sizerClass={styles.linkSizer} />
                <ControlSkeleton label={t('auth:header.logout')} sizerClass={styles.buttonSizer} />
                <SwitcherSkeleton />
              </div>
            </div>
            <div className={shellStyles.main}>
              <PageSkeleton />
            </div>
          </>
        ) : (
          <div className={styles.page}>
            <PageSkeleton toolbar={PUBLIC_PATHS.has(pathname)} />
          </div>
        )}
      </DelayedSkeleton>
    </output>
  )
}
