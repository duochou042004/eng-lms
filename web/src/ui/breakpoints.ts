import { useSyncExternalStore } from 'react'

/**
 * Shell-level breakpoints (responsive-standards §1): the minimum viewport width of each name, in CSS px. CSS cannot read
 * these (no custom-media plugin): a stylesheet that needs one repeats the value with a comment naming this file.
 */
export const BREAKPOINTS = { sm: 480, md: 768, lg: 1024, xl: 1280, '2xl': 1536 } as const
export type Breakpoint = keyof typeof BREAKPOINTS

const query = (name: Breakpoint) => `(min-width: ${BREAKPOINTS[name]}px)`

/**
 * Whether the viewport is at least `name` wide; re-renders when that changes (rotation, resize, zoom). Read synchronously
 * on the first render, so a shell never draws the wrong frame first.
 */
export function useMinWidth(name: Breakpoint): boolean {
  const q = query(name)
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(q)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(q).matches,
  )
}
