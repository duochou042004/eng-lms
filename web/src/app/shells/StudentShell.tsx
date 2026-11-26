import { BookOpen, Ellipsis, House } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { useSession } from '../../features/auth/api/session'
import { useStudentAccount } from '../../features/students/api/studentAccount'
import { dayPeriod } from '../../lib/time'
import {
  BottomTabs,
  EmptyState,
  NavList,
  PageHeader,
  Sheet,
  Stack,
  ToastRegion,
  cx,
  useMinWidth,
  type NavItem,
} from '../../ui'
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
  const more = useOverlay(wide)
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
      {/* The Account page's "Saved" (T-M2.7); above the bottom tabs below md (ui/Toast). */}
      <ToastRegion label={t('toast.region')} dismissLabel={t('toast.dismiss')} />
    </div>
  )
}

/**
 * `/student/home`, Home v0 (FR-DASH-03, T-M2.7): the `h1`, a greeting with the time of day in the account's zone
 * (`session.timeZone`) and the student's full name, then the empty state until Goals, To do, Next lesson and Recent
 * results arrive (M3, M5, M7). The name is decorative: while it loads or when its read fails, the greeting has no name
 * and nothing else changes (no alert).
 */
export function StudentHome() {
  const { t } = useTranslation('shell')
  usePageTitle(t('student.title'))
  const timeZone = useSession().data?.timeZone
  const name = useStudentAccount().data?.fullName
  // The instant the page opened (no live timer, UI rules); tests fake the clock.
  const [openedAt] = useState(() => new Date())
  const period = dayPeriod(openedAt, timeZone)
  return (
    <Stack gap={6}>
      <PageHeader
        title={t('student.title')}
        description={name ? t(`student.greeting.${period}`, { name }) : t(`student.greetingNoName.${period}`)}
      />
      <EmptyState icon={<BookOpen />} title={t('student.emptyTitle')} description={t('student.emptyDescription')} />
    </Stack>
  )
}
