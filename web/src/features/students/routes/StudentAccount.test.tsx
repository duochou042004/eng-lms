import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { AUTH_CHANNEL } from '../../auth/api/authChannel'
import { expectNoAxeViolations } from '../../../test/axe'
import { renderRoute } from '../../../test/render'
import { problem, server, sessionAs } from '../../../test/server'
import { openAccountMenu } from '../../../test/shell'
import { RESET_CREDENTIALS, SID, workspaceApi } from '../../../test/students'

// T-M2.14 AC5 (status actions, archive + Undo), AC6 (reset password and the card), AC7 (credentials hygiene), AC9 (the
// toasts on this page, sign-out), AC10 (axe per status, the reset dialog, the card, a toast).

const h1 = (name: string) => screen.findByRole('heading', { level: 1, name })
const account = () => screen.getByRole('region', { name: 'Tài khoản' })
const actionNames = () =>
  within(account())
    .queryAllByRole('button')
    .map((b) => b.textContent)
const toastRegion = () => screen.queryByRole('region', { name: 'Thông báo' })
const toastTexts = () =>
  toastRegion()
    ? within(toastRegion()!)
        .getAllByRole('status')
        .map((s) => s.textContent)
    : []
const press = (name: string) => userEvent.click(within(account()).getByRole('button', { name }))
const path = (router: { state: { location: { pathname: string } } }) => router.state.location.pathname

async function openWorkspace(initial: Record<string, unknown> = {}) {
  const api = workspaceApi(initial)
  const result = renderRoute(`/tutor/students/${SID}`)
  await h1('Nguyễn Văn An')
  return { api, ...result }
}

describe('Account section: status (AC5)', { timeout: 20_000 }, () => {
  it.each([
    ['ACTIVE', ['Tạm nghỉ', 'Lưu trữ', 'Đặt lại mật khẩu'], 'Đang học'],
    ['PAUSED', ['Học lại', 'Lưu trữ', 'Đặt lại mật khẩu'], 'Tạm nghỉ'],
    ['ARCHIVED', ['Kích hoạt lại'], 'Đã lưu trữ'],
  ])('a %s student shows its actions in order (axe clean)', async (status, actions, badge) => {
    const { container } = await openWorkspace({ status })
    expect(screen.getByRole('heading', { level: 2, name: 'Tài khoản' })).toBeInTheDocument()
    expect(actionNames()).toEqual(actions)
    expect(within(account()).getByRole('term')).toHaveTextContent('Trạng thái')
    expect(within(account()).getByRole('definition')).toHaveTextContent(badge)
    if (status === 'ARCHIVED')
      expect(within(account()).getByText('Kích hoạt lại học viên để đặt lại mật khẩu.')).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('Pause → PAUSED (badges, toast, focus on Resume) and Resume back, each with the latest version', async () => {
    const { api } = await openWorkspace()
    await press('Tạm nghỉ')
    await waitFor(() => expect(within(account()).getByRole('button', { name: 'Học lại' })).toHaveFocus())
    expect(screen.getByRole('heading', { level: 1 }).closest('header')).toHaveTextContent('Tạm nghỉ')
    expect(within(account()).getByRole('definition')).toHaveTextContent('Tạm nghỉ')
    expect(toastTexts()).toEqual(['Nguyễn Văn An đã tạm nghỉ'])
    await expectNoAxeViolations(document.body)
    await press('Học lại')
    await waitFor(() => expect(within(account()).getByRole('definition')).toHaveTextContent('Đang học'))
    expect(api.calls.status).toEqual([
      { status: 'PAUSED', version: 0 },
      { status: 'ACTIVE', version: 1 },
    ])
    expect(toastTexts()).toEqual(['Nguyễn Văn An đã tạm nghỉ', 'Nguyễn Văn An đã học lại'])
  })

  it('Archive → ARCHIVED with a persistent toast and Undo; Undo from ACTIVE is one request', async () => {
    const { api } = await openWorkspace()
    await press('Lưu trữ')
    await waitFor(() => expect(within(account()).getByRole('button', { name: 'Kích hoạt lại' })).toHaveFocus())
    expect(toastTexts()).toEqual(['Đã lưu trữ Nguyễn Văn An. Học viên không đăng nhập được nữa.'])
    await userEvent.click(within(toastRegion()!).getByRole('button', { name: 'Hoàn tác' }))
    await waitFor(() => expect(within(account()).getByRole('definition')).toHaveTextContent('Đang học'))
    expect(api.calls.status).toEqual([
      { status: 'ARCHIVED', version: 0 },
      { status: 'ACTIVE', version: 1 },
    ])
    expect(toastTexts()).toEqual(['Đã hoàn tác lưu trữ'])
  })

  it('Undo from PAUSED restores Paused: two requests in order, each with the latest version', async () => {
    const { api } = await openWorkspace({ status: 'PAUSED', version: 4 })
    await press('Lưu trữ')
    await userEvent.click(
      within(await screen.findByRole('region', { name: 'Thông báo' })).getByRole('button', { name: 'Hoàn tác' }),
    )
    await waitFor(() => expect(within(account()).getByRole('definition')).toHaveTextContent('Tạm nghỉ'))
    expect(api.calls.status).toEqual([
      { status: 'ARCHIVED', version: 4 },
      { status: 'ACTIVE', version: 5 },
      { status: 'PAUSED', version: 6 },
    ])
  })

  it('keyboard: F6 reaches the region, Tab to Undo, Enter; afterwards focus is on the Account heading (Reactivate is gone)', async () => {
    await openWorkspace()
    await press('Lưu trữ')
    const reactivate = within(account()).getByRole('button', { name: 'Kích hoạt lại' })
    await waitFor(() => expect(reactivate).toHaveFocus())
    await userEvent.keyboard('{F6}')
    await waitFor(() => expect(toastRegion()!.contains(document.activeElement)).toBe(true))
    const undo = within(toastRegion()!).getByRole('button', { name: 'Hoàn tác' })
    for (let i = 0; i < 4 && document.activeElement !== undo; i++) await userEvent.tab()
    expect(undo).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(within(account()).getByRole('definition')).toHaveTextContent('Đang học'))
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Tài khoản' })).toHaveFocus())
  })

  it('an Undo after another tab changed the student shows "Couldn\'t undo" with the refetched status, no conflict dialog', async () => {
    const { api } = await openWorkspace()
    await press('Lưu trữ')
    await within(account()).findByRole('button', { name: 'Kích hoạt lại' })
    api.changeElsewhere({ status: 'ACTIVE' })
    await userEvent.click(within(toastRegion()!).getByRole('button', { name: 'Hoàn tác' }))
    const alert = await within(account()).findByRole('alert')
    expect(alert).toHaveTextContent('Không hoàn tác được. Hãy dùng Kích hoạt lại.')
    await waitFor(() => expect(within(account()).getByRole('definition')).toHaveTextContent('Đang học'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('a failing second Undo request shows "Couldn\'t restore Paused"', async () => {
    const { api } = await openWorkspace({ status: 'PAUSED' })
    await press('Lưu trữ')
    await within(account()).findByRole('button', { name: 'Kích hoạt lại' })
    server.use(
      http.post('*/api/v1/tutor/students/:sid/status', async ({ request }) => {
        const body = (await request.json()) as { status: string; version: number }
        api.calls.status.push(body)
        if (body.status === 'PAUSED') return problem(500, 'INTERNAL_ERROR')
        api.changeElsewhere({ status: 'ACTIVE' })
        return HttpResponse.json(api.current)
      }),
    )
    await userEvent.click(within(toastRegion()!).getByRole('button', { name: 'Hoàn tác' }))
    expect(await within(account()).findByRole('alert')).toHaveTextContent(
      'Không khôi phục được trạng thái Tạm nghỉ. Học viên đang ở trạng thái Đang học.',
    )
    expect(within(account()).getByRole('definition')).toHaveTextContent('Đang học')
  })

  it('Reactivate closes the open archive toast; leaving the page removes it too', async () => {
    const { router } = await openWorkspace()
    await press('Lưu trữ')
    await within(account()).findByRole('button', { name: 'Kích hoạt lại' })
    await press('Kích hoạt lại')
    await waitFor(() => expect(toastTexts()).toEqual(['Đã kích hoạt lại Nguyễn Văn An']))
    await press('Lưu trữ')
    await waitFor(() => expect(toastTexts()).toHaveLength(2))
    await act(() => router.navigate('/tutor/students'))
    await h1('Học viên')
    expect(toastTexts()).toEqual(['Đã kích hoạt lại Nguyễn Văn An'])
  })

  it('while the profile form is open the actions are disabled with the hint; while a status request runs, everything is', async () => {
    await openWorkspace()
    await userEvent.click(screen.getByRole('button', { name: 'Sửa hồ sơ' }))
    expect(within(account()).getByText('Hãy lưu hoặc huỷ thay đổi trước.')).toBeInTheDocument()
    for (const button of within(account()).getAllByRole('button')) expect(button).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))
    let release = () => {}
    server.use(
      http.post('*/api/v1/tutor/students/:sid/status', async () => {
        await new Promise<void>((resolve) => (release = resolve))
        return HttpResponse.json({
          ...(await import('../../../test/students')).student(),
          status: 'PAUSED',
          version: 1,
        })
      }),
    )
    await press('Tạm nghỉ')
    await waitFor(() =>
      expect(within(account()).getByRole('button', { name: 'Tạm nghỉ' })).toHaveAttribute('aria-disabled', 'true'),
    )
    expect(within(account()).getByRole('button', { name: 'Lưu trữ' })).toBeDisabled()
    expect(within(account()).getByRole('button', { name: 'Đặt lại mật khẩu' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sửa hồ sơ' })).toBeDisabled()
    release()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sửa hồ sơ' })).toBeEnabled())
  })

  it('a stale status change opens the conflict dialog; Reload shows the latest status', async () => {
    const { api } = await openWorkspace()
    api.changeElsewhere({ status: 'PAUSED' })
    await press('Lưu trữ')
    const dialog = await screen.findByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tải lại' }))
    await waitFor(() => expect(within(account()).getByRole('definition')).toHaveTextContent('Tạm nghỉ'))
    expect(toastRegion()).not.toBeInTheDocument()
  })

  it('INVALID_STATE_TRANSITION refetches and says the status changed; a network error says so; never a toast', async () => {
    const { api } = await openWorkspace()
    server.use(
      http.post('*/api/v1/tutor/students/:sid/status', () => {
        api.changeElsewhere({ status: 'ARCHIVED' })
        return problem(409, 'INVALID_STATE_TRANSITION')
      }),
    )
    await press('Tạm nghỉ')
    expect(await within(account()).findByRole('alert')).toHaveTextContent(
      'Trạng thái của học viên này đã thay đổi. Hãy kiểm tra rồi thử lại.',
    )
    await waitFor(() => expect(actionNames()).toEqual(['Kích hoạt lại']))
    server.use(http.post('*/api/v1/tutor/students/:sid/status', () => HttpResponse.error()))
    await press('Kích hoạt lại')
    await waitFor(() =>
      expect(within(account()).getByRole('alert')).toHaveTextContent('Không kích hoạt lại được học viên. Hãy thử lại.'),
    )
    expect(within(account()).getByRole('definition')).toHaveTextContent('Đã lưu trữ')
    expect(toastRegion()).not.toBeInTheDocument()
    await expectNoAxeViolations(document.body)
    // A later success clears the alert.
    server.use(
      http.post('*/api/v1/tutor/students/:sid/status', () => {
        api.changeElsewhere({ status: 'ACTIVE' })
        return HttpResponse.json(api.current)
      }),
    )
    await press('Kích hoạt lại')
    await waitFor(() => expect(within(account()).queryByRole('alert')).not.toBeInTheDocument())
  })

  it('a 404 on a status change shows the not-found view', async () => {
    await openWorkspace()
    server.use(http.post('*/api/v1/tutor/students/:sid/status', () => problem(404, 'NOT_FOUND')))
    await press('Tạm nghỉ')
    await h1('Không tìm thấy học viên')
  })

  it('a sign-out (own or another tab’s) leaves no toast', async () => {
    const { router } = await openWorkspace()
    await press('Lưu trữ')
    await waitFor(() => expect(toastTexts()).toHaveLength(1))
    server.use(sessionAs(null))
    const other = new BroadcastChannel(AUTH_CHANNEL)
    other.postMessage({ type: 'signed-out' })
    await waitFor(() => expect(path(router)).toBe('/login'))
    await waitFor(() => expect(toastRegion()).not.toBeInTheDocument())
    other.close()
  })

  it('own Log out leaves no toast', async () => {
    const { router } = await openWorkspace()
    await press('Tạm nghỉ')
    await waitFor(() => expect(toastTexts()).toHaveLength(1))
    await openAccountMenu()
    server.use(sessionAs(null))
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    await waitFor(() => expect(path(router)).toBe('/login'))
    await waitFor(() => expect(toastRegion()).not.toBeInTheDocument())
  })
})

describe('Account section: reset password (AC6, AC7)', { timeout: 20_000 }, () => {
  const resetDialog = () => screen.findByRole('alertdialog', { name: 'Đặt lại mật khẩu cho Nguyễn Văn An?' })

  it('asks first, naming the student and the consequences; Cancel sends nothing', async () => {
    const { api } = await openWorkspace()
    await press('Đặt lại mật khẩu')
    const dialog = await resetDialog()
    expect(dialog).toHaveTextContent('đăng xuất trên mọi thiết bị')
    expect(dialog).toHaveTextContent('hết hạn sau 7 ngày')
    expect(within(dialog).getByRole('button', { name: 'Đặt lại mật khẩu' })).toHaveClass('danger')
    await expectNoAxeViolations(document.body)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(api.calls.reset).toBe(0)
  })

  it('Confirm shows the card in place of the actions (focus on its h2); Copy message is the F2 message; Done returns focus', async () => {
    const { container, api } = await openWorkspace()
    await press('Đặt lại mật khẩu')
    await userEvent.click(within(await resetDialog()).getByRole('button', { name: 'Đặt lại mật khẩu' }))
    const heading = await screen.findByRole('heading', { level: 2, name: 'Mật khẩu tạm mới' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(api.calls.reset).toBe(1)
    const card = heading.closest('section')!
    expect(card).toHaveTextContent('Gửi cho Nguyễn Văn An thông tin đăng nhập mới này.')
    expect(within(card).getByText(RESET_CREDENTIALS.temporaryPassword)).toBeInTheDocument()
    expect(card).toHaveTextContent(`${window.location.origin}/login`)
    expect(within(account()).queryByRole('button', { name: 'Tạm nghỉ' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sửa hồ sơ' })).toBeDisabled()
    await expectNoAxeViolations(container)
    const user = userEvent.setup()
    const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    await user.click(within(card).getByRole('button', { name: 'Sao chép tin nhắn' }))
    const message = write.mock.calls[0]![0]
    expect(message.split('\n')[0]).toBe('Xin chào,')
    for (const value of [
      'Lớp cô Lan',
      'nguyenvanan',
      RESET_CREDENTIALS.temporaryPassword,
      `${window.location.origin}/login`,
    ])
      expect(message).toContain(value)
    expect(message).toContain('Bạn sẽ tự đặt mật khẩu mới ở lần đăng nhập đầu tiên.')
    await user.click(within(card).getByRole('button', { name: 'Xong' }))
    await waitFor(() => expect(within(account()).getByRole('button', { name: 'Đặt lại mật khẩu' })).toHaveFocus())
    expect(screen.queryByText(RESET_CREDENTIALS.temporaryPassword)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sửa hồ sơ' })).toBeEnabled()
  })

  it('the temporary password is nowhere else: storage, history, URL, query cache, console; pagehide and leaving drop the card', async () => {
    const log = vi.spyOn(console, 'log')
    const info = vi.spyOn(console, 'info')
    const warn = vi.spyOn(console, 'warn')
    const error = vi.spyOn(console, 'error')
    const { router, queryClient } = await openWorkspace()
    await press('Đặt lại mật khẩu')
    await userEvent.click(within(await resetDialog()).getByRole('button', { name: 'Đặt lại mật khẩu' }))
    await screen.findByRole('heading', { level: 2, name: 'Mật khẩu tạm mới' })
    const secret = RESET_CREDENTIALS.temporaryPassword
    const kept = JSON.stringify([
      { ...localStorage },
      { ...sessionStorage },
      history.state,
      router.state.location,
      queryClient
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
      queryClient
        .getMutationCache()
        .getAll()
        .map((m) => [m.state.data, m.state.variables]),
    ])
    expect(kept).not.toContain(secret)
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0)
    act(() => void window.dispatchEvent(new Event('pagehide')))
    expect(screen.queryByText(secret)).not.toBeInTheDocument()
    expect(within(account()).getByRole('button', { name: 'Đặt lại mật khẩu' })).toBeInTheDocument()
    // Again, then leave and come back: no card.
    await press('Đặt lại mật khẩu')
    await userEvent.click(within(await resetDialog()).getByRole('button', { name: 'Đặt lại mật khẩu' }))
    await screen.findByRole('heading', { level: 2, name: 'Mật khẩu tạm mới' })
    await act(() => router.navigate('/tutor/students'))
    await h1('Học viên')
    await act(() => router.navigate(-1))
    await h1('Nguyễn Văn An')
    expect(screen.queryByRole('heading', { name: 'Mật khẩu tạm mới' })).not.toBeInTheDocument()
    expect(screen.queryByText(secret)).not.toBeInTheDocument()
    for (const spy of [log, info, warn, error]) expect(JSON.stringify(spy.mock.calls)).not.toContain(secret)
  })

  it('archived meanwhile (409): the dialog closes, the Account alert says so, no card', async () => {
    const { api } = await openWorkspace()
    server.use(
      http.post('*/api/v1/tutor/students/:sid/password-reset', () => {
        api.changeElsewhere({ status: 'ARCHIVED' })
        return problem(409, 'INVALID_STATE_TRANSITION')
      }),
    )
    await press('Đặt lại mật khẩu')
    await userEvent.click(within(await resetDialog()).getByRole('button', { name: 'Đặt lại mật khẩu' }))
    expect(await within(account()).findByRole('alert')).toHaveTextContent(
      'Học viên này đã được lưu trữ. Hãy kích hoạt lại trước.',
    )
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await waitFor(() => expect(actionNames()).toEqual(['Kích hoạt lại']))
    expect(screen.queryByRole('heading', { name: 'Mật khẩu tạm mới' })).not.toBeInTheDocument()
  })

  it('a 5xx keeps the dialog open with its alert; while pending Esc and Cancel do nothing', async () => {
    await openWorkspace()
    let release = () => {}
    server.use(
      http.post('*/api/v1/tutor/students/:sid/password-reset', async () => {
        await new Promise<void>((resolve) => (release = resolve))
        return problem(500, 'INTERNAL_ERROR')
      }),
    )
    await press('Đặt lại mật khẩu')
    const dialog = await resetDialog()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Đặt lại mật khẩu' }))
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Đang đặt lại…' })).toBeInTheDocument())
    await userEvent.keyboard('{Escape}')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    release()
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Không đặt lại được mật khẩu. Hãy thử lại.')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await expectNoAxeViolations(document.body)
  })
})
