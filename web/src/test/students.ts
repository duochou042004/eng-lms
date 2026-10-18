import { http, HttpResponse } from 'msw'
import { server, sessionAs } from './server'

/** MSW fixtures for the Students pages (T-M2.5): rows, a student DTO and the page envelope (api-catalog "tutor: students"). */
export const SID = '11111111-2222-4333-8444-555555555555'

export function row(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    fullName: `Học viên ${String(index).padStart(2, '0')}`,
    username: `hocvien${index}`,
    status: 'ACTIVE',
    email: `hv${index}@example.com`,
    phone: `0901 000 ${String(index).padStart(3, '0')}`,
    createdAt: '2026-10-01T03:00:00Z',
    ...overrides,
  }
}

export function page(items: unknown[], { page = 0, size = 25, totalItems = items.length } = {}) {
  return { items, page, size, totalItems, totalPages: Math.ceil(totalItems / size) }
}

export function student(overrides: Record<string, unknown> = {}) {
  return {
    id: SID,
    fullName: 'Nguyễn Văn An',
    username: 'nguyenvanan',
    status: 'ACTIVE',
    email: 'an@example.com',
    phone: '0901 234 567',
    contactHandles: [{ label: 'Zalo', value: 'https://zalo.me/0901234567' }],
    note: 'Dòng một\nDòng hai',
    createdAt: '2026-10-01T03:00:00Z',
    updatedAt: '2026-10-01T03:00:00Z',
    version: 0,
    ...overrides,
  }
}

/** `GET /tutor/students` answering one page of the given rows for every query. */
export function listOf(items: unknown[]) {
  return http.get('*/api/v1/tutor/students', () => HttpResponse.json(page(items)))
}

export const RESET_CREDENTIALS = {
  username: 'nguyenvanan',
  temporaryPassword: 'Reset-Pw-7x9Kq2mVb4',
  expiresAt: '2026-10-25T03:25:00Z',
}

export interface WorkspaceCalls {
  gets: number
  patch: Record<string, unknown>[]
  status: Array<{ status: string; version: number }>
  reset: number
  availability: string[]
}

/**
 * The workspace page's API (T-M2.14) as a small server: GET answers the current student; PATCH applies the body and
 * bumps `version` (not for a username-only change, api-catalog); a status change sets the status and bumps it; a reset
 * answers `RESET_CREDENTIALS`. Stale versions answer 409 `STALE_VERSION`. `taken` usernames are unavailable.
 */
export function workspaceApi(
  initial: Record<string, unknown> = {},
  { taken = ['tranbinh'] }: { taken?: string[] } = {},
) {
  let current: Record<string, unknown> = student(initial)
  const calls: WorkspaceCalls = { gets: 0, patch: [], status: [], reset: 0, availability: [] }
  const stale = (version: unknown) =>
    version !== current.version
      ? HttpResponse.json(
          { type: 'about:blank', title: 'Conflict', status: 409, code: 'STALE_VERSION', requestId: 'req-1' },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        )
      : null
  server.use(
    sessionAs('TUTOR'),
    http.get('*/api/v1/tutor/students/:sid', () => {
      calls.gets += 1
      return HttpResponse.json(current)
    }),
    http.get('*/api/v1/tutor/students', () => HttpResponse.json(page([row(1)]))),
    http.patch('*/api/v1/tutor/students/:sid', async ({ request }) => {
      const { version, ...changes } = (await request.json()) as Record<string, unknown>
      calls.patch.push({ version, ...changes })
      const conflict = stale(version)
      if (conflict) return conflict
      const usernameOnly = Object.keys(changes).every((k) => k === 'username')
      current = { ...current, ...changes, version: usernameOnly ? current.version : Number(current.version) + 1 }
      return HttpResponse.json(current)
    }),
    http.post('*/api/v1/tutor/students/:sid/status', async ({ request }) => {
      const body = (await request.json()) as { status: string; version: number }
      calls.status.push(body)
      const conflict = stale(body.version)
      if (conflict) return conflict
      current = { ...current, status: body.status, version: Number(current.version) + 1 }
      return HttpResponse.json(current)
    }),
    http.post('*/api/v1/tutor/students/:sid/password-reset', () => {
      calls.reset += 1
      return HttpResponse.json(RESET_CREDENTIALS)
    }),
    http.get('*/api/v1/tutor/usernames/availability', ({ request }) => {
      const username = new URL(request.url).searchParams.get('username')!
      calls.availability.push(username)
      const available = !taken.includes(username)
      return HttpResponse.json({ username, available, reason: available ? null : 'TAKEN' })
    }),
  )
  return {
    calls,
    get current() {
      return current
    },
    /** Another tab's change: the server's student moves on without this page knowing. */
    changeElsewhere(changes: Record<string, unknown>) {
      current = { ...current, ...changes, version: Number(current.version) + 1 }
    },
  }
}
