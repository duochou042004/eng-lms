import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { SESSION_KEY } from '../features/auth/api/session'
import { expectNoAxeViolations } from '../test/axe'
import { renderRoute } from '../test/render'
import { problem, server, sessionAs, sessionBody, setXsrfCookie } from '../test/server'

const path = (router: ReturnType<typeof renderRoute>['router']) =>
  router.state.location.pathname + router.state.location.search

describe('route guards (T-M2.4 scope 3)', () => {
  it('sends an anonymous visit to /login?next= (AC1)', async () => {
    const { router } = renderRoute('/tutor/students')
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })
    expect(path(router)).toBe('/login?next=%2Ftutor%2Fstudents')
  })

  it.each([
    ['TUTOR', '/student/home', '/tutor/today', 'Trang này thuộc khu vực của học viên.'],
    ['STUDENT', '/tutor/students', '/student/home', 'Trang này dành cho gia sư.'],
  ] as const)('sends a %s visiting %s to /forbidden, with a link to %s (AC7)', async (role, visit, home, why) => {
    server.use(sessionAs(role))
    const { router, container } = renderRoute(visit)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Bạn không có quyền mở trang này' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/forbidden')
    expect(screen.getByText(why)).toBeInTheDocument() // G3 UX-7: plain, role-aware copy
    const link = screen.getByRole('link', { name: 'Về trang chính của bạn' })
    expect(link).toHaveAttribute('href', home)
    expect(screen.getByRole('radiogroup', { name: 'Ngôn ngữ' })).toBeInTheDocument()
    await expectNoAxeViolations(container)
    await userEvent.click(link)
    await waitFor(() => expect(router.state.location.pathname).toBe(home))
  })

  it('completes GET /auth/session before any other API request on a cold load (DEC-092, AC1)', async () => {
    const events: string[] = []
    server.events.on('request:start', ({ request }) => events.push(`start ${new URL(request.url).pathname}`))
    server.events.on('response:mocked', ({ request }) => events.push(`end ${new URL(request.url).pathname}`))
    server.use(
      http.get('*/api/v1/auth/session', async () => {
        await delay(30)
        setXsrfCookie()
        return HttpResponse.json(sessionBody('TUTOR'))
      }),
    )
    renderRoute('/tutor')
    await screen.findByText('Lớp cô Lan')
    expect(events.slice(0, 3)).toEqual(['start /api/v1/auth/session', 'end /api/v1/auth/session', 'start /api/v1/meta'])
    expect(events.filter((e) => e === 'start /api/v1/auth/session')).toHaveLength(1)
  })

  it('on a 401 from any call, clears the cache and goes to /login?next=<current path> (scope 2)', async () => {
    server.use(sessionAs('TUTOR'))
    const { router, queryClient } = renderRoute('/tutor/students?q=an')
    await screen.findByText('Lớp cô Lan')
    server.use(
      sessionAs(null),
      http.get('*/api/v1/meta', () => problem(401, 'SESSION_EXPIRED')),
    )
    await queryClient.refetchQueries({ queryKey: ['settings', 'meta'] })
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })
    expect(path(router)).toBe('/login?next=%2Ftutor%2Fstudents%3Fq%3Dan')
    expect(queryClient.getQueryData(SESSION_KEY)).toBeNull()
  })

  it('on a 403 PASSWORD_CHANGE_REQUIRED, reads the session again and goes to /change-password (scope 2)', async () => {
    server.use(sessionAs('STUDENT'))
    const { router, queryClient } = renderRoute('/student')
    await screen.findByText('Lớp cô Lan')
    server.use(
      sessionAs('STUDENT', true),
      http.get('*/api/v1/meta', () => problem(403, 'PASSWORD_CHANGE_REQUIRED')),
    )
    await queryClient.refetchQueries({ queryKey: ['settings', 'meta'] })
    await screen.findByText(/Hãy đặt mật khẩu mới trước khi tiếp tục/)
    expect(router.state.location.pathname).toBe('/change-password')
  })
})

describe('Log out (FR-AUTH-04, scope 7)', () => {
  function signedInUntilLogout(logoutResponse: () => Response) {
    let loggedOut = false
    const posts: Array<string | null> = []
    server.use(
      http.get('*/api/v1/auth/session', () => {
        setXsrfCookie()
        return loggedOut ? problem(401, 'UNAUTHENTICATED') : HttpResponse.json(sessionBody('TUTOR'))
      }),
      http.post('*/api/v1/auth/logout', ({ request }) => {
        loggedOut = true
        posts.push(request.headers.get('X-XSRF-TOKEN'))
        return logoutResponse()
      }),
    )
    return posts
  }

  it('ends the session, clears the cache and shows /login; a protected visit afterwards asks to sign in', async () => {
    const posts = signedInUntilLogout(() => new HttpResponse(null, { status: 204 }))
    const { router } = renderRoute('/tutor')
    await screen.findByText('Lớp cô Lan')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })
    expect(posts).toEqual(['xsrf-test-token'])
    expect(router.state.location.pathname).toBe('/login')
    await router.navigate(-1)
    await waitFor(() => expect(path(router)).toBe('/login?next=%2Ftutor'))
  })

  it('still goes to /login when the logout call fails', async () => {
    signedInUntilLogout(() => HttpResponse.error() as unknown as Response)
    const { router } = renderRoute('/tutor')
    await screen.findByText('Lớp cô Lan')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })
    expect(router.state.location.pathname).toBe('/login')
  })
})
