import { CircleUser, KeyRound, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useLogout, useSession } from '../../features/auth/api/session'
import { roleHome } from '../../features/auth/model/redirect'
import { useMeta } from '../../features/settings/api/useMeta'
import { Button, ButtonLink, Popover } from '../../ui'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { WorkspaceNameError, WorkspaceNameLoading } from '../components/WorkspaceName'
import { NotFoundContent } from '../routes/NotFound'
import styles from './Shell.module.css'
import { useOverlay } from './useOverlay'

/** The first Tab stop of every shell page (accessibility §1 rule 3). */
export function SkipLink() {
  const { t } = useTranslation()
  return (
    <a className={styles.skipLink} href="#main">
      {t('app.skipToContent')}
    </a>
  )
}

/**
 * The workspace identity, shown once (T-M2.11 scope 6): the shell's home link (to `/`, which redirects to the role
 * home, as the 404 and error pages' links do). The link is always there; only its content changes: a skeleton (accessible name `app.name`) while `GET /api/v1/meta` loads, then the workspace name
 * (truncated with a full-text `title`), or `app.name` after an error, with the compact error and Retry **beside** it.
 */
export function ShellHomeLink() {
  const { t } = useTranslation()
  const meta = useMeta()
  const name = meta.data?.displayName
  return (
    <div className={styles.identity}>
      <Link to="/" className={styles.homeLink} aria-label={meta.isPending ? t('app.name') : undefined} title={name}>
        {meta.isPending ? <WorkspaceNameLoading /> : <span className={styles.homeName}>{name ?? t('app.name')}</span>}
      </Link>
      {meta.isError ? <WorkspaceNameError onRetry={() => void meta.refetch()} /> : null}
    </div>
  )
}

/** The signed-in user's name as the shells show it: the display name, else the username. */
function useAccountName() {
  const session = useSession().data
  return session ? (session.displayName ?? session.username) : ''
}

/**
 * The account section (information-architecture §1, §3; FR-AUTH-04, FR-AUTH-05): who is signed in, the language
 * switcher, "Change password" and "Log out" in the same visual kind (a link and a button that look alike). The same
 * component fills the account popover, the tutor drawer's footer and the student's More sheet. `onNavigate` closes the
 * overlay that holds it before "Change password" navigates.
 */
export function AccountSection({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation('shell')
  const name = useAccountName()
  const logout = useLogout()
  return (
    <div className={styles.account}>
      <p className={styles.signedIn}>{t('account.signedInAs', { name })}</p>
      <LanguageSwitcher />
      <div className={styles.accountActions}>
        <ButtonLink variant="secondary" to="/change-password" onClick={onNavigate}>
          <KeyRound aria-hidden="true" className={styles.actionIcon} />
          {t('account.changePassword')}
        </ButtonLink>
        <Button variant="secondary" isPending={logout.isPending} onPress={() => logout.mutate()}>
          <LogOut aria-hidden="true" className={styles.actionIcon} />
          {t('account.logout')}
        </Button>
      </div>
    </div>
  )
}

/** The account menu button (top right; tutor ≥ lg, student ≥ md): the user's name, opening the account popover. */
export function AccountMenu() {
  const { t } = useTranslation('shell')
  const name = useAccountName()
  const menu = useOverlay()
  return (
    <Popover
      triggerLabel={name}
      triggerIcon={<CircleUser />}
      label={t('account.label')}
      isOpen={menu.isOpen}
      onOpenChange={menu.setOpen}
    >
      <AccountSection onNavigate={menu.close} />
    </Popover>
  )
}

/** An unknown path under a shell (DEC-087 F-4): the 404 inside the shell, linking to the role home. */
export function ShellNotFound() {
  const session = useSession().data
  return <NotFoundContent home={session ? roleHome(session.role) : '/'} />
}
