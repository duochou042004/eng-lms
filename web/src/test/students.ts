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

/** A guardian DTO (GuardianResponse, T-M2.15). */
export function guardian(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `aaaaaaaa-0000-4000-8000-${String(index).padStart(12, '0')}`,
    name: `Phụ huynh ${String(index).padStart(2, '0')}`,
    relationship: 'Mẹ',
    phone: '0912 345 678',
    email: `ph${index}@example.com`,
    notes: null,
    version: 0,
    ...overrides,
  }
}

/** A learning profile DTO (LearningProfileResponse, T-M2.17); the default is a never-saved one (`version` `null`). */
export function learningProfile(overrides: Record<string, unknown> = {}) {
  return {
    currentLevel: null,
    strengths: [],
    weaknesses: [],
    learningNotes: null,
    customFields: [],
    updatedAt: null,
    version: null,
    ...overrides,
  }
}

export interface WorkspaceCalls {
  gets: number
  patch: Record<string, unknown>[]
  status: Array<{ status: string; version: number }>
  reset: number
  availability: string[]
  guardianGets: number
  guardianPost: Record<string, unknown>[]
  guardianPatch: Array<{ gid: string; body: Record<string, unknown> }>
  guardianDelete: string[]
  profileGets: number
  profilePut: Record<string, unknown>[]
}

/**
 * The workspace page's API (T-M2.14) as a small server: GET answers the current student; PATCH applies the body and
 * bumps `version` (not for a username-only change, api-catalog); a status change sets the status and bumps it; a reset
 * answers `RESET_CREDENTIALS`. Stale versions answer 409 `STALE_VERSION`. `taken` usernames are unavailable. The
 * guardians (T-M2.15): GET lists them in order; POST appends (an 11th answers 422 `TOO_MANY`); PATCH applies the body
 * and bumps the guardian's `version` (409 when stale, 404 when gone); DELETE removes (404 when gone). The learning
 * profile (T-M2.17): GET answers it; PUT follows the server's transitions (`version` `null` creates it, 409 when it
 * exists; a number must match; equal values keep the version; a first save with values answers version 1).
 */
export function workspaceApi(
  initial: Record<string, unknown> = {},
  {
    taken = ['tranbinh'],
    guardians: initialGuardians = [],
    profile: initialProfile = {},
  }: { taken?: string[]; guardians?: Array<Record<string, unknown>>; profile?: Record<string, unknown> } = {},
) {
  let current: Record<string, unknown> = student(initial)
  let guardians = [...initialGuardians]
  let nextGuardian = 100
  let profile: Record<string, unknown> = learningProfile(initialProfile)
  const calls: WorkspaceCalls = {
    gets: 0,
    patch: [],
    status: [],
    reset: 0,
    availability: [],
    guardianGets: 0,
    guardianPost: [],
    guardianPatch: [],
    guardianDelete: [],
    profileGets: 0,
    profilePut: [],
  }
  const notFound = () =>
    HttpResponse.json(
      { type: 'about:blank', title: 'Not found', status: 404, code: 'NOT_FOUND', requestId: 'req-404' },
      { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
    )
  const staleFor = (version: unknown, saved: unknown) =>
    version !== saved
      ? HttpResponse.json(
          { type: 'about:blank', title: 'Conflict', status: 409, code: 'STALE_VERSION', requestId: 'req-1' },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        )
      : null
  const stale = (version: unknown) => staleFor(version, current.version)
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
    http.get('*/api/v1/tutor/students/:sid/guardians', () => {
      calls.guardianGets += 1
      return HttpResponse.json(guardians)
    }),
    http.post('*/api/v1/tutor/students/:sid/guardians', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      calls.guardianPost.push(body)
      if (guardians.length >= 10)
        return HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Invalid',
            status: 422,
            code: 'VALIDATION_FAILED',
            requestId: 'req-422',
            errors: [{ field: 'guardians', code: 'TOO_MANY' }],
          },
          { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
        )
      const created = guardian(nextGuardian++, { relationship: null, phone: null, email: null, notes: null, ...body })
      guardians = [...guardians, created]
      return HttpResponse.json(created, { status: 201 })
    }),
    http.patch('*/api/v1/tutor/guardians/:gid', async ({ request, params }) => {
      const gid = params.gid as string
      const { version, ...changes } = (await request.json()) as Record<string, unknown>
      calls.guardianPatch.push({ gid, body: { version, ...changes } })
      const found = guardians.find((g) => g.id === gid)
      if (!found) return notFound()
      const conflict = staleFor(version, found.version)
      if (conflict) return conflict
      const updated = { ...found, ...changes, version: Number(found.version) + 1 }
      guardians = guardians.map((g) => (g.id === gid ? updated : g))
      return HttpResponse.json(updated)
    }),
    http.get('*/api/v1/tutor/students/:sid/learning-profile', () => {
      calls.profileGets += 1
      return HttpResponse.json(profile)
    }),
    http.put('*/api/v1/tutor/students/:sid/learning-profile', async ({ request }) => {
      const { version, ...values } = (await request.json()) as Record<string, unknown>
      calls.profilePut.push({ version, ...values })
      // version null creates (409 when one exists); a number must match the stored one (409 otherwise).
      const conflict = staleFor(version ?? null, profile.version)
      if (conflict) return conflict
      const next = { ...learningProfile(), ...values }
      // As the server: a first save creates the empty row (version 0) and then applies the values (version 1 if any).
      const base = profile.version === null ? learningProfile() : profile
      const same = ['currentLevel', 'strengths', 'weaknesses', 'learningNotes', 'customFields'].every(
        (k) => JSON.stringify(next[k as keyof typeof next]) === JSON.stringify(base[k as keyof typeof base]),
      )
      const stored = Number(profile.version ?? 0) + (same ? 0 : 1)
      profile = { ...next, updatedAt: '2026-10-21T03:00:00Z', version: stored }
      return HttpResponse.json(profile)
    }),
    http.delete('*/api/v1/tutor/guardians/:gid', ({ params }) => {
      const gid = params.gid as string
      calls.guardianDelete.push(gid)
      if (!guardians.some((g) => g.id === gid)) return notFound()
      guardians = guardians.filter((g) => g.id !== gid)
      return new HttpResponse(null, { status: 204 })
    }),
  )
  return {
    calls,
    get current() {
      return current
    },
    get guardians() {
      return guardians
    },
    get profile() {
      return profile
    },
    /** Another tab's learning-profile save (or its first save, which creates the profile with version 0). */
    saveProfileElsewhere(changes: Record<string, unknown>) {
      profile = { ...profile, ...changes, version: profile.version === null ? 0 : Number(profile.version) + 1 }
    },
    /** Another tab's guardian change, removal or addition. */
    changeGuardianElsewhere(gid: string, changes: Record<string, unknown>) {
      guardians = guardians.map((g) => (g.id === gid ? { ...g, ...changes, version: Number(g.version) + 1 } : g))
    },
    removeGuardianElsewhere(gid: string) {
      guardians = guardians.filter((g) => g.id !== gid)
    },
    addGuardianElsewhere(added: Record<string, unknown>) {
      guardians = [...guardians, added]
    },
    /** Another tab's change: the server's student moves on without this page knowing. */
    changeElsewhere(changes: Record<string, unknown>) {
      current = { ...current, ...changes, version: Number(current.version) + 1 }
    },
  }
}
