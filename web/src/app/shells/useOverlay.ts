import { useState } from 'react'
import { useLocation } from 'react-router'

/**
 * Open state of a shell overlay (drawer, sheet, popover) that closes on every navigation: it is open only while the
 * location it was opened at is current. Derived in render, so the overlay is gone in the same commit as the new page
 * (link, browser Back, a redirect) and the route focus can land on the new page's `h1`.
 */
export function useOverlay() {
  const { key } = useLocation()
  const [openAt, setOpenAt] = useState<string | null>(null)
  const isOpen = openAt === key
  return {
    isOpen,
    open: () => setOpenAt(key),
    close: () => setOpenAt(null),
    setOpen: (open: boolean) => setOpenAt(open ? key : null),
  }
}
