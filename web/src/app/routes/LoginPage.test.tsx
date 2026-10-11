import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { changeLocale } from '../../lib/i18n'
import { expectNoAxeViolations } from '../../test/axe'
import { renderRoute } from '../../test/render'
import {
  clearXsrfCookie,
  problem,
  server,
  sessionAs,
  sessionBody,
  setXsrfCookie,
  type TestRole,
} from '../../test/server'

/** Counts the requests the mock server sees, as `METHOD path`. */
function recordCalls() {
  const calls: string[] = []
  server.events.on('request:start', ({ request }) => {
    calls.push(`${request.method} ${new URL(request.url).pathname}`)
  })
  return calls
}

function loginAnswers(role: TestRole, mustChangePassword = false) {
  const bodies: unknown[] = []
  server.use(
    http.post('*/api/v1/auth/login', async ({ request }) => {
      bodies.push(await request.json())
      return HttpResponse.json(sessionBody(role, mustChangePassword))
    }),
  )
  return bodies
}

async function openLogin(path = '/login') {
  const result = renderRoute(path)
  await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })
  return result
}

async function fillAndSubmit(username = 'co-lan', password = 'mat-khau-dung') {
  await userEvent.type(screen.getByLabelText('Tên đăng nhập (bắt buộc)'), username)
  await userEvent.type(screen.getByLabelText('Mật khẩu (bắt buộc)'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
}

describe('/login (T-M2.4 scope 5)', () => {
  it('shows labelled fields with autocomplete, remember-me with the shared-device hint, the forgot-password disclosure and the switcher', async () => {
    const { container } = await openLogin()
    const username = screen.getByLabelText('Tên đăng nhập (bắt buộc)')
    expect(username).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Mật khẩu (bắt buộc)')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByRole('button', { name: 'Hiện mật khẩu' })).toBeInTheDocument()
    const remember = screen.getByRole('checkbox', { name: 'Ghi nhớ đăng nhập trên thiết bị này' })
    expect(remember).not.toBeChecked()
    expect(remember).toHaveAccessibleDescription(expect.stringContaining('Không chọn mục này trên thiết bị dùng chung'))
    const forgot = screen.getByText('Quên mật khẩu?')
    // UX-2: the disclosure keeps a visible marker (a decorative chevron) although the summary is a flex row.
    expect(forgot.closest('summary')!.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    expect(screen.getByText('Đăng nhập vào không gian dạy học của bạn.')).toBeInTheDocument()
    expect(forgot.closest('details')).not.toHaveAttribute('open')
    await userEvent.click(forgot)
    expect(forgot.closest('details')).toHaveAttribute('open')
    expect(screen.getByText(/hãy nhắn gia sư của bạn/)).toBeVisible()
    expect(screen.queryByRole('link', { name: /hướng dẫn/ })).not.toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Ngôn ngữ' })).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('validates on submit: both errors, focus on the first invalid field, no request', async () => {
    await openLogin()
    const calls = recordCalls()
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByText('Hãy nhập tên đăng nhập.')).toBeInTheDocument()
    expect(screen.getByText('Hãy nhập mật khẩu.')).toBeInTheDocument()
    expect(screen.getByLabelText('Tên đăng nhập (bắt buộc)')).toHaveFocus()
    expect(screen.getByLabelText('Tên đăng nhập (bắt buộc)')).toHaveAttribute('aria-invalid', 'true')
    expect(calls).toEqual([])
  })

  it('submitting empty with Enter shows the errors and focuses the first invalid field (G3 UX-1)', async () => {
    await openLogin()
    await userEvent.click(screen.getByLabelText('Tên đăng nhập (bắt buộc)'))
    await userEvent.keyboard('{Enter}')
    expect(await screen.findByText('Hãy nhập tên đăng nhập.')).toBeInTheDocument()
    expect(screen.getByLabelText('Tên đăng nhập (bắt buộc)')).toHaveFocus()
  })

  it('tabbing through empty fields shows no error; after a failed submit, typing clears it (G3 UX-5)', async () => {
    await openLogin()
    await userEvent.click(screen.getByLabelText('Tên đăng nhập (bắt buộc)'))
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    expect(screen.queryByText('Hãy nhập tên đăng nhập.')).not.toBeInTheDocument()
    expect(screen.queryByText('Hãy nhập mật khẩu.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Tên đăng nhập (bắt buộc)')).not.toHaveAttribute('aria-invalid')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByText('Hãy nhập tên đăng nhập.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Tên đăng nhập (bắt buộc)'), 'c')
    await waitFor(() => expect(screen.queryByText('Hãy nhập tên đăng nhập.')).not.toBeInTheDocument())
  })

  it('shows one generic message for a wrong password, an unknown username and a locked account; the session is not refetched (DEC-089, AC3)', async () => {
    server.use(http.post('*/api/v1/auth/login', () => problem(401, 'UNAUTHENTICATED')))
    const { router, container } = await openLogin('/login?next=%2Ftutor%2Fstudents')
    const calls = recordCalls()
    const messages: string[] = []
    for (const [username, password] of [
      ['co-lan', 'sai-mat-khau'],
      ['khong-ton-tai', 'mat-khau-bat-ky'],
      ['bi-khoa', 'mat-khau-dung'],
    ]) {
      await userEvent.clear(screen.getByLabelText('Tên đăng nhập (bắt buộc)'))
      await userEvent.clear(screen.getByLabelText('Mật khẩu (bắt buộc)'))
      await fillAndSubmit(username, password)
      const alert = await screen.findByRole('alert')
      messages.push(alert.textContent ?? '')
    }
    expect(new Set(messages).size).toBe(1)
    expect(messages[0]).toContain('Không đăng nhập được với tên đăng nhập và mật khẩu này')
    expect(calls).toEqual(['POST /api/v1/auth/login', 'POST /api/v1/auth/login', 'POST /api/v1/auth/login'])
    expect(router.state.location.pathname + router.state.location.search).toBe('/login?next=%2Ftutor%2Fstudents')
    await expectNoAxeViolations(container)
  })

  it('shows the wait from Retry-After for a 429, in vi and en (AC3)', async () => {
    server.use(
      http.post(
        '*/api/v1/auth/login',
        () =>
          new HttpResponse(JSON.stringify({ code: 'RATE_LIMITED', requestId: 'r' }), {
            status: 429,
            headers: { 'Content-Type': 'application/problem+json', 'Retry-After': '240' },
          }),
      ),
    )
    await openLogin()
    await fillAndSubmit()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Đã thử đăng nhập quá nhiều lần')
    expect(alert).toHaveTextContent('Hãy thử lại sau 4 phút.')
    await act(() => changeLocale('en'))
    expect(screen.getByRole('alert')).toHaveTextContent('Try again in 4 minutes.')
  })

  it('offers a retry after a network failure; the retry signs in (AC3)', async () => {
    let attempts = 0
    server.use(
      http.post('*/api/v1/auth/login', () => {
        attempts += 1
        return attempts === 1 ? HttpResponse.error() : HttpResponse.json(sessionBody('TUTOR'))
      }),
    )
    const { router } = await openLogin()
    await fillAndSubmit()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Không kết nối được máy chủ')
    await userEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/tutor/today'))
    expect(attempts).toBe(2)
  })

  it('cannot submit twice while a sign-in is pending (Enter and clicks)', async () => {
    let release: () => void = () => {}
    const released = new Promise<void>((resolve) => (release = resolve))
    let posts = 0
    server.use(
      http.post('*/api/v1/auth/login', async () => {
        posts += 1
        await released
        return HttpResponse.json(sessionBody('TUTOR'))
      }),
    )
    const { router } = await openLogin()
    await userEvent.type(screen.getByLabelText('Tên đăng nhập (bắt buộc)'), 'co-lan')
    await userEvent.type(screen.getByLabelText('Mật khẩu (bắt buộc)'), 'mat-khau-dung{Enter}')
    const pending = await screen.findByRole('button', { name: 'Đang đăng nhập…' })
    await userEvent.click(pending)
    await userEvent.type(screen.getByLabelText('Mật khẩu (bắt buộc)'), '{Enter}')
    release()
    await waitFor(() => expect(router.state.location.pathname).toBe('/tutor/today'))
    expect(posts).toBe(1)
  })

  it.each([
    ['TUTOR', '/login', '/tutor/today'],
    ['TUTOR', '/login?next=%2Ftutor%2Fstudents%3Fq%3Dan', '/tutor/students?q=an'],
    ['TUTOR', '/login?next=%2Fstudent%2Fhome', '/tutor/today'],
    ['TUTOR', '/login?next=%2F%2Fevil.example', '/tutor/today'],
    ['STUDENT', '/login?next=https%3A%2F%2Fevil.example', '/student/home'],
    ['STUDENT', '/login?next=%2Fstudent%2Fwork', '/student/work'],
  ] as const)('a %s signing in at %s lands on %s (T18, AC2)', async (role, path, target) => {
    const bodies = loginAnswers(role)
    const { router } = await openLogin(path)
    await fillAndSubmit()
    await waitFor(() => expect(router.state.location.pathname + router.state.location.search).toBe(target))
    expect(bodies).toEqual([{ username: 'co-lan', password: 'mat-khau-dung', rememberMe: false }])
  })

  it('sends rememberMe when ticked', async () => {
    const bodies = loginAnswers('STUDENT')
    const { router } = await openLogin()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ghi nhớ đăng nhập trên thiết bị này' }))
    await fillAndSubmit('an.nguyen', 'mat-khau-dung')
    await waitFor(() => expect(router.state.location.pathname).toBe('/student/home'))
    expect(bodies).toEqual([{ username: 'an.nguyen', password: 'mat-khau-dung', rememberMe: true }])
  })

  it.each([
    ['/login?next=%2Fstudent%2Fwork', '/change-password?next=%2Fstudent%2Fwork'],
    ['/login?next=%2Flogin', '/change-password'],
  ])('a session that must change its password goes from %s to %s', async (path, target) => {
    loginAnswers('STUDENT', true)
    const { router } = await openLogin(path)
    await fillAndSubmit()
    await waitFor(() => expect(router.state.location.pathname + router.state.location.search).toBe(target))
    expect(await screen.findByRole('heading', { level: 1, name: 'Đổi mật khẩu' })).toBeInTheDocument()
  })

  it('primes a missing XSRF-TOKEN cookie with GET /auth/session before the login request (AC3)', async () => {
    loginAnswers('TUTOR')
    const { router } = await openLogin()
    clearXsrfCookie()
    const calls = recordCalls()
    await fillAndSubmit()
    await waitFor(() => expect(router.state.location.pathname).toBe('/tutor/today'))
    expect(calls.slice(0, 2)).toEqual(['GET /api/v1/auth/session', 'POST /api/v1/auth/login'])
  })

  it.each([
    ['TUTOR', '/tutor/today'],
    ['STUDENT', '/student/home'],
  ] as const)('sends a signed-in %s to %s', async (role, home) => {
    server.use(sessionAs(role))
    const { router } = renderRoute('/login')
    await waitFor(() => expect(router.state.location.pathname).toBe(home))
  })

  it('logs out a session that must change its password, then shows the form (DEC-092)', async () => {
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
    const calls = recordCalls()
    const { router } = await openLogin()
    expect(loggedOut).toBe(true)
    expect(calls).toEqual(['GET /api/v1/auth/session', 'POST /api/v1/auth/logout'])
    expect(router.state.location.pathname).toBe('/login')
  })
})
