import { useEffect, useState } from 'react'

/** interaction-states §1: a skeleton appears only after 150 ms, so fast loads don't flash. */
export const SKELETON_DELAY_MS = 150

/**
 * `true` once `active` has stayed `true` for `delayMs` (the shared 150 ms rule of interaction-states §1, §3); back to
 * `false` as soon as `active` is `false`. Used by `DelayedSkeleton` and the navigation progress line (T-M2.12).
 */
export function useDelayed(active: boolean, delayMs = SKELETON_DELAY_MS) {
  const [elapsed, setElapsed] = useState(false)
  useEffect(() => {
    if (!active || delayMs <= 0) return
    const timer = setTimeout(() => setElapsed(true), delayMs)
    return () => {
      clearTimeout(timer)
      setElapsed(false)
    }
  }, [active, delayMs])
  return active && (delayMs <= 0 || elapsed)
}
