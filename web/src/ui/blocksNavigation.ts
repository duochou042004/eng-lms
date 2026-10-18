import type { Location } from 'react-router'

/** Targets never blocked: a sign-out (own or another tab's) and a role redirect (interaction-states §2.6). */
const ALWAYS_PASS = ['/login', '/forbidden']
/** The one target a navigation marked `state.forced === true` may reach unasked: the forced change (DEC-123 SEC S4-5). */
const FORCED_TARGET = '/change-password'

const isForced = (state: unknown) => (state as { forced?: unknown } | null)?.forced === true

/**
 * Whether a dirty form blocks a navigation from `currentLocation` to `nextLocation`: every move to another pathname,
 * except to `/login` and `/forbidden`; a navigation marked `state.forced === true` passes only when it goes to
 * `/change-password` (the auth reaction's forced change); a forced mark on any other target is blocked like any other.
 */
export function blocksNavigation(
  isDirty: boolean,
  { currentLocation, nextLocation }: { currentLocation: Location; nextLocation: Location },
) {
  return (
    isDirty &&
    nextLocation.pathname !== currentLocation.pathname &&
    !ALWAYS_PASS.includes(nextLocation.pathname) &&
    !(isForced(nextLocation.state) && nextLocation.pathname === FORCED_TARGET)
  )
}
