/**
 * Whether this app instance has made a client-side navigation yet (set by the root layout's route focus, T-M2.5). A page
 * whose `h1` arrives after its data uses it to move focus there only after a navigation, never on a first load or a
 * reload (accessibility §2: focus stays on `body` then, so the skip link is the first Tab stop).
 */
let navigated = false

export function markClientNavigation() {
  navigated = true
}

export function hasClientNavigated() {
  return navigated
}

/** For tests: a fresh app instance per test. */
export function resetClientNavigation() {
  navigated = false
}
