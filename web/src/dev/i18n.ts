import { i18n } from '../lib/i18n'
import enDev from '../lib/i18n/locales/en/dev.json'
import viDev from '../lib/i18n/locales/vi/dev.json'

/** The `dev` namespace: the `/dev/ui` gallery's strings (development builds only). */
export const devResources = { vi: { dev: viDev }, en: { dev: enDev } } as const

/**
 * Registers the `dev` namespace. Called when the lazily imported `/dev/ui` module is evaluated, so the strings exist only
 * in development builds (the route is behind `import.meta.env.DEV`, frontend-architecture §4). Idempotent.
 */
export function registerDevNamespace() {
  for (const [lng, bundles] of Object.entries(devResources)) {
    if (!i18n.hasResourceBundle(lng, 'dev')) i18n.addResourceBundle(lng, 'dev', bundles.dev)
  }
}
