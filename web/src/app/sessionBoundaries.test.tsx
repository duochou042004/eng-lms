import type { QueryClient } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { AUTH_CHANNEL } from '../features/auth/api/authChannel'
import { api } from '../lib/api'
import { renderRoute } from '../test/render'
import { problem, server, sessionAs, sessionBody, setXsrfCookie } from '../test/server'
import { openAccountMenu } from '../test/shell'

// T-M2.20 AC3 (T-M2.15 SEC S-1, DEC-144 (2)): at each session boundary the mutation cache is cleared with the query
// cache, so no write of the earlier session (its variables and answer) stays readable in the client.

/** A finished students write, as a guardian add leaves it: variables and data in the mutation cache. */
async function seedFinishedWrite(client: QueryClient) {
  const mutation = client.getMutationCache().build(client, {
    mutationKey: ['students', 'guardians', 'create'],
    mutationFn: async (body: { name: string }) => ({ id: 'g-secret', ...body }),
  })
  await mutation.execute({ name: 'Phụ huynh bí mật' })
  expect(client.getMutationCache().getAll()).toContain(mutation)
  expect(mutation.state).toMatchObject({
    status: 'success',
    variables: { name: 'Phụ huynh bí mật' },
    data: { id: 'g-secret' },
  })
  return mutation
}

describe('the mutation cache at the session boundaries (T-M2.20 AC3)', { timeout: 20_000 }, () => {
  it('sign-in success: no mutation at all stays (the sign-in password included) and the redirect still works', async () => {
    server.use(http.post('*/api/v1/auth/login', () => HttpResponse.json(sessionBody('TUTOR'))))
    const { router, queryClient } = renderRoute('/login')
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })
    await seedFinishedWrite(queryClient)
    await userEvent.type(screen.getByLabelText('Tên đăng nhập (bắt buộc)'), 'co-lan')
    await userEvent.type(screen.getByLabelText('Mật khẩu (bắt buộc)'), 'mat-khau-dung')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/tutor/today'))
    expect(queryClient.getMutationCache().getAll()).toEqual([])
  })

  it.each([['answered 204', () => new HttpResponse(null, { status: 204 })]])(
    'sign-out, the call %s: the earlier write is gone',
    async (_, logoutResponse) => {
      setXsrfCookie()
      let loggedOut = false
      server.use(
        http.get('*/api/v1/auth/session', () =>
          loggedOut ? problem(401, 'UNAUTHENTICATED') : HttpResponse.json(sessionBody('TUTOR')),
        ),
        http.post('*/api/v1/auth/logout', () => {
          loggedOut = true
          return logoutResponse()
        }),
      )
      const { queryClient } = renderRoute('/tutor')
      await screen.findByText('Lớp cô Lan')
      const write = await seedFinishedWrite(queryClient)
      await openAccountMenu()
      await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
      await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })
      expect(queryClient.getMutationCache().getAll()).not.toContain(write)
      expect(queryClient.getMutationCache().findAll({ mutationKey: ['students'] })).toEqual([])
    },
  )

  // T-M2.29 (j): a query of the page left behind answers 401 while /login loads (its session read held open).
  it('sign-out with a 401 during its navigation: no write and no query of the earlier session after /login loads', async () => {
    setXsrfCookie()
    let loggedOut = false
    let release = () => {}
    let reached = () => {}
    const held = new Promise<void>((resolve) => (reached = resolve))
    const gate = new Promise<void>((resolve) => (release = resolve))
    server.use(
      http.get('*/api/v1/auth/session', async () => {
        if (!loggedOut) return HttpResponse.json(sessionBody('TUTOR'))
        reached()
        await gate
        return problem(401, 'UNAUTHENTICATED')
      }),
      http.post('*/api/v1/auth/logout', () => {
        loggedOut = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { router, queryClient } = renderRoute('/tutor')
    await screen.findByText('Lớp cô Lan')
    const write = await seedFinishedWrite(queryClient)
    await openAccountMenu()
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    await held
    // The race refetches a page query of the earlier session; its answer is a 401.
    server.use(http.get('*/api/v1/tutor/students', () => problem(401, 'SESSION_EXPIRED')))
    await queryClient
      .fetchQuery({ queryKey: ['students', 'race'], queryFn: () => api.GET('/api/v1/tutor/students') })
      .catch(() => undefined)
    release()
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })
    expect(router.state.location.pathname + router.state.location.search).toBe('/login')
    expect(queryClient.getMutationCache().getAll()).not.toContain(write)
    await waitFor(() => expect(queryClient.getQueryCache().findAll({ queryKey: ['students'] })).toEqual([]))
  })

  // T-M2.13 scope 3 (c), DEC-155: the session is still alive on the server, so its caches stay.
  it("a failing call keeps the session's caches: the seeded write is still there, no navigation", async () => {
    setXsrfCookie()
    server.use(
      sessionAs('TUTOR'),
      http.post('*/api/v1/auth/logout', () => HttpResponse.error() as unknown as Response),
    )
    const { router, queryClient } = renderRoute('/tutor')
    await screen.findByText('Lớp cô Lan')
    const write = await seedFinishedWrite(queryClient)
    await openAccountMenu()
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    await screen.findByText('Bạn vẫn đang đăng nhập. Hãy thử lại.')
    expect(queryClient.getMutationCache().getAll()).toContain(write)
    expect(queryClient.getQueryData(['settings', 'meta'])).toBeDefined()
    expect(router.state.location.pathname).toBe('/tutor/today')
  })

  it('a 401 from any call: the earlier write is gone', async () => {
    server.use(sessionAs('TUTOR'))
    const { queryClient } = renderRoute('/tutor/today')
    await screen.findByText('Lớp cô Lan')
    const write = await seedFinishedWrite(queryClient)
    server.use(
      sessionAs(null),
      http.get('*/api/v1/meta', () => problem(401, 'SESSION_EXPIRED')),
    )
    await queryClient.refetchQueries({ queryKey: ['settings', 'meta'] })
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })
    expect(queryClient.getMutationCache().getAll()).not.toContain(write)
  })

  it('a cross-tab message (dropAllButSession): the earlier write is gone and the tab follows the session', async () => {
    server.use(sessionAs('TUTOR'))
    const { router, queryClient } = renderRoute('/tutor/today')
    await screen.findByText('Lớp cô Lan')
    const write = await seedFinishedWrite(queryClient)
    server.use(sessionAs(null))
    const channel = new BroadcastChannel(AUTH_CHANNEL)
    channel.postMessage({ type: 'signed-out' })
    channel.close()
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(queryClient.getMutationCache().getAll()).not.toContain(write)
  })
})
