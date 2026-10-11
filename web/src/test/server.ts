import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

export const META = { name: 'englms', version: '0.0.1-test', locales: ['vi', 'en'], displayName: 'Lớp cô Lan' }

export function problem(status: number, code: string, requestId = 'req-test-1', extra: Record<string, unknown> = {}) {
  return HttpResponse.json(
    { type: `https://englms.local/problems/${code.toLowerCase()}`, title: 'Error', status, code, requestId, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json', 'X-Request-Id': requestId } },
  )
}

export type TestRole = 'TUTOR' | 'STUDENT'

/** A `GET /auth/session` body (SessionResponse). */
export function sessionBody(role: TestRole, mustChangePassword = false) {
  return {
    userId: role === 'TUTOR' ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002',
    username: role === 'TUTOR' ? 'co-lan' : 'an.nguyen',
    role,
    displayName: null,
    locale: 'vi',
    timeZone: 'Asia/Ho_Chi_Minh',
    mustChangePassword,
  }
}

/** The browser's `XSRF-TOKEN` cookie as the server would set it (MSW cannot set cookies in jsdom). */
export function setXsrfCookie(value = 'xsrf-test-token') {
  document.cookie = `XSRF-TOKEN=${value}; path=/`
}

export function clearXsrfCookie() {
  document.cookie = 'XSRF-TOKEN=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

/** `GET /auth/session` answering as `role` (or anonymous with `null`); it primes the XSRF cookie, like the server. */
export function sessionAs(role: TestRole | null, mustChangePassword = false) {
  return http.get('*/api/v1/auth/session', () => {
    setXsrfCookie()
    return role ? HttpResponse.json(sessionBody(role, mustChangePassword)) : problem(401, 'UNAUTHENTICATED')
  })
}

// Default: anonymous visitor; public metadata.
export const handlers = [sessionAs(null), http.get('*/api/v1/meta', () => HttpResponse.json(META))]

/** Mock API for component tests (MSW). */
export const server = setupServer(...handlers)
