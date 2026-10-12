import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

/**
 * Sets `document.title` to `<page title> · <app name>` (frontend-architecture §3). Every route component calls it with
 * its translated title, so the title follows a language change without a navigation.
 */
export function usePageTitle(pageTitle: string) {
  const { t } = useTranslation()
  const documentTitle = t('app.documentTitle', { page: pageTitle, app: t('app.name') })
  useEffect(() => {
    document.title = documentTitle
  }, [documentTitle])
}

/**
 * After every client-side navigation (link, `navigate()`, browser back/forward), moves focus to the new page's `h1`
 * (accessibility §2; PageHeader and EmptyState render it with `tabIndex={-1}`). On the first load, including a reload,
 * focus stays on `body`, so the skip link is the first Tab stop.
 *
 * The first load is detected with a ref holding the last seen location, not with `useNavigationType` (the initial
 * location is a POP, like browser back) nor with `location.key` alone (a reload keeps the key in `history.state`). The
 * ref survives React's StrictMode effect replay, so focus never moves on mount. Hash-only changes (the skip link) are
 * ignored (an in-page jump: same path, a hash). A navigation to the page already shown (a nav item or home link of the
 * current page, T-M2.11) has a new key and no hash: it moves focus too, as any activated navigation does.
 * Used once, in the root layout: the effect runs after the new route's DOM is committed, and React Router resolves a
 * lazy route before it commits the new location, so the `h1` exists by then.
 */
export function useRouteFocus() {
  const { pathname, search, hash, key } = useLocation()
  const path = pathname + search
  const previous = useRef<{ path: string; key: string } | null>(null)
  useEffect(() => {
    const before = previous.current
    previous.current = { path, key }
    if (before === null) return
    if (before.path === path && (before.key === key || hash !== '')) return
    document.querySelector<HTMLElement>('main h1')?.focus()
  }, [path, hash, key])
}
