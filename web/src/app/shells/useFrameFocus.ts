import { useEffect, useRef, type RefObject } from 'react'

/**
 * When the shell switches frame (wide ↔ narrow: a resize or rotation across `md`/`lg`), an open overlay unmounts with
 * its trigger and focus falls to `body`. Then focus moves to the new frame's trigger (the first control in the shell
 * that opens a dialog: the menu button, the account menu button or the More tab), so a keyboard user keeps their place
 * (AC11 (f)). A frame change with focus elsewhere leaves it alone; the first render never moves focus.
 */
export function useFrameFocus(wide: boolean, root: RefObject<HTMLElement | null>) {
  const previous = useRef(wide)
  useEffect(() => {
    if (previous.current === wide) return
    previous.current = wide
    if (document.activeElement && document.activeElement !== document.body) return
    root.current?.querySelector<HTMLElement>('[aria-haspopup="dialog"]')?.focus()
  }, [wide, root])
}
