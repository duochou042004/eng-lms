// A failed dynamic import: Chromium, Firefox, WebKit, and Vite's CSS preload of a lazy chunk.
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|Unable to preload CSS/i

/** A route module that could not load (T-M2.12 scope 2); `RouteError` treats any route error while offline alike. */
export function isChunkLoadError(error: unknown) {
  return error instanceof Error && CHUNK_ERROR.test(error.message)
}

export const isOffline = () => globalThis.navigator?.onLine === false
