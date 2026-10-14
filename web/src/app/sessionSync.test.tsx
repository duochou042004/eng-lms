import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { AUTH_CHANNEL } from '../features/auth/api/authChannel'
import { SESSION_KEY } from '../features/auth/api/session'
import { api } from '../lib/api'
import { renderRoute } from '../test/render'
import { META, problem, server, sessionAs, sessionBody, setXsrfCookie } from '../test/server'
import { openAccountMenu } from '../test/shell'
import { connectAuthProblems } from './guards'
import { createQueryClient } from './queryClient'
import { createTestRouter } from './router'

// T-M2.12 scope 3 and 4 (T-M2.4 SEC S4-2): a tab follows a session changed elsewhere, through a 403 FORBIDDEN_ROLE or
// another tab's sign-in/out message, and never keeps a previous user's cached data.

const path = (router: { state: { location: { pathname: string; search: string } } }) =>
  router.state.location.pathname + router.state.location.search
const TUTOR_DATA = ['tutor', 'students'] as const

/** Counts the requests the mock server sees, as `METHOD path`. */
function recordCalls() {
  const calls: string[] = []
  server.events.on('request:start', ({ request }) => calls.push(`${request.method} ${new URL(request.url).pathname}`))
  return calls
}
const sessionReads = (calls: string[]) => calls.filter((c) => c === 'GET /api/v1/auth/session').length

/** Another tab of the same browser: its own channel instance. Records what it receives. */
function otherTab() {
  const channel = new BroadcastChannel(AUTH_CHANNEL)
  const received: unknown[] = []
  channel.addEventListener('message', (event) => received.push(event.data))
  return { post: (data: unknown) => channel.postMessage(data), received }
}

/** A tutor's tab on `at`, with some cached tutor data (a stand-in for the pages of T-M2.5). */
async function tutorTab(at = '/tutor/today') {
  server.use(sessionAs('TUTOR'))
  const result = renderRoute(at)
  await screen.findByRole('heading', { level: 1, name: 'Hôm nay' })
  result.queryClient.setQueryData(TUTOR_DATA, [{ name: 'An' }])
  return result
}

const bareTabs: Array<() => void> = []
afterEach(() => bareTabs.splice(0).forEach((disconnect) => disconnect()))

/** The router and cache alone (no rendering, so no page refetches anything): the receiver's own effect on the cache. */
async function bareTab(at: string) {
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({ queries: { retry: false } })
  const router = createTestRouter(queryClient, at)
  const disconnect = connectAuthProblems(router, queryClient)
  bareTabs.push(disconnect)
  await waitFor(() => expect(router.state.initialized && router.state.navigation.state === 'idle').toBe(true))
  return { router, queryClient, disconnect }
}

describe('403 FORBIDDEN_ROLE (T-M2.12 AC4)', () => {
  it.each([
    ['STUDENT', '/forbidden'],
    [null, '/login?next=%2Ftutor%2Ftoday'],
  ] as const)(
    'the server now says %s: one session read, cached data gone, the guards send the tab to %s',
    async (role, target) => {
      const { router, queryClient } = await tutorTab()
      const calls = recordCalls()
      server.use(
        sessionAs(role),
        http.get('*/api/v1/meta', () => problem(403, 'FORBIDDEN_ROLE'), { once: true }),
      )
      const error = await api.GET('/api/v1/meta').catch((e: unknown) => e)
      expect(error).toMatchObject({ status: 403, code: 'FORBIDDEN_ROLE' })
      await waitFor(() => expect(path(router)).toBe(target))
      expect(queryClient.getQueryData(TUTOR_DATA)).toBeUndefined()
      expect(queryClient.getQueryData(SESSION_KEY)).toEqual(role ? sessionBody(role) : null)
      expect(sessionReads(calls)).toBe(1)
      expect(calls).not.toContain('POST /api/v1/auth/logout')
    },
  )

  it('the session is unchanged: no navigation, the cache stays', async () => {
    const { router, queryClient } = await tutorTab('/tutor/today?tab=1')
    const calls = recordCalls()
    server.use(http.get('*/api/v1/meta', () => problem(403, 'FORBIDDEN_ROLE'), { once: true }))
    await api.GET('/api/v1/meta').catch(() => undefined)
    await waitFor(() => expect(sessionReads(calls)).toBe(1))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(path(router)).toBe('/tutor/today?tab=1')
    expect(queryClient.getQueryData(TUTOR_DATA)).toEqual([{ name: 'An' }])
  })

  it('three concurrent 403s cause one session read', async () => {
    const { router } = await tutorTab()
    const calls = recordCalls()
    let forbidden = 3
    server.use(
      sessionAs('STUDENT'),
      http.get('*/api/v1/meta', () => (forbidden-- > 0 ? problem(403, 'FORBIDDEN_ROLE') : HttpResponse.json(META))),
    )
    await Promise.all([1, 2, 3].map(() => api.GET('/api/v1/meta').catch(() => undefined)))
    await waitFor(() => expect(router.state.location.pathname).toBe('/forbidden'))
    expect(sessionReads(calls)).toBe(1)
  })
})

describe('cross-tab sign-in/out: the receiving tab (T-M2.12 AC5, AC6, AC7)', () => {
  it('signed-out: the tab goes to /login?next=, with only the anonymous session cached (AC5)', async () => {
    server.use(sessionAs('TUTOR'))
    const { router, queryClient } = await bareTab('/tutor/today')
    queryClient.setQueryData(TUTOR_DATA, [{ name: 'An' }])
    queryClient.setQueryData(['settings', 'meta'], { displayName: 'Lớp cô Lan' })
    server.use(sessionAs(null))
    otherTab().post({ type: 'signed-out' })
    await waitFor(() => expect(path(router)).toBe('/login?next=%2Ftutor%2Ftoday'))
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .map((q) => q.queryKey),
    ).toEqual([SESSION_KEY])
    expect(queryClient.getQueryData(SESSION_KEY)).toBeNull()
  })

  it('signed-out, rendered: the page leaves tutor content without user action', async () => {
    const { router, queryClient } = await tutorTab()
    server.use(sessionAs(null))
    otherTab().post({ type: 'signed-out' })
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })
    expect(path(router)).toBe('/login?next=%2Ftutor%2Ftoday')
    expect(queryClient.getQueryData(TUTOR_DATA)).toBeUndefined()
    expect(screen.queryByRole('heading', { name: 'Hôm nay' })).not.toBeInTheDocument()
  })

  it('signed-in as a student while on a tutor page: the guard sends the tab to /forbidden (AC6)', async () => {
    const { router, queryClient } = await tutorTab()
    server.use(sessionAs('STUDENT'))
    otherTab().post({ type: 'signed-in' })
    await waitFor(() => expect(router.state.location.pathname).toBe('/forbidden'))
    expect(queryClient.getQueryData(TUTOR_DATA)).toBeUndefined()
  })

  it.each([
    ['TUTOR', false, '/tutor/today'],
    ['STUDENT', true, '/change-password'],
  ] as const)(
    'on /login, another tab signs in (%s, must change: %s): the tab goes to %s and never logs out (AC6, D-2)',
    async (role, mustChange, target) => {
      const { router } = await bareTab('/login?next=%2Ftutor')
      const calls = recordCalls()
      server.use(sessionAs(role, mustChange))
      otherTab().post({ type: 'signed-in' })
      await waitFor(() => expect(router.state.location.pathname).toBe(target))
      expect(calls).not.toContain('POST /api/v1/auth/logout')
      // `/`, replaced: Back does not return to the sign-in page of the old state.
      expect(router.state.historyAction).toBe('REPLACE')
    },
  )

  it('on /login, a signed-out message changes nothing', async () => {
    const { router } = await bareTab('/login')
    const calls = recordCalls()
    otherTab().post({ type: 'signed-out' })
    await waitFor(() => expect(sessionReads(calls)).toBe(1))
    expect(path(router)).toBe('/login')
    expect(calls).not.toContain('POST /api/v1/auth/logout')
  })

  it('a revalidation of /login never runs its must-change logout (DEC-116 (4))', async () => {
    const { router } = await bareTab('/login')
    const calls = recordCalls()
    server.use(sessionAs('STUDENT', true))
    await router.revalidate()
    expect(calls).not.toContain('POST /api/v1/auth/logout')
    expect(path(router)).toBe('/login')
  })

  it('ignores unknown or malformed messages', async () => {
    const { router, queryClient } = await tutorTab()
    const calls = recordCalls()
    const tab = otherTab()
    for (const data of [
      { type: 'signed-out', userId: 'x' },
      { type: 'logout' },
      'signed-out',
      null,
      [{ type: 'signed-out' }],
      { kind: 'signed-in' },
    ])
      tab.post(data)
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(calls).toEqual([])
    expect(path(router)).toBe('/tutor/today')
    expect(queryClient.getQueryData(TUTOR_DATA)).toEqual([{ name: 'An' }])
  })

  it('a received message never makes the tab post (no ping-pong)', async () => {
    await tutorTab()
    const sender = otherTab()
    const watcher = otherTab()
    server.use(sessionAs(null))
    sender.post({ type: 'signed-out' })
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(watcher.received).toEqual([{ type: 'signed-out' }])
    expect(sender.received).toEqual([])
  })
})

describe('cross-tab sign-in/out: the posting tab (T-M2.12 AC7)', () => {
  it('a sign-in posts exactly { type: "signed-in" }', async () => {
    const tab = otherTab()
    server.use(http.post('*/api/v1/auth/login', () => HttpResponse.json(sessionBody('TUTOR'))))
    renderRoute('/login')
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })
    await userEvent.type(screen.getByLabelText('Tên đăng nhập (bắt buộc)'), 'co-lan')
    await userEvent.type(screen.getByLabelText('Mật khẩu (bắt buộc)'), 'mat-khau-dung')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    await screen.findByRole('heading', { level: 1, name: 'Hôm nay' })
    await waitFor(() => expect(tab.received).toEqual([{ type: 'signed-in' }]))
  })

  it('a failed sign-in posts nothing', async () => {
    const tab = otherTab()
    server.use(http.post('*/api/v1/auth/login', () => problem(401, 'BAD_CREDENTIALS')))
    renderRoute('/login')
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })
    await userEvent.type(screen.getByLabelText('Tên đăng nhập (bắt buộc)'), 'co-lan')
    await userEvent.type(screen.getByLabelText('Mật khẩu (bắt buộc)'), 'sai')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    await screen.findByRole('alert')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(tab.received).toEqual([])
  })

  it.each([
    ['succeeded', () => new HttpResponse(null, { status: 204 })],
    ['failed', () => HttpResponse.error() as unknown as Response],
  ])('a logout that %s posts exactly { type: "signed-out" }', async (_, answer) => {
    const tab = otherTab()
    server.use(sessionAs('TUTOR'))
    renderRoute('/tutor/today')
    await screen.findByRole('heading', { level: 1, name: 'Hôm nay' })
    setXsrfCookie()
    server.use(http.post('*/api/v1/auth/logout', answer), sessionAs(null))
    await openAccountMenu()
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })
    await waitFor(() => expect(tab.received).toEqual([{ type: 'signed-out' }]))
  })

  it('the /login guard posts { type: "signed-out" } after logging out a must-change session', async () => {
    const tab = otherTab()
    let loggedOut = false
    server.use(
      http.get('*/api/v1/auth/session', () => {
        setXsrfCookie()
        return loggedOut ? problem(401, 'UNAUTHENTICATED') : HttpResponse.json(sessionBody('STUDENT', true))
      }),
      http.post('*/api/v1/auth/logout', () => {
        loggedOut = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderRoute('/login')
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })
    await waitFor(() => expect(tab.received).toEqual([{ type: 'signed-out' }]))
  })
})
