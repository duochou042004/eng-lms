import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { AUTH_CHANNEL } from '../../auth/api/authChannel'
import { expectNoAxeViolations } from '../../../test/axe'
import { renderRoute } from '../../../test/render'
import { problem, server, sessionAs } from '../../../test/server'
import { openAccountMenu } from '../../../test/shell'
import { page, SID, workspaceApi } from '../../../test/students'

// T-M2.14 AC1 (edit and save only the changed fields), AC2 (validation, 422, 500, double submit), AC3 (username), AC4
// (conflict), AC8 (the unsaved changes guard of the profile form), AC10 (axe). Typing makes these slow: 20 s timeouts.

const h1 = (name: string) => screen.findByRole('heading', { level: 1, name })
const editButton = () => screen.getByRole('button', { name: 'Sửa hồ sơ' })
const field = (name: string) => screen.getByRole('textbox', { name })
const saveButton = () => screen.getByRole('button', { name: /^(Lưu|Đang lưu…)$/ })
const path = (router: { state: { location: { pathname: string } } }) => router.state.location.pathname

async function openEdit(initial: Record<string, unknown> = {}, options?: Parameters<typeof workspaceApi>[1]) {
  const api = workspaceApi(initial, options)
  const result = renderRoute(`/tutor/students/${SID}`)
  await h1('Nguyễn Văn An')
  await userEvent.click(editButton())
  await screen.findByRole('form', { name: 'Sửa hồ sơ' })
  return { api, ...result }
}

describe('Edit profile: open and save (AC1)', { timeout: 20_000 }, () => {
  it('opens the form with the saved values; the header keeps them; Added on stays read-only; first field focused', async () => {
    const { container } = await openEdit()
    const form = screen.getByRole('form', { name: 'Sửa hồ sơ' })
    await waitFor(() => expect(field('Họ tên (bắt buộc)')).toHaveFocus())
    expect(field('Họ tên (bắt buộc)')).toHaveValue('Nguyễn Văn An')
    expect(field('Tên đăng nhập (bắt buộc)')).toHaveValue('nguyenvanan')
    expect(field('Email')).toHaveValue('an@example.com')
    expect(field('Điện thoại')).toHaveValue('0901 234 567')
    expect(field('Tên kênh (bắt buộc)')).toHaveValue('Zalo')
    expect(field('Ghi chú')).toHaveValue('Dòng một\nDòng hai')
    // Expanded: no disclosure in edit mode.
    expect(within(form).queryByRole('button', { expanded: false })).not.toBeInTheDocument()
    expect(
      within(form)
        .getAllByRole('term')
        .map((t) => t.textContent),
    ).toEqual(['Ngày thêm'])
    // AC12 (e): "Other contacts" is an h4 under the Contacts h3, without the fieldset legend's padding.
    expect(within(form).getByRole('heading', { level: 3, name: 'Liên hệ' })).toBeInTheDocument()
    const handlesTitle = within(form).getByRole('heading', { level: 4, name: 'Liên hệ khác' })
    expect(handlesTitle).toHaveClass('subSubTitle')
    expect(handlesTitle).not.toHaveClass('legend')
    expect(screen.queryByRole('button', { name: 'Sửa hồ sơ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Liên hệ' })).not.toBeInTheDocument()
    await userEvent.clear(field('Họ tên (bắt buộc)'))
    await userEvent.type(field('Họ tên (bắt buộc)'), 'Tên Mới')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nguyễn Văn An')
    expect(
      screen.getByText('Học viên đăng nhập bằng tên đăng nhập mới. Các thiết bị đang đăng nhập vẫn giữ nguyên phiên.'),
    ).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('sends version, email and contactHandles only; then shows the new values, focuses Edit profile, toasts, invalidates the list', async () => {
    const { api, queryClient } = await openEdit()
    queryClient.setQueryData(['students', 'list', { page: 0 }], page([]))
    await userEvent.clear(field('Email'))
    await userEvent.type(field('Email'), 'moi@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm liên hệ' }))
    const rows = screen.getAllByRole('group')
    await userEvent.type(within(rows[1]!).getByRole('textbox', { name: 'Tên kênh (bắt buộc)' }), 'Facebook')
    await userEvent.type(within(rows[1]!).getByRole('textbox', { name: 'Đường dẫn hoặc ID' }), 'an.fb')
    await userEvent.click(saveButton())
    await waitFor(() => expect(editButton()).toHaveFocus())
    expect(api.calls.patch).toEqual([
      {
        version: 0,
        email: 'moi@example.com',
        contactHandles: [
          { label: 'Zalo', value: 'https://zalo.me/0901234567' },
          { label: 'Facebook', value: 'an.fb' },
        ],
      },
    ])
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    const contacts = screen.getByRole('region', { name: 'Liên hệ' })
    expect(within(contacts).getByText('moi@example.com')).toBeInTheDocument()
    expect(within(contacts).getByText('an.fb')).toBeInTheDocument()
    expect(within(await screen.findByRole('region', { name: 'Thông báo' })).getByRole('status')).toHaveTextContent(
      'Đã lưu hồ sơ',
    )
    expect(queryClient.getQueryState(['students', 'list', { page: 0 }])?.isInvalidated).toBe(true)
  })

  it('an emptied phone is sent as null; a later status change uses the new version', async () => {
    const { api } = await openEdit()
    await userEvent.clear(field('Điện thoại'))
    await userEvent.click(saveButton())
    await waitFor(() => expect(editButton()).toHaveFocus())
    expect(api.calls.patch).toEqual([{ version: 0, phone: null }])
    expect(within(screen.getByRole('region', { name: 'Liên hệ' })).getAllByText('Chưa có')).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: 'Tạm nghỉ' }))
    await waitFor(() => expect(api.calls.status).toEqual([{ status: 'PAUSED', version: 1 }]))
  })

  it('an unchanged form sends no request and closes', async () => {
    const { api } = await openEdit()
    await userEvent.type(field('Email'), ' ')
    await userEvent.click(saveButton())
    await waitFor(() => expect(editButton()).toHaveFocus())
    expect(api.calls.patch).toEqual([])
    expect(screen.queryByRole('region', { name: 'Thông báo' })).not.toBeInTheDocument()
  })
})

describe('Edit profile: errors (AC2)', { timeout: 20_000 }, () => {
  it('client checks as in the add form: the summary lists them and takes focus', async () => {
    const { container, api } = await openEdit()
    await userEvent.clear(field('Họ tên (bắt buộc)'))
    await userEvent.clear(field('Tên đăng nhập (bắt buộc)'))
    await userEvent.clear(field('Email'))
    await userEvent.type(field('Email'), 'khong-hop-le')
    await userEvent.click(saveButton())
    const summary = screen.getByRole('alert', { name: 'Chưa lưu được hồ sơ' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(
      within(summary)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Hãy nhập họ tên học viên.', 'Hãy nhập tên đăng nhập.', 'Hãy nhập địa chỉ email dạng ten@vidu.com.'])
    expect(api.calls.patch).toEqual([])
    await expectNoAxeViolations(container)
  })

  it('at most 30 contact rows', async () => {
    const handles = Array.from({ length: 29 }, (_, i) => ({ label: `Kênh ${i + 1}`, value: `id${i + 1}` }))
    await openEdit({ contactHandles: handles })
    const add = screen.getByRole('button', { name: 'Thêm liên hệ' })
    await userEvent.click(add)
    expect(add).toBeDisabled()
    expect(screen.getByText('Bạn có thể thêm tối đa 30 liên hệ.')).toBeInTheDocument()
  })

  it('a 422 maps to its field (contactHandles[1].value → that row); an unknown one goes to the summary, which takes focus', async () => {
    await openEdit({
      contactHandles: [
        { label: 'Zalo', value: 'a' },
        { label: 'Facebook', value: 'b' },
      ],
    })
    server.use(
      http.patch('*/api/v1/tutor/students/:sid', () =>
        problem(422, 'VALIDATION_FAILED', 'req-422', {
          errors: [
            { field: 'contactHandles[1].value', code: 'TOO_LONG' },
            { field: 'somethingElse', code: 'INVALID_VALUE' },
          ],
        }),
      ),
    )
    await userEvent.type(field('Ghi chú'), '!')
    await userEvent.click(saveButton())
    const summary = screen.getByRole('alert', { name: 'Chưa lưu được hồ sơ' })
    await waitFor(() => expect(summary).toHaveFocus())
    const second = screen.getAllByRole('group')[1]!
    expect(within(second).getByRole('textbox', { name: 'Đường dẫn hoặc ID' })).toHaveAttribute('aria-invalid', 'true')
    expect(summary).toHaveTextContent('Máy chủ không chấp nhận một giá trị. Kiểm tra lại biểu mẫu rồi thử lại.')
  })

  it('a 409 USERNAME_TAKEN shows on Username with focus', async () => {
    await openEdit()
    server.use(
      http.patch('*/api/v1/tutor/students/:sid', () =>
        problem(409, 'USERNAME_TAKEN', 'req-409', { errors: [{ field: 'username', code: 'USERNAME_TAKEN' }] }),
      ),
    )
    await userEvent.clear(field('Tên đăng nhập (bắt buộc)'))
    await userEvent.type(field('Tên đăng nhập (bắt buộc)'), 'an.moi')
    await userEvent.click(saveButton())
    await waitFor(() => expect(field('Tên đăng nhập (bắt buộc)')).toHaveFocus())
    expect(field('Tên đăng nhập (bắt buộc)')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Tên đăng nhập này đã có người dùng. Hãy chọn tên khác.')).toBeInTheDocument()
    expect(screen.queryByRole('alert', { name: 'Chưa lưu được hồ sơ' })).not.toBeInTheDocument()
  })

  it('a 500 shows the alert above the actions and keeps every input; a network failure too', async () => {
    await openEdit()
    server.use(http.patch('*/api/v1/tutor/students/:sid', () => problem(500, 'INTERNAL_ERROR')))
    await userEvent.clear(field('Email'))
    await userEvent.type(field('Email'), 'moi@example.com')
    await userEvent.click(saveButton())
    expect(
      await screen.findByText('Không lưu được hồ sơ. Thông tin bạn nhập vẫn còn: hãy thử lại.'),
    ).toBeInTheDocument()
    expect(field('Email')).toHaveValue('moi@example.com')
    server.use(http.patch('*/api/v1/tutor/students/:sid', () => HttpResponse.error()))
    await userEvent.click(saveButton())
    expect(
      await screen.findByText('Không kết nối được máy chủ. Thông tin bạn nhập vẫn còn: kiểm tra kết nối rồi thử lại.'),
    ).toBeInTheDocument()
    expect(field('Email')).toHaveValue('moi@example.com')
  })

  it('Save is pending while sending and a double click sends one request', async () => {
    const { api } = await openEdit()
    let release = () => {}
    server.use(
      http.patch('*/api/v1/tutor/students/:sid', async ({ request }) => {
        api.calls.patch.push((await request.json()) as Record<string, unknown>)
        await new Promise<void>((resolve) => (release = resolve))
        return HttpResponse.json({ ...api.current, email: 'moi@example.com', version: 1 })
      }),
    )
    await userEvent.clear(field('Email'))
    await userEvent.type(field('Email'), 'moi@example.com')
    await userEvent.dblClick(saveButton())
    await waitFor(() => expect(saveButton()).toHaveTextContent('Đang lưu…'))
    expect(saveButton()).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(saveButton())
    release()
    await waitFor(() => expect(editButton()).toHaveFocus())
    expect(api.calls.patch).toHaveLength(1)
  })

  it('a 404 on save shows the not-found view', async () => {
    await openEdit()
    server.use(http.patch('*/api/v1/tutor/students/:sid', () => problem(404, 'NOT_FOUND')))
    await userEvent.type(field('Ghi chú'), '!')
    await userEvent.click(saveButton())
    await h1('Không tìm thấy học viên')
  })
})

describe('Edit profile: username (AC3)', { timeout: 20_000 }, () => {
  it("checks a changed username (Taken for another student's) and never the student's own", async () => {
    const { api } = await openEdit()
    const username = field('Tên đăng nhập (bắt buộc)')
    await userEvent.clear(username)
    await userEvent.type(username, 'tranbinh')
    expect(await screen.findByText('Đã có người dùng')).toBeInTheDocument()
    await userEvent.clear(username)
    await userEvent.type(username, 'nguyenvanan')
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(screen.queryByText('Có thể dùng')).not.toBeInTheDocument()
    expect(screen.queryByText('Đã có người dùng')).not.toBeInTheDocument()
    expect(api.calls.availability).not.toContain('nguyenvanan')
    await userEvent.clear(username)
    await userEvent.type(username, 'an.moi')
    expect(await screen.findByText('Có thể dùng')).toBeInTheDocument()
    await userEvent.click(saveButton())
    await waitFor(() => expect(editButton()).toHaveFocus())
    expect(api.calls.patch).toEqual([{ version: 0, username: 'an.moi' }])
    expect(screen.getByRole('heading', { level: 1 }).closest('header')).toHaveTextContent('@an.moi')
  })
})

describe('Edit profile: conflict (AC4)', { timeout: 20_000 }, () => {
  it('a stale save opens "This was changed elsewhere": Cancel keeps the input, Copy my note copies, Reload shows the other tab', async () => {
    const { api } = await openEdit()
    api.changeElsewhere({ email: 'tab.khac@example.com' })
    await userEvent.clear(field('Ghi chú'))
    await userEvent.type(field('Ghi chú'), 'Ghi chú của tôi')
    await userEvent.click(saveButton())
    const dialog = await screen.findByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })
    expect(dialog).toHaveTextContent(
      'Học viên này vừa được thay đổi ở một tab hoặc cửa sổ khác. Tải lại để xem bản mới nhất; những thay đổi chưa lưu của bạn sẽ mất.',
    )
    await expectNoAxeViolations(document.body)
    const user = userEvent.setup()
    const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    await user.click(within(dialog).getByRole('button', { name: 'Sao chép ghi chú của tôi' }))
    expect(write).toHaveBeenCalledWith('Ghi chú của tôi')
    await user.click(within(dialog).getByRole('button', { name: 'Huỷ' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(field('Ghi chú')).toHaveValue('Ghi chú của tôi')
    await user.click(saveButton())
    await user.click(
      within(await screen.findByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })).getByRole('button', {
        name: 'Tải lại',
      }),
    )
    await waitFor(() => expect(screen.queryByRole('form')).not.toBeInTheDocument())
    expect(
      within(screen.getByRole('region', { name: 'Liên hệ' })).getByText('tab.khac@example.com'),
    ).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Ghi chú' })).getByText(/Dòng một/)).toBeInTheDocument()
  })

  it('without a note change the dialog has no Copy my note', async () => {
    const { api } = await openEdit()
    api.changeElsewhere({ phone: '0999 999 999' })
    await userEvent.type(field('Email'), 'x')
    await userEvent.click(saveButton())
    const dialog = await screen.findByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })
    expect(within(dialog).queryByRole('button', { name: 'Sao chép ghi chú của tôi' })).not.toBeInTheDocument()
  })
})

describe('Edit profile: the unsaved changes guard (AC8)', { timeout: 20_000 }, () => {
  const nav = (name: string) =>
    within(screen.getByRole('navigation', { name: 'Điều hướng gia sư' })).getByRole('link', { name })

  it('the shell nav and the home link ask "Discard your changes?"; Keep editing stays, Discard leaves', async () => {
    const { router } = await openEdit()
    await userEvent.type(field('Email'), 'x')
    await userEvent.click(nav('Hôm nay'))
    const dialog = await screen.findByRole('alertdialog', { name: 'Bỏ các thay đổi?' })
    await expectNoAxeViolations(document.body)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tiếp tục sửa' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(path(router)).toBe(`/tutor/students/${SID}`)
    expect(field('Email')).toHaveValue('an@example.comx')
    await userEvent.click(screen.getByRole('link', { name: 'Lớp cô Lan' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Bỏ thay đổi' }))
    await waitFor(() => expect(path(router)).toBe('/tutor/today'))
  })

  it('"Change password" asks too', async () => {
    const { router } = await openEdit()
    await userEvent.type(field('Email'), 'x')
    await openAccountMenu()
    await userEvent.click(screen.getByRole('link', { name: 'Đổi mật khẩu' }))
    expect(await screen.findByRole('alertdialog', { name: 'Bỏ các thay đổi?' })).toBeInTheDocument()
    expect(path(router)).toBe(`/tutor/students/${SID}`)
  })

  it('Cancel of a dirty form asks: Keep editing stays, Discard closes the form; a clean Cancel closes at once', async () => {
    await openEdit()
    await userEvent.type(field('Email'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Bỏ các thay đổi?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tiếp tục sửa' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(field('Email')).toHaveValue('an@example.comx')
    await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Bỏ thay đổi' }))
    await waitFor(() => expect(editButton()).toHaveFocus())
    expect(within(screen.getByRole('region', { name: 'Liên hệ' })).getByText('an@example.com')).toBeInTheDocument()
    await userEvent.click(editButton())
    await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))
    await waitFor(() => expect(editButton()).toHaveFocus())
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('a clean form leaves without asking', async () => {
    const { router } = await openEdit()
    await userEvent.click(nav('Hôm nay'))
    await waitFor(() => expect(path(router)).toBe('/tutor/today'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('own Log out and another tab’s sign-out pass a dirty form without a dialog', async () => {
    const { router } = await openEdit()
    await userEvent.type(field('Email'), 'x')
    await openAccountMenu()
    server.use(sessionAs(null))
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    await waitFor(() => expect(path(router)).toBe('/login'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it("another tab's sign-out passes a dirty form", async () => {
    const { router } = await openEdit()
    await userEvent.type(field('Email'), 'x')
    server.use(sessionAs(null))
    const other = new BroadcastChannel(AUTH_CHANNEL)
    other.postMessage({ type: 'signed-out' })
    await waitFor(() => expect(path(router)).toBe('/login'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    other.close()
  })

  it('a forced change of password (403 PASSWORD_CHANGE_REQUIRED) passes a dirty form without a dialog', async () => {
    const { router } = await openEdit()
    await userEvent.type(field('Email'), 'x')
    server.use(
      sessionAs('TUTOR', true),
      http.patch('*/api/v1/tutor/students/:sid', () => problem(403, 'PASSWORD_CHANGE_REQUIRED')),
    )
    await userEvent.click(saveButton())
    await waitFor(() => expect(path(router)).toBe('/change-password'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
