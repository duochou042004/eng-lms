import { CircleUser } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { NavList, PageHeader, Stack } from '../../../ui'
import './i18n'
import styles from './Settings.module.css'

/**
 * `/tutor/settings/*` (FR-SET-02, T-M2.6 scope 4): the "Settings" header over a tab list of the existing tabs (router
 * links with `aria-current`, a horizontal `NavList`); a task adds a tab by adding a row. The tab renders below.
 */
const TABS = [{ id: 'account', labelKey: 'tabs.account', icon: <CircleUser />, to: '/tutor/settings/account' }] as const

export function SettingsLayout() {
  const { t } = useTranslation('settings')
  return (
    <Stack gap={6}>
      <PageHeader title={t('title')} />
      <div className={styles.tabs}>
        <NavList
          label={t('tabsLabel')}
          orientation="horizontal"
          items={TABS.map(({ labelKey, ...tab }) => ({ ...tab, label: t(labelKey) }))}
        />
      </div>
      <Outlet />
    </Stack>
  )
}
