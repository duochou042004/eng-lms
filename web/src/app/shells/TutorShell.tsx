import { CalendarCheck, Menu, NotebookPen } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { EmptyState, IconButton, NavList, PageHeader, Sheet, Stack, useMinWidth, type NavItem } from '../../ui'
import { usePageTitle } from '../routeAnnouncement'
import styles from './Shell.module.css'
import { AccountMenu, AccountSection, ShellHomeLink, SkipLink } from './ShellParts'
import { useFrameFocus } from './useFrameFocus'
import { useOverlay } from './useOverlay'

export { ShellNotFound } from './ShellParts'

/** The tutor's navigation (information-architecture §1): only routes that exist (no dead items); a task adds a row. */
const NAV = [{ id: 'today', labelKey: 'nav.today', icon: <CalendarCheck />, to: '/tutor/today' }] as const

/**
 * The tutor shell (a lazy chunk of its own, NFR-PERF-03; T-M2.11): at ≥ lg a top bar (workspace name, account menu
 * top right) over a persistent sidebar; below lg a top bar with a menu button that opens the navigation drawer, whose
 * footer holds the account section. The pages render in `main` (`<Outlet />`).
 */
export function TutorShell() {
  const { t } = useTranslation('shell')
  const wide = useMinWidth('lg')
  const root = useRef<HTMLDivElement>(null)
  useFrameFocus(wide, root)
  const drawer = useOverlay()
  const items: NavItem[] = NAV.map(({ labelKey, ...item }) => ({ ...item, label: t(labelKey) }))
  return (
    <div ref={root} className={styles.shell}>
      <SkipLink />
      <header className={styles.topBar}>
        {wide ? null : (
          <IconButton
            label={t('nav.open')}
            icon={<Menu />}
            onPress={drawer.open}
            aria-haspopup="dialog"
            aria-expanded={drawer.isOpen}
          />
        )}
        <ShellHomeLink />
        {wide ? <AccountMenu /> : null}
      </header>
      <div className={styles.body}>
        {wide ? (
          <div className={styles.sidebar}>
            <NavList label={t('tutor.navLabel')} items={items} />
          </div>
        ) : null}
        <main id="main" tabIndex={-1} className={styles.main}>
          <Outlet />
        </main>
      </div>
      {wide ? null : (
        <Sheet
          placement="start"
          isOpen={drawer.isOpen}
          onOpenChange={drawer.setOpen}
          title={t('nav.drawerTitle')}
          closeLabel={t('close')}
          footer={<AccountSection onNavigate={drawer.close} />}
        >
          <NavList label={t('tutor.navLabel')} items={items} onNavigate={drawer.close} />
        </Sheet>
      )}
    </div>
  )
}

/** `/tutor/today`: placeholder content until the Today page (M3). */
export function TutorToday() {
  const { t } = useTranslation('shell')
  usePageTitle(t('tutor.title'))
  return (
    <Stack gap={6}>
      <PageHeader title={t('tutor.title')} />
      <EmptyState icon={<NotebookPen />} title={t('tutor.emptyTitle')} description={t('tutor.emptyDescription')} />
    </Stack>
  )
}
