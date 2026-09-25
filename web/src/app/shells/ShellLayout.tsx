import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { WorkspaceName } from '../components/WorkspaceName'
import styles from './ShellLayout.module.css'

/** Placeholder application frame shared by the tutor and student shells until M2 brings navigation and auth. */
export function ShellLayout({ navLabel, children }: { navLabel: string; children: ReactNode }) {
  const { t } = useTranslation()
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
          <span className={styles.workspace}>
            <WorkspaceName />
          </span>
        </nav>
        <LanguageSwitcher />
      </header>
      <main id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
    </div>
  )
}
