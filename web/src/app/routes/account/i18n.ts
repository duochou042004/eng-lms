import { i18n } from '../../../lib/i18n'
import enAccount from '../../../lib/i18n/locales/en/account.json'
import viAccount from '../../../lib/i18n/locales/vi/account.json'

/**
 * The `account` namespace: the account form both roles use (the tutor's Settings › Account tab, the student's Account
 * page, T-M2.7) and the student page's own strings, registered with their lazy chunks (NFR-PERF-03).
 */
export const accountResources = { vi: { account: viAccount }, en: { account: enAccount } } as const

export function registerAccountNamespace() {
  for (const [lng, bundles] of Object.entries(accountResources)) {
    if (!i18n.hasResourceBundle(lng, 'account')) i18n.addResourceBundle(lng, 'account', bundles.account)
  }
}

registerAccountNamespace()
