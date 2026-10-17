import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { markClientNavigation } from '../lib/navigation'

export { usePageTitle } from '../lib/i18n/pageTitle'

/**
 * After every client-side navigation (link, `navigate()`, browser back/forward), moves focus to the new page's `h1`
 * (accessibility §2; PageHeader and EmptyState render it with `tabIndex={-1}`). On the first load, including a reload,
 * focus stays on `body`, so the skip link is the first Tab stop.
 *
 * The first load is detected with a ref holding the last seen location, not with `useNavigationType` (the initial
 * location is a POP, like browser back) nor with `location.key` alone (a reload keeps the key in `history.state`). The
 * ref survives React's StrictMode effect replay, so focus never moves on mount. Hash-only changes (the skip link) are
 * ignored (an in-page jump: same path, a hash). A navigation to the page already shown (a nav item or home link of the
 * current page, T-M2.11) has a new key and no hash: it moves focus too, as any activated navigation does. A change of
 * the search params alone (same pathname) is an in-page view change and keeps focus where it is (T-M2.5).
 * Used once, in the root layout: the effect runs after the new route's DOM is committed, and React Router resolves a
 * lazy route before it commits the new location, so the `h1` exists by then.
 */
export function useRouteFocus() {
  const { pathname, search, hash, key } = useLocation()
  const previous = useRef<{ pathname: string; search: string; key: string } | null>(null)
  useEffect(() => {
    const before = previous.current
    previous.current = { pathname, search, key }
    if (before === null) return
    if (before.pathname === pathname && before.search === search && (before.key === key || hash !== '')) return
    markClientNavigation()
    // Only the search params changed on the same page: an in-page view change (a list's search, filter, sort or page,
    // T-M2.5), so focus stays on the control that made it.
    if (before.pathname === pathname && before.search !== search) return
    document.querySelector<HTMLElement>('main h1')?.focus()
  }, [pathname, search, hash, key])
}
