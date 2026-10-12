import { useState } from 'react'
import { useLocation } from 'react-router'

/**
 * Open state of a shell overlay (drawer, sheet, popover) that closes on every navigation: it is open only while the
 * location it was opened at is current. Derived in render, so the overlay is gone in the same commit as the new page
 * (link, browser Back, a redirect) and the route focus can land on the new page's `h1`. It also closes when `frame` changes
 * (the shell's wide/narrow frame, AC11 (i)): the overlay stops rendering then, and must not come back open when the frame
 * changes back.
 */
export function useOverlay(frame?: unknown) {
  const { key } = useLocation()
  const [openAt, setOpenAt] = useState<string | null>(null)
  const [openFrame, setOpenFrame] = useState(frame)
  if (openFrame !== frame) {
    // Adjusting state during render (React's "storing information from previous renders" pattern): no extra commit.
    setOpenFrame(frame)
    setOpenAt(null)
  }
  const isOpen = openAt === key
  return {
    isOpen,
    open: () => setOpenAt(key),
    close: () => setOpenAt(null),
    setOpen: (open: boolean) => setOpenAt(open ? key : null),
  }
}
