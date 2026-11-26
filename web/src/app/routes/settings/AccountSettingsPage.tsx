import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../../../lib/i18n/pageTitle'
import { AccountPanel } from '../account/AccountForm'
import './i18n'

/** `/tutor/settings/account` (FR-SET-02, T-M2.6 scope 5): the shared account form (`routes/account`, T-M2.7) under the Settings tabs. */
export function AccountSettingsPage() {
  const { t } = useTranslation('settings')
  usePageTitle(t('accountPageTitle'))
  return <AccountPanel />
}
