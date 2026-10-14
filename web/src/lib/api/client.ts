import createClient, { type Middleware } from 'openapi-fetch'
import { ApiError, toApiError } from './problem'
import type { paths } from './schema'

// Same-origin API (ADR-0004); an absolute base keeps it working in tests (jsdom) too.
const baseUrl = globalThis.location?.origin ?? ''

/** The SPA CSRF pair (ADR-0005, NFR-SEC-07): the server sets the cookie, the client echoes it in the header. */
export const XSRF_COOKIE = 'XSRF-TOKEN'
export const XSRF_HEADER = 'X-XSRF-TOKEN'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * An auth failure the app reacts to (frontend-architecture §2): by navigating, or for `FORBIDDEN_ROLE` by reading the
 * session again (another tab may have signed in as someone else, T-M2.12).
 */
export type AuthProblem = 'UNAUTHENTICATED' | 'PASSWORD_CHANGE_REQUIRED' | 'FORBIDDEN_ROLE'
type AuthProblemListener = (problem: AuthProblem) => void

// A 401 from these is an answer, not a lost session: the bootstrap reads "anonymous" from it, a login shows its error.
const NO_SIGN_IN_REDIRECT = new Set(['GET /api/v1/auth/session', 'POST /api/v1/auth/login'])

let authProblemListener: AuthProblemListener | null = null

/** Registers the app's reaction to a 401 or a 403 `PASSWORD_CHANGE_REQUIRED` / `FORBIDDEN_ROLE` (one listener). Returns the unsubscribe. */
export function onAuthProblem(listener: AuthProblemListener) {
  authProblemListener = listener
  return () => {
    if (authProblemListener === listener) authProblemListener = null
  }
}

export function readCookie(name: string): string | null {
  for (const part of (globalThis.document?.cookie ?? '').split(';')) {
    const separator = part.indexOf('=')
    if (separator > 0 && part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim())
    }
  }
  return null
}

/**
 * Sends `X-XSRF-TOKEN` = the `XSRF-TOKEN` cookie on every non-GET request. When the cookie is missing (e.g. a
 * remember-me sign-in during a logout expired it), `GET /auth/session` re-primes it first; it is a GET, so this
 * middleware does not recurse, and it is excluded from the sign-in redirect.
 */
const xsrf: Middleware = {
  async onRequest({ request }) {
    if (SAFE_METHODS.has(request.method)) return undefined
    let token = readCookie(XSRF_COOKIE)
    if (!token) {
      await api.GET('/api/v1/auth/session').catch(() => undefined)
      token = readCookie(XSRF_COOKIE)
    }
    if (token) request.headers.set(XSRF_HEADER, token)
    return request
  },
}

const problemDetails: Middleware = {
  async onResponse({ request, response, schemaPath }) {
    if (!response.ok) {
      const error = await toApiError(response)
      if (error.status === 401 && !NO_SIGN_IN_REDIRECT.has(`${request.method} ${schemaPath}`)) {
        authProblemListener?.('UNAUTHENTICATED')
      } else if (
        error.status === 403 &&
        (error.code === 'PASSWORD_CHANGE_REQUIRED' || error.code === 'FORBIDDEN_ROLE')
      ) {
        authProblemListener?.(error.code)
      }
      throw error
    }
    return response
  },
  onError({ error }) {
    return error instanceof ApiError ? error : new ApiError(0, 'NETWORK_ERROR', null)
  },
}

/** The typed API client, generated from api/openapi.json (ADR-0014). The only code that performs HTTP calls. */
export const api = createClient<paths>({
  baseUrl,
  credentials: 'same-origin',
  // Resolved per call (not captured at import), so instrumentation such as MSW in tests sees every request.
  fetch: (request) => globalThis.fetch(request),
})
api.use(xsrf, problemDetails)
