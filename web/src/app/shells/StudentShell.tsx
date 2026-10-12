import { BookOpen, Ellipsis, House } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { BottomTabs, EmptyState, NavList, PageHeader, Sheet, Stack, cx, useMinWidth, type NavItem } from '../../ui'
import { usePageTitle } from '../routeAnnouncement'
import styles from './Shell.module.css'
import { AccountMenu, AccountSection, ShellHomeLink, SkipLink } from './ShellParts'
import { useFrameFocus } from './useFrameFocus'
import { useOverlay } from './useOverlay'

export { ShellNotFound } from './ShellParts'

/** The student's navigation (information-architecture §3): only routes that exist (no dead tabs); a task adds a row. */
const NAV = [{ id: 'home', labelKey: 'nav.home', icon: <House />, to: '/student/home' }] as const

/**
 * The student shell (a lazy chunk of its own, NFR-PERF-03; T-M2.11): below md a top bar with the workspace name and
 * bottom tabs (the items, then More, which opens a bottom sheet with the account section); at ≥ md a top bar with the
 * same items and the account menu (IA §3 "More expanded inline", DEC-112 (4)). The pages render in `main`.
 */
export function StudentShell() {
  const { t } = useTranslation('shell')
  const wide = useMinWidth('md')
  const root = useRef<HTMLDivElement>(null)
  useFrameFocus(wide, root)
  const more = useOverlay()
  const items: NavItem[] = NAV.map(({ labelKey, ...item }) => ({ ...item, label: t(labelKey) }))
  return (
    <div ref={root} className={styles.shell}>
      <SkipLink />
      <header className={styles.topBar}>
        <ShellHomeLink />
        {wide ? (
          <>
            <NavList label={t('student.navLabel')} items={items} orientation="horizontal" />
            <AccountMenu />
          </>
        ) : null}
      </header>
      <main id="main" tabIndex={-1} className={cx(styles.main, !wide && styles.withTabs)}>
        <Outlet />
      </main>
      {wide ? null : (
        <>
          <BottomTabs
            label={t('student.navLabel')}
            items={items}
            action={{ label: t('nav.more'), icon: <Ellipsis />, onPress: more.open, isExpanded: more.isOpen }}
          />
          <Sheet
            placement="bottom"
            isOpen={more.isOpen}
            onOpenChange={more.setOpen}
            title={t('nav.more')}
            closeLabel={t('close')}
          >
            <AccountSection onNavigate={more.close} />
          </Sheet>
        </>
      )}
    </div>
  )
}

/** `/student/home`: placeholder content until the student Home page. */
export function StudentHome() {
  const { t } = useTranslation('shell')
  usePageTitle(t('student.title'))
  return (
    <Stack gap={6}>
      <PageHeader title={t('student.title')} />
      <EmptyState icon={<BookOpen />} title={t('student.emptyTitle')} description={t('student.emptyDescription')} />
    </Stack>
  )
}
