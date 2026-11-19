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
 * stays where it is (on Log out). `className` lets a caller set the scroll target's margin (the account section keeps Log
 * out and its focus ring in view above it, T-M2.31 (b)); where both cannot fit in a scrolling ancestor, the text wins (AC2o).
 */
/** The nearest ancestor that scrolls on the block axis (the drawer's footer, the popover), if any. */
function scrollport(el: HTMLElement) {
  for (let p = el.parentElement; p; p = p.parentElement)
    if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) return p
  return null
}

/** The bottom of the alert's text: the box of its last text (the message), inside the alert's padding and border. */
function textBottom(el: HTMLElement) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let last: Node | null = null
  for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.textContent?.trim()) last = node
  return last?.parentElement?.getBoundingClientRect().bottom ?? null
}

/**
 * After the `nearest` scroll, inside a scrolling ancestor (T-M2.31 (b), AC2o, DEC-183): the alert text wins. Where the
 * caller's start margin (Log out with its focus ring) and the text cannot both fit, the scrollport moves on until the
 * whole text shows (the three-line offline copy in the drawer at 568×320). Where they fit, the margin's start is brought
 * fully back in when a whole-pixel scroll offset left it a fraction short (G3 QA-2), as far as the text allows.
 */
function fitInScrollport(el: HTMLElement) {
  const port = scrollport(el)
  const text = textBottom(el)
  if (!port || text === null) return
  const top = port.getBoundingClientRect().top + port.clientTop
  const bottom = top + port.clientHeight
  const start = el.getBoundingClientRect().top - (parseFloat(getComputedStyle(el).scrollMarginBlockStart) || 0)
  if (text > bottom) port.scrollTop += Math.ceil(text - bottom)
  else if (start < top) port.scrollTop -= Math.min(Math.ceil(top - start), Math.floor(bottom - text))
}

export function LogoutFailedAlert({ className }: { className?: string }) {
  const { t } = useTranslation('common')
  const [offline] = useState(isOffline)
  const ref = useRef<HTMLDivElement>(null)
  // A block body: the effect returns nothing. Chromium 158's scrollIntoView returns a Promise, which React would keep as
  // the cleanup and call on unmount (a TypeError, the route error page; T-M2.31 (c), DEC-182). jsdom has no
  // scrollIntoView (as StudentsListPage, ui/Toast).
  useEffect(() => {
    const el = ref.current
    if (!el?.scrollIntoView) return
    el.scrollIntoView({ block: 'nearest' })
    fitInScrollport(el)
  }, [])
  return (
    <div ref={ref} className={className}>
      <InlineAlert tone="danger" title={t('logout.failedTitle')}>
        {t(offline ? 'logout.offline' : 'logout.failed')}
      </InlineAlert>
    </div>
  )
}
