import type { ReactNode } from 'react'
import { Stack } from '../../ui'
import pageStyles from '../routes/Page.module.css'
import { LanguageSwitcher } from './LanguageSwitcher'
import { WorkspaceName } from './WorkspaceName'

/**
 * The frame of the pages outside the shells (`/login`, `/change-password`, `/forbidden`; information-architecture §4):
 * one toolbar row with the workspace name at the start (T-M2.11; truncated on a narrow screen) and the language switcher
 * at the end, then one centred column of at most 400 px. `RouteLoading` draws the same shape while the page loads.
 */
export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <main id="main" className={pageStyles.page}>
      <Stack gap={6}>
        <div className={pageStyles.toolbar}>
          <div className={pageStyles.toolbarName}>
            <WorkspaceName />
          </div>
          <LanguageSwitcher />
        </div>
        <div className={pageStyles.narrow}>{children}</div>
      </Stack>
    </main>
  )
}
