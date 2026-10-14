import { useTranslation } from 'react-i18next'
import { Outlet, useNavigation } from 'react-router'
import { ProgressLine, useDelayed } from '../ui'
import { useRouteFocus } from './routeAnnouncement'
import styles from './routes/Page.module.css'

/**
 * The root route: stays mounted across navigations (and route errors), so it can move focus after each one. While the
 * router navigates (lazy chunks, loaders) for longer than 150 ms, the progress line shows at the top edge and the one
 * polite status region says "Loading the page"; the current page stays as it is (T-M2.12, interaction-states §1, §3).
 */
export function RootLayout() {
  useRouteFocus()
  const { t } = useTranslation()
  const busy = useDelayed(useNavigation().state !== 'idle')
  return (
    <>
      {busy ? <ProgressLine /> : null}
      <output className={styles.visuallyHidden}>{busy ? t('app.loading') : null}</output>
      <Outlet />
    </>
  )
}
