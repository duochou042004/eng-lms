import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../../test/axe'
import { renderRoute } from '../../test/render'
import { problem, server, sessionAs, sessionBody, setXsrfCookie } from '../../test/server'
import { openAccountMenu } from '../../test/shell'

const LABEL = {
  current: 'Mật khẩu hiện tại (bắt buộc)',
  new: 'Mật khẩu mới (bắt buộc)',
  confirm: 'Nhập lại mật khẩu mới (bắt buộc)',
}

async function openPage(path = '/change-password') {
  const result = renderRoute(path)
  await screen.findByRole('heading', { level: 1, name: 'Đổi mật khẩu' })
  return result
}

async function fill(current: string, next: string, confirm = next) {
  if (current) await userEvent.type(screen.getByLabelText(LABEL.current), current)
  if (next) await userEvent.type(screen.getByLabelText(LABEL.new), next)
  if (confirm) await userEvent.type(screen.getByLabelText(LABEL.confirm), confirm)
  await userEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }))
}

function rejectWith(field: string, code: string) {
  server.use(
    http.post('*/api/v1/auth/password', () =>
      problem(422, 'VALIDATION_FAILED', 'req-422', { errors: [{ field, code, message: 'dev text' }] }),
    ),
  )
}

describe('/change-password, voluntary mode (FR-AUTH-05, AC5)', () => {
  it('has three labelled password fields with new-password autocomplete, a hint and Cancel', async () => {
    server.use(sessionAs('TUTOR'))
    const { container } = await openPage()
    expect(screen.getByText('Sau khi đổi, bạn sẽ bị đăng xuất trên mọi thiết bị khác.')).toBeInTheDocument()
    expect(screen.getByLabelText(LABEL.current)).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByLabelText(LABEL.new)).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText(LABEL.confirm)).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText(LABEL.new)).toHaveAccessibleDescription(expect.stringContaining('Từ 10 đến 128 ký tự'))
    expect(screen.getByRole('button', { name: 'Huỷ' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Ngôn ngữ' })).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('checks on the client: the summary lists the errors as links and takes focus; no request', async () => {
    server.use(sessionAs('TUTOR'))
    const { container } = await openPage()
    let posts = 0
    server.use(http.post('*/api/v1/auth/password', () => (posts++, new HttpResponse(null, { status: 204 }))))
    await fill('', 'ngan', 'khac')
    const summary = await screen.findByRole('alert', { name: 'Mật khẩu chưa được đổi' })
    await waitFor(() => expect(summary).toHaveFocus())
    const links = within(summary).getAllByRole('link')
    expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Hãy nhập mật khẩu hiện tại.', '#password-current'],
      ['Mật khẩu mới cần ít nhất 10 ký tự.', '#password-new'],
      ['Hai lần nhập mật khẩu mới không khớp nhau.', '#password-confirm'],
    ])
    expect(screen.getByLabelText(LABEL.new)).toHaveAccessibleDescription(
      expect.stringContaining('Mật khẩu mới cần ít nhất 10 ký tự.'),
    )
    await userEvent.click(links[1]!)
    expect(screen.getByLabelText(LABEL.new)).toHaveFocus()
    expect(posts).toBe(0)
    await expectNoAxeViolations(container)
  })

  it.each([
    ['currentPassword', 'CURRENT_PASSWORD_INCORRECT', LABEL.current, 'Mật khẩu hiện tại không đúng.'],
    ['newPassword', 'PASSWORD_TOO_SHORT', LABEL.new, 'Mật khẩu mới cần ít nhất 10 ký tự.'],
    ['newPassword', 'PASSWORD_TOO_LONG', LABEL.new, 'Mật khẩu mới chỉ được tối đa 128 ký tự.'],
    ['newPassword', 'PASSWORD_TOO_COMMON', LABEL.new, 'Mật khẩu này quá phổ biến, dễ bị đoán. Hãy chọn mật khẩu khác.'],
    ['newPassword', 'PASSWORD_EQUALS_USERNAME', LABEL.new, 'Mật khẩu mới không được trùng với tên đăng nhập.'],
    ['newPassword', 'PASSWORD_UNCHANGED', LABEL.new, 'Mật khẩu mới phải khác mật khẩu hiện tại.'],
  ])('shows the server code %s/%s on its field and focuses the summary', async (field, code, label, message) => {
    server.use(sessionAs('TUTOR'))
    await openPage()
    rejectWith(field, code)
    await fill('mat-khau-cu-1', 'mat-khau-moi-1')
    const summary = await screen.findByRole('alert', { name: 'Mật khẩu chưa được đổi' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(within(summary).getByRole('link', { name: message })).toBeInTheDocument()
    const input = screen.getByLabelText(label)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(expect.stringContaining(message))
  })

  it('shows a network failure in the summary', async () => {
    server.use(
      sessionAs('TUTOR'),
      http.post('*/api/v1/auth/password', () => HttpResponse.error()),
    )
    await openPage()
    await fill('mat-khau-cu-1', 'mat-khau-moi-1')
    const summary = await screen.findByRole('alert', { name: 'Mật khẩu chưa được đổi' })
    expect(summary).toHaveTextContent('Không kết nối được máy chủ')
  })

  it('confirms success and that other devices were signed out; sends only current and new', async () => {
    const bodies: unknown[] = []
    server.use(
      sessionAs('STUDENT'),
      http.post('*/api/v1/auth/password', async ({ request }) => {
        bodies.push(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { router } = await openPage()
    await fill('mat-khau-cu-1', 'mat-khau-moi-1')
    const success = await screen.findByRole('status')
    expect(success).toHaveTextContent('Đã đổi mật khẩu')
    expect(success).toHaveTextContent('Bạn đã bị đăng xuất trên các thiết bị khác.')
    expect(bodies).toEqual([{ currentPassword: 'mat-khau-cu-1', newPassword: 'mat-khau-moi-1' }])
    await waitFor(() => expect(success.parentElement).toHaveFocus())
    await userEvent.click(screen.getByRole('link', { name: 'Về trang chính' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/student/home'))
  })

  it('Cancel goes back', async () => {
    server.use(sessionAs('TUTOR'))
    const { router } = renderRoute('/tutor/students')
    // T-M2.11: no Students page yet, so the 404 inside the tutor shell; the link is in the account menu.
    await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy trang' })
    await openAccountMenu()
    await userEvent.click(screen.getByRole('link', { name: 'Đổi mật khẩu' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Huỷ' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/tutor/students'))
  })

  it('sends an anonymous visitor to /login', async () => {
    const { router } = renderRoute('/change-password')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })
})

describe('/change-password: the first failed client check focuses the summary (G3 UX-1)', () => {
  it.each([
    ['voluntary', false, 'click'],
    ['voluntary', false, 'Enter'],
    ['forced', true, 'click'],
    ['forced', true, 'Enter'],
  ] as const)('%s mode, first empty submit by %s', async (_mode, forced, how) => {
    server.use(sessionAs('STUDENT', forced))
    await openPage()
    if (how === 'click') await userEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }))
    else {
      await userEvent.click(screen.getByLabelText(LABEL.current))
      await userEvent.keyboard('{Enter}')
    }
    const summary = await screen.findByRole('alert', { name: 'Mật khẩu chưa được đổi' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(within(summary).getAllByRole('link')).toHaveLength(3)
  })

  it.each(['too short', 'mismatch'])('first submit with a %s new password focuses the summary', async (kind) => {
    server.use(sessionAs('TUTOR'))
    await openPage()
    if (kind === 'too short') await fill('mat-khau-cu-1', 'ngan')
    else await fill('mat-khau-cu-1', 'mat-khau-moi-1', 'mat-khau-moi-2')
    const summary = await screen.findByRole('alert', { name: 'Mật khẩu chưa được đổi' })
    await waitFor(() => expect(summary).toHaveFocus())
  })

  it('tabbing through empty fields shows no error (G3 UX-5)', async () => {
    server.use(sessionAs('TUTOR'))
    await openPage()
    await userEvent.click(screen.getByLabelText(LABEL.current))
    for (let i = 0; i < 6; i++) await userEvent.tab()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    for (const label of Object.values(LABEL)) expect(screen.getByLabelText(label)).not.toHaveAttribute('aria-invalid')
  })
})

describe('/change-password, forced mode (FR-AUTH-06, AC4)', () => {
  function forcedThenChanged() {
    let changed = false
    server.use(
      http.get('*/api/v1/auth/session', () => {
        setXsrfCookie()
        return HttpResponse.json(sessionBody('STUDENT', !changed))
      }),
      http.post('*/api/v1/auth/password', () => {
        changed = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
  }

  it('explains why and has no Cancel', async () => {
    server.use(sessionAs('STUDENT', true))
    const { container } = await openPage()
    expect(screen.getByText(/Hãy đặt mật khẩu mới trước khi tiếp tục/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Huỷ' })).not.toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('offers Log out (not Cancel): it ends the session and goes to /login (G3 UX-4)', async () => {
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
    const { router } = await openPage()
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })
    expect(loggedOut).toBe(true)
    expect(router.state.location.pathname).toBe('/login')
  })

  it('has no Log out button in voluntary mode (the header has one)', async () => {
    server.use(sessionAs('STUDENT'))
    await openPage()
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).not.toBeInTheDocument()
  })

  // T-M2.11: /student/work has no page yet, so the student shell shows its 404 there (AC1).
  it.each([
    ['/change-password', '/student/home', 'Trang của học viên'],
    ['/change-password?next=%2Fstudent%2Fwork', '/student/work', 'Không tìm thấy trang'],
    ['/change-password?next=%2Ftutor%2Fstudents', '/student/home', 'Trang của học viên'],
    ['/change-password?next=%2F%2Fevil.example', '/student/home', 'Trang của học viên'],
  ])('reads the session again after success and goes from %s to %s', async (path, target, title) => {
    forcedThenChanged()
    const { router } = await openPage(path)
    await fill('tam-thoi-123', 'mat-khau-moi-1')
    await waitFor(() => expect(router.state.location.pathname + router.state.location.search).toBe(target))
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Điều hướng học viên' })).toBeInTheDocument()
  })

  it.each(['/student/home', '/student/work', '/tutor/students', '/'])(
    'sends every protected URL (%s) to /change-password',
    async (path) => {
      server.use(sessionAs('STUDENT', true))
      const { router } = renderRoute(path)
      await screen.findByRole('heading', { level: 1, name: 'Đổi mật khẩu' })
      expect(router.state.location.pathname).toBe('/change-password')
    },
  )
})
