import createClient, { type Middleware } from 'openapi-fetch'
import { ApiError, toApiError } from './problem'
import type { paths } from './schema'

// Same-origin API (ADR-0004); an absolute base keeps it working in tests (jsdom) too.
const baseUrl = globalThis.location?.origin ?? ''

const problemDetails: Middleware = {
  async onResponse({ response }) {
    if (!response.ok) {
      throw await toApiError(response)
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
api.use(problemDetails)
