import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../../../test/axe'
import { renderRoute } from '../../../test/render'
import { problem, server, sessionBody, STUDENT_ACCOUNT } from '../../../test/server'

// T-M2.7 AC6: the student's Account page (`/student/account`).

const h1 = () => screen.findByRole('heading', { level: 1, name: 'Tài khoản' })
const timeZone = () => screen.getByRole('combobox', { name: 'Múi giờ' })
const save = () => screen.getByRole('button', { name: /^(Lưu|Đang lưu…)$/ })

/** The student's session as saved on the server; a preferences save updates it, as the server does. */
function studentSession() {
  let account: Record<string, unknown> = sessionBody('STUDENT')
  const sent: Record<string, unknown>[] = []
  server.use(
    http.get('*/api/v1/auth/session', () => {
      document.cookie = 'XSRF-TOKEN=xsrf-test-token; path=/'
      return HttpResponse.json(account)
    }),
    http.patch('*/api/v1/auth/preferences', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      sent.push(body)
      account = { ...account, ...body }
      return HttpResponse.json(account)
    }),
  )
  return sent
}

async function openPage() {
  const result = renderRoute('/student/account')
  await h1()
  await screen.findByRole('combobox', { name: 'Múi giờ' })
  return result
}

async function chooseBangkok() {
  await userEvent.click(timeZone())
  await userEvent.keyboard('{Control>}a{/Control}bangkok{ArrowDown}{Enter}')
  expect(timeZone()).toHaveValue('Asia/Bangkok')
}

// jsdom has no layout: React Aria's virtualised list renders every row unless sizes are defined (ui/ComboBox.test).
const sizes = { clientHeight: 440, clientWidth: 320, scrollHeight: 44, scrollWidth: 320 }
beforeEach(() => {
  for (const [name, value] of Object.entries(sizes))
    Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get: () => value })
})
afterEach(() => {
  for (const name of Object.keys(sizes)) delete (HTMLElement.prototype as unknown as Record<string, unknown>)[name]
})

describe('T-M2.7 AC6: the name block', () => {
  it('shows Full name and Username, the switcher, Time zone, Save disabled, Change password; no Display name', async () => {
    studentSession()
    const { container } = await openPage()
    const details = await screen.findByText(STUDENT_ACCOUNT.fullName)
    const list = details.closest('dl')!
    expect(
      within(list)
        .getAllByRole('term')
        .map((n) => n.textContent),
    ).toEqual(['Họ tên', 'Tên đăng nhập'])
    expect(
      within(list)
        .getAllByRole('definition')
        .map((n) => n.textContent),
    ).toEqual([STUDENT_ACCOUNT.fullName, STUDENT_ACCOUNT.username])
    expect(screen.getByRole('radiogroup', { name: 'Ngôn ngữ' })).toBeInTheDocument()
    expect(timeZone()).toHaveValue('Asia/Ho_Chi_Minh')
    expect(save()).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByRole('textbox', { name: 'Tên hiển thị' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Đổi mật khẩu' })).toHaveAttribute('href', '/change-password')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    await waitFor(() => expect(document.title).toBe('Tài khoản · Eng-LMS'))
    await expectNoAxeViolations(container)
  })

  it('while loading: a busy skeleton of the block; the form works meanwhile', async () => {
    studentSession()
    server.use(
      http.get('*/api/v1/student/account', async () => {
        await delay('infinite')
        return HttpResponse.json(STUDENT_ACCOUNT)
      }),
    )
    await openPage()
    const busy = screen.getByRole('status', { name: 'Đang tải thông tin tài khoản' })
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(within(busy).getAllByTestId('skeleton')).toHaveLength(2)
    expect(timeZone()).toBeEnabled()
  })

  it('a failed read: the alert with Retry in the block, the rest usable; Retry recovers and focus goes to the block', async () => {
    const sent = studentSession()
    let fail = true
    server.use(
      http.get('*/api/v1/student/account', () =>
        fail ? problem(500, 'INTERNAL_ERROR') : HttpResponse.json(STUDENT_ACCOUNT),
      ),
    )
    const { container } = await openPage()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Không tải được thông tin tài khoản.')
    await expectNoAxeViolations(container)
    // The rest of the page works.
    await chooseBangkok()
    await userEvent.click(save())
    await waitFor(() => expect(sent).toEqual([{ timeZone: 'Asia/Bangkok' }]))
    // A second failure keeps the alert and the focus on Retry.
    const retry = within(alert).getByRole('button', { name: 'Thử lại' })
    await userEvent.click(retry)
    await waitFor(() => expect(retry).not.toHaveAttribute('data-pending'))
    expect(retry).toHaveFocus()
    fail = false
    await userEvent.click(retry)
    await screen.findByText(STUDENT_ACCOUNT.fullName)
    const block = screen.getByText(STUDENT_ACCOUNT.fullName).closest<HTMLElement>('[tabindex="-1"]')!
    await waitFor(() => expect(block).toHaveFocus())
    expect(document.activeElement).not.toBe(document.body)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('T-M2.7 AC6: the Time zone form for a student', () => {
  it('saves only the changed time zone, toasts "Đã lưu", keeps focus on Save and disables it again', async () => {
    const sent = studentSession()
    await openPage()
    await chooseBangkok()
    expect(save()).not.toHaveAttribute('aria-disabled')
    await userEvent.click(save())
    await waitFor(() => expect(sent).toEqual([{ timeZone: 'Asia/Bangkok' }]))
    expect(await screen.findByText('Đã lưu')).toBeInTheDocument()
    await waitFor(() => expect(save()).toHaveAttribute('aria-disabled', 'true'))
    expect(save()).toHaveFocus()
  })

  it('a 422 shows the summary with focus and the field error', async () => {
    studentSession()
    server.use(
      http.patch('*/api/v1/auth/preferences', () =>
        problem(422, 'VALIDATION_FAILED', 'req-1', { errors: [{ field: 'timeZone', code: 'INVALID_VALUE' }] }),
      ),
    )
    const { container } = await openPage()
    await chooseBangkok()
    await userEvent.click(save())
    const summary = await screen.findByRole('alert', { name: 'Chưa lưu được cài đặt' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(within(summary).getByRole('link', { name: 'Hãy chọn một múi giờ trong danh sách.' })).toHaveAttribute(
      'href',
      '#account-time-zone',
    )
    expect(timeZone()).toHaveAttribute('aria-invalid', 'true')
    await expectNoAxeViolations(container)
  })

  it('a failed save shows an InlineAlert with Try again, never a toast; Try again saves', async () => {
    const sent = studentSession()
    server.use(http.patch('*/api/v1/auth/preferences', () => problem(500, 'INTERNAL_ERROR'), { once: true }))
    await openPage()
    await chooseBangkok()
    await userEvent.click(save())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Chưa lưu được cài đặt. Hãy thử lại.')
    expect(screen.queryByText('Đã lưu')).not.toBeInTheDocument()
    await userEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }))
    await screen.findByText('Đã lưu')
    expect(sent).toEqual([{ timeZone: 'Asia/Bangkok' }])
  })

  it('leaving with an unsaved change asks first', async () => {
    studentSession()
    const { router } = await openPage()
    await chooseBangkok()
    void router.navigate('/student/home')
    expect(await screen.findByRole('alertdialog', { name: 'Bỏ các thay đổi?' })).toBeInTheDocument()
  })

  it('Change password opens /change-password', async () => {
    studentSession()
    const { router } = await openPage()
    await userEvent.click(screen.getByRole('link', { name: 'Đổi mật khẩu' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/change-password'))
  })
})
