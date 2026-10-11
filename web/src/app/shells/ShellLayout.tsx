import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useLogout } from '../../features/auth/api/session'
import { Button } from '../../ui'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { WorkspaceName } from '../components/WorkspaceName'
import styles from './ShellLayout.module.css'

/**
 * Placeholder application frame shared by the tutor and student shells until T-M2.11 brings navigation and the account
 * menu. T-M2.4 adds the "Change password" link and "Log out" (FR-AUTH-04, FR-AUTH-05) before the language switcher,
 * which stays last (end-aligned), so a language change that resizes the other labels never moves its segments.
 */
export function ShellLayout({ navLabel, children }: { navLabel: string; children: ReactNode }) {
  const { t } = useTranslation()
  const { t: tAuth } = useTranslation('auth')
  const logout = useLogout()
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main">
        {t('app.skipToContent')}
      </a>
      <header className={styles.topBar}>
        <nav aria-label={navLabel} className={styles.brand}>
          <Link to="/" className={styles.homeLink}>
            {t('app.name')}
          </Link>
          <div className={styles.workspace}>
            <WorkspaceName />
          </div>
        </nav>
        <div className={styles.actions}>
          <Link to="/change-password" className={styles.accountLink}>
            {tAuth('header.changePassword')}
          </Link>
          <Button variant="quiet" isPending={logout.isPending} onPress={() => logout.mutate()}>
            {tAuth('header.logout')}
          </Button>
          <LanguageSwitcher />
        </div>
      </header>
      <main id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
    </div>
  )
}
