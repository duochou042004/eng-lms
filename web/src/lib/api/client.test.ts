import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { problem, server, setXsrfCookie } from '../../test/server'
import { api, onAuthProblem, readCookie, XSRF_HEADER } from './client'
import { ApiError } from './problem'

/** Every request the mock server saw, as `METHOD path` with the XSRF header. */
function recordRequests() {
  const seen: Array<{ call: string; xsrf: string | null }> = []
  server.events.on('request:start', ({ request }) => {
    seen.push({ call: `${request.method} ${new URL(request.url).pathname}`, xsrf: request.headers.get(XSRF_HEADER) })
  })
  return seen
}

describe('XSRF middleware (NFR-SEC-07, frontend-architecture §2)', () => {
  it('sends X-XSRF-TOKEN equal to the cookie on every non-GET request', async () => {
    setXsrfCookie('token-from-cookie')
    server.use(
      http.post('*/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
      http.post('*/api/v1/auth/password', () => new HttpResponse(null, { status: 204 })),
      http.post('*/api/v1/auth/login', () => HttpResponse.json({})),
    )
    const seen = recordRequests()
    await api.POST('/api/v1/auth/logout')
    await api.POST('/api/v1/auth/password', { body: { currentPassword: 'a', newPassword: 'b' } })
    await api.POST('/api/v1/auth/login', { body: { username: 'a', password: 'b' } })
    expect(seen).toEqual([
      { call: 'POST /api/v1/auth/logout', xsrf: 'token-from-cookie' },
      { call: 'POST /api/v1/auth/password', xsrf: 'token-from-cookie' },
      { call: 'POST /api/v1/auth/login', xsrf: 'token-from-cookie' },
    ])
  })

  it('decodes the cookie value as the server encodes it', async () => {
    document.cookie = `XSRF-TOKEN=${encodeURIComponent('a/b+c=')}; path=/`
    expect(readCookie('XSRF-TOKEN')).toBe('a/b+c=')
  })

  it('sends no header on GET', async () => {
    setXsrfCookie('token-from-cookie')
    const seen = recordRequests()
    await api.GET('/api/v1/meta')
    expect(seen).toEqual([{ call: 'GET /api/v1/meta', xsrf: null }])
  })

  it('without the cookie, primes it with GET /auth/session first, then sends it (AC3)', async () => {
    // The default session handler answers 401 and sets the cookie, as the server does for anonymous callers.
    server.use(http.post('*/api/v1/auth/login', () => HttpResponse.json({})))
    const seen = recordRequests()
    await api.POST('/api/v1/auth/login', { body: { username: 'a', password: 'b' } })
    expect(seen).toEqual([
      { call: 'GET /api/v1/auth/session', xsrf: null },
      { call: 'POST /api/v1/auth/login', xsrf: 'xsrf-test-token' },
    ])
  })

  it('still sends the request (without the header) when priming does not set the cookie', async () => {
    server.use(
      http.get('*/api/v1/auth/session', () => HttpResponse.error()),
      http.post('*/api/v1/auth/logout', () => problem(403, 'CSRF_INVALID')),
    )
    const seen = recordRequests()
    const error = await api.POST('/api/v1/auth/logout').catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 403, code: 'CSRF_INVALID' })
    expect(seen.map((s) => s.call)).toEqual(['GET /api/v1/auth/session', 'POST /api/v1/auth/logout'])
    expect(seen[1]!.xsrf).toBeNull()
  })
})

describe('auth problem reactions (frontend-architecture §2)', () => {
  it('reports a 401 from any call except GET /auth/session and POST /auth/login', async () => {
    setXsrfCookie()
    const listener = vi.fn()
    const off = onAuthProblem(listener)
    server.use(
      http.get('*/api/v1/meta', () => problem(401, 'SESSION_EXPIRED')),
      http.post('*/api/v1/auth/password', () => problem(401, 'UNAUTHENTICATED')),
      http.post('*/api/v1/auth/login', () => problem(401, 'UNAUTHENTICATED')),
    )
    await api.GET('/api/v1/auth/session').catch(() => undefined)
    await api.POST('/api/v1/auth/login', { body: { username: 'a', password: 'b' } }).catch(() => undefined)
    expect(listener).not.toHaveBeenCalled()
    await api.GET('/api/v1/meta').catch(() => undefined)
    await api.POST('/api/v1/auth/password', { body: { currentPassword: 'a', newPassword: 'b' } }).catch(() => undefined)
    expect(listener.mock.calls).toEqual([['UNAUTHENTICATED'], ['UNAUTHENTICATED']])
    off()
  })

  it('reports a 403 PASSWORD_CHANGE_REQUIRED, but not another 403', async () => {
    const listener = vi.fn()
    const off = onAuthProblem(listener)
    server.use(http.get('*/api/v1/meta', () => problem(403, 'FORBIDDEN_ROLE')))
    await api.GET('/api/v1/meta').catch(() => undefined)
    expect(listener).not.toHaveBeenCalled()
    server.use(http.get('*/api/v1/meta', () => problem(403, 'PASSWORD_CHANGE_REQUIRED')))
    const error = await api.GET('/api/v1/meta').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(listener.mock.calls).toEqual([['PASSWORD_CHANGE_REQUIRED']])
    off()
  })

  it('stops reporting after unsubscribing', async () => {
    const listener = vi.fn()
    onAuthProblem(listener)()
    server.use(http.get('*/api/v1/meta', () => problem(401, 'UNAUTHENTICATED')))
    await api.GET('/api/v1/meta').catch(() => undefined)
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('Problem Details extras', () => {
  it('maps errors[] to field errors and Retry-After to seconds', async () => {
    setXsrfCookie()
    server.use(
      http.post('*/api/v1/auth/password', () =>
        problem(422, 'VALIDATION_FAILED', 'r-1', {
          errors: [
            { field: 'newPassword', code: 'PASSWORD_TOO_COMMON', message: 'x' },
            { field: 'other', code: 'SOMETHING_NEW' },
          ],
        }),
      ),
      http.post(
        '*/api/v1/auth/login',
        () =>
          new HttpResponse(JSON.stringify({ code: 'RATE_LIMITED', requestId: 'r-2' }), {
            status: 429,
            headers: { 'Content-Type': 'application/problem+json', 'Retry-After': '240' },
          }),
      ),
    )
    const changed = await api
      .POST('/api/v1/auth/password', { body: { currentPassword: 'a', newPassword: 'b' } })
      .catch((e: unknown) => e)
    expect(changed).toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      fieldErrors: [
        { field: 'newPassword', code: 'PASSWORD_TOO_COMMON' },
        { field: 'other', code: 'UNKNOWN' },
      ],
    })
    const limited = await api
      .POST('/api/v1/auth/login', { body: { username: 'a', password: 'b' } })
      .catch((e: unknown) => e)
    expect(limited).toMatchObject({ status: 429, code: 'RATE_LIMITED', retryAfterSeconds: 240 })
  })
})
