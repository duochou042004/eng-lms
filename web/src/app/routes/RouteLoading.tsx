import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { LOCALES } from '../../lib/i18n'
import { DelayedSkeleton, Skeleton, Stack, cx, useMinWidth } from '../../ui'
import shellStyles from '../shells/Shell.module.css'
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
 * password change, forbidden), first their 44 px toolbar row (a name-shaped line at the start, the language switcher's
 * shape at the end), and the title and content in their 400 px column, so the heading appears where its line was.
 */
function PageSkeleton({ toolbar = false }: { toolbar?: boolean }) {
  return (
    <Stack gap={6}>
      {toolbar ? (
        <>
          <div className={styles.toolbar} data-testid="route-loading-toolbar">
            <div className={styles.toolbarName} data-testid="route-loading-name">
              <Skeleton inlineSize="8em" />
            </div>
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

const controlSkeleton = (inlineSize: string) => (
  <Skeleton shape="block" inlineSize={inlineSize} blockSize="var(--size-control-md)" />
)

/**
 * The shell frame of T-M2.11 at the current breakpoint, from the shells' own styles (`Shell.module.css`): the top bar
 * (tutor: the menu button below lg, the account menu button at ≥ lg; student: the nav item and the account menu button
 * at ≥ md), the tutor sidebar at ≥ lg, the student bottom tabs below md, and the page in `main`'s box.
 */
function ShellSkeleton({ role }: { role: 'tutor' | 'student' }) {
  const lg = useMinWidth('lg')
  const md = useMinWidth('md')
  const tutor = role === 'tutor'
  const accountMenu = tutor ? lg : md
  const page = (
    <div className={cx(shellStyles.main, !tutor && !md && shellStyles.withTabs)}>
      <PageSkeleton />
    </div>
  )
  // In the shell's own full-height frame, so the sidebar skeleton runs to the bottom like the sidebar (AC11 (d)).
  return (
    <div className={shellStyles.shell} data-testid="route-loading-shell">
      <div className={shellStyles.topBar} data-testid="route-loading-topbar">
        {tutor && !lg ? <div data-testid="route-loading-menu">{controlSkeleton('var(--size-control-md)')}</div> : null}
        <div className={shellStyles.identity}>
          <Skeleton inlineSize="8em" />
        </div>
        {!tutor && md ? <div>{controlSkeleton('6em')}</div> : null}
        {accountMenu ? (
          <div data-testid="route-loading-account">{controlSkeleton('var(--size-account-button)')}</div>
        ) : null}
      </div>
      {tutor ? (
        <div className={shellStyles.body}>
          {lg ? (
            <div className={shellStyles.sidebar} data-testid="route-loading-sidebar">
              {controlSkeleton('100%')}
            </div>
          ) : null}
          {page}
        </div>
      ) : (
        page
      )}
      {!tutor && !md ? <div className={shellStyles.tabsSkeleton} data-testid="route-loading-tabs" /> : null}
    </div>
  )
}

/**
 * Shown while a lazy route module loads on first visit (interaction-states §1: a layout-shaped skeleton, not a blank
 * page). The region is `aria-busy` with its label from 0 ms; the skeletons appear after 150 ms (`DelayedSkeleton`).
 * On the shell paths it draws the shell's frame (`ShellSkeleton`), elsewhere only the page; on the public pages the
 * page part starts with their toolbar row (T-M1.13, T-M2.11) and uses their column.
 */
export function RouteLoading() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const shell = SHELL_PATH.exec(pathname)?.[1] as 'tutor' | 'student' | undefined
  return (
    <output aria-busy="true" aria-label={t('app.loading')} className={styles.loading}>
      <DelayedSkeleton>
        {shell ? (
          <ShellSkeleton role={shell} />
        ) : (
          <div className={styles.page}>
            <PageSkeleton toolbar={PUBLIC_PATHS.has(pathname)} />
          </div>
        )}
      </DelayedSkeleton>
    </output>
  )
}
