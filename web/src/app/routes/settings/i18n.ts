import { i18n } from '../../../lib/i18n'
import enSettings from '../../../lib/i18n/locales/en/settings.json'
import viSettings from '../../../lib/i18n/locales/vi/settings.json'

/** The `settings` namespace: the Settings pages' strings, registered with their lazy chunk (as `students`, NFR-PERF-03). */
export const settingsResources = { vi: { settings: viSettings }, en: { settings: enSettings } } as const

export function registerSettingsNamespace() {
  for (const [lng, bundles] of Object.entries(settingsResources)) {
    if (!i18n.hasResourceBundle(lng, 'settings')) i18n.addResourceBundle(lng, 'settings', bundles.settings)
  }
}

registerSettingsNamespace()
