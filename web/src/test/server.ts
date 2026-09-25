import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

export const META = { name: 'englms', version: '0.0.1-test', locales: ['vi', 'en'], displayName: 'Lớp cô Lan' }

export const handlers = [http.get('*/api/v1/meta', () => HttpResponse.json(META))]

/** Mock API for component tests (MSW). */
export const server = setupServer(...handlers)

export function problem(status: number, code: string, requestId = 'req-test-1') {
  return HttpResponse.json(
    { type: `https://englms.local/problems/${code.toLowerCase()}`, title: 'Error', status, code, requestId },
    { status, headers: { 'Content-Type': 'application/problem+json', 'X-Request-Id': requestId } },
  )
}
