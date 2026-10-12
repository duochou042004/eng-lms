/**
 * jsdom has no `matchMedia` and no layout. This stub answers `(min-width: Npx)` queries (the only kind the app uses,
 * `ui/breakpoints.ts`) against `window.innerWidth`; `setViewportWidth` changes it and notifies the listeners, like a
 * resize or a rotation. The default width is jsdom's 1024 px (tutor sidebar, student top bar).
 */
type Listener = (event: { matches: boolean }) => void
const listeners = new Map<string, Set<Listener>>()

const matches = (query: string) => {
  const min = /\(min-width:\s*(\d+)px\)/.exec(query)
  if (!min) throw new Error(`matchMedia stub: unsupported query ${query}`)
  return window.innerWidth >= Number(min[1])
}

export function installMatchMedia() {
  window.matchMedia = (query: string) =>
    ({
      media: query,
      get matches() {
        return matches(query)
      },
      addEventListener: (_type: string, listener: Listener) => {
        if (!listeners.has(query)) listeners.set(query, new Set())
        listeners.get(query)!.add(listener)
      },
      removeEventListener: (_type: string, listener: Listener) => listeners.get(query)?.delete(listener),
    }) as unknown as MediaQueryList
}

export function setViewportWidth(width: number) {
  const before = new Map([...listeners.keys()].map((q) => [q, matches(q)]))
  window.innerWidth = width
  for (const [query, set] of listeners) {
    if (before.get(query) !== matches(query)) for (const listener of [...set]) listener({ matches: matches(query) })
  }
}

export const DEFAULT_VIEWPORT_WIDTH = 1024
