import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isOffline } from '../../../app/routes/chunkError'
import { InlineAlert } from '../../../ui'

/**
 * A failed Log out (T-M2.13 scope 3, DEC-155): the user is still signed in. Rendered by the account section and the
 * forced change-password page while `useLogout` holds its error, so it goes away when Log out is pressed again. The
 * copy is decided once, by the connection at the failure (when it mounts). `common` keys: its two callers use other
 * namespaces (G0 D-2). On mount it scrolls itself into view, `nearest` (T-M2.29 (h2)): below the fold on the forced
 * change-password page, inside the drawer's scrolling footer at short heights; no scroll where it is visible. Focus
 * stays where it is (on Log out).
 */
export function LogoutFailedAlert() {
  const { t } = useTranslation('common')
  const [offline] = useState(isOffline)
  const ref = useRef<HTMLDivElement>(null)
  // jsdom has no scrollIntoView (as StudentsListPage, ui/Toast).
  useEffect(() => ref.current?.scrollIntoView?.({ block: 'nearest' }), [])
  return (
    <div ref={ref}>
      <InlineAlert tone="danger" title={t('logout.failedTitle')}>
        {t(offline ? 'logout.offline' : 'logout.failed')}
      </InlineAlert>
    </div>
  )
}
