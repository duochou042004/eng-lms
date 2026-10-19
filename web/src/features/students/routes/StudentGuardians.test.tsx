import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { AUTH_CHANNEL } from '../../auth/api/authChannel'
import { expectNoAxeViolations } from '../../../test/axe'
import { renderRoute } from '../../../test/render'
import { problem, server, sessionAs } from '../../../test/server'
import { openAccountMenu } from '../../../test/shell'
import { guardian, SID, workspaceApi } from '../../../test/students'

// T-M2.15 AC1 (the section and its states), AC2 (add, the limit, another tab's 10th), AC3 (edit, validation, errors,
// double submit), AC4 (conflict, removed elsewhere), AC5 (remove), AC6 (one form at a time, the guard), AC9 (axe).
// Typing makes these slow: 20 s timeouts.

const LAN = guardian(1, {
  name: 'Nguyễn Thị Lan',
  relationship: 'Mẹ',
  phone: '0912 345 678',
  email: 'lan@example.com',
  notes: 'Gọi sau 18h\nKhông nhắn tin',
})
const BA = guardian(2, { name: 'Trần Văn Ba', relationship: null, phone: null, email: null, notes: null })

const section = () => screen.getByRole('region', { name: 'Phụ huynh' })
const items = () => within(section()).queryAllByRole('listitem')
const names = () =>
  within(section())
    .queryAllByRole('heading', { level: 3 })
    .map((h) => h.textContent)
const addButton = () => within(section()).queryByRole('button', { name: 'Thêm phụ huynh' })
const editOf = (name: string) => screen.getByRole('button', { name: `Sửa ${name}` })
const removeOf = (name: string) => screen.getByRole('button', { name: `Xoá ${name}` })
const form = () => screen.getByRole('form', { name: /^(Phụ huynh mới|Sửa phụ huynh .+)$/ })
const input = (name: string) => within(form()).getByRole('textbox', { name })
const save = () => within(form()).getByRole('button', { name: /^(Lưu|Đang lưu…)$/ })
const toastTexts = () => {
  const region = screen.queryByRole('region', { name: 'Thông báo' })
  return region
    ? within(region)
        .getAllByRole('status')
        .map((s) => s.textContent)
    : []
}
const dialogNamed = (name: string) => screen.queryByRole('alertdialog', { name })
const path = (router: { state: { location: { pathname: string } } }) => router.state.location.pathname

async function openWorkspace(guardians: Array<Record<string, unknown>> = [LAN, BA], initial = {}) {
  const api = workspaceApi(initial, { guardians })
  const result = renderRoute(`/tutor/students/${SID}`)
  await screen.findByRole('heading', { level: 1, name: 'Nguyễn Văn An' })
  if (guardians.length) await within(await screen.findByRole('region', { name: 'Phụ huynh' })).findAllByRole('listitem')
  else await screen.findByText('Chưa thêm phụ huynh nào.')
  return { api, ...result }
}

describe('Guardians: the section (AC1)', { timeout: 20_000 }, () => {
  it('sits between Note and Account and lists each guardian in order with links, line breaks and "Not added" (axe)', async () => {
    const { container } = await openWorkspace()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Thông tin cá nhân',
      'Liên hệ',
      'Ghi chú',
      'Phụ huynh',
      'Tài khoản',
    ])
    expect(names()).toEqual(['Nguyễn Thị Lan', 'Trần Văn Ba'])
    const [lan, ba] = items()
    expect(
      within(lan!)
        .getAllByRole('term')
        .map((t) => t.textContent),
    ).toEqual(['Quan hệ', 'Điện thoại', 'Email', 'Ghi chú'])
    expect(within(lan!).getByText('Mẹ')).toBeInTheDocument()
    expect(within(lan!).getByRole('link', { name: 'Gọi 0912 345 678' })).toHaveAttribute('href', 'tel:0912345678')
    expect(within(lan!).getByRole('link', { name: 'Gửi email tới lan@example.com' })).toHaveAttribute(
      'href',
      'mailto:lan@example.com',
    )
    const notes = within(lan!).getByText(/Gọi sau 18h/)
    expect(notes.textContent).toBe('Gọi sau 18h\nKhông nhắn tin')
    expect(notes).toHaveClass('note')
    expect(within(ba!).getAllByText('Chưa có')).toHaveLength(4)
    // Visible "Sửa" / "Xoá", names with the guardian's.
    expect(editOf('Nguyễn Thị Lan')).toHaveTextContent(/^Sửa$/)
    expect(removeOf('Trần Văn Ba')).toHaveTextContent(/^Xoá$/)
    expect(addButton()).toBeEnabled()
    await expectNoAxeViolations(container)
  })

  it('no guardians: "No guardians added." and Add guardian (axe)', async () => {
    const { container } = await openWorkspace([])
    expect(within(section()).queryByRole('list')).not.toBeInTheDocument()
    expect(within(section()).getByText('Chưa thêm phụ huynh nào.')).toBeInTheDocument()
    expect(addButton()).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('ten guardians: no Add guardian, the limit text instead (axe)', async () => {
    const { container } = await openWorkspace(Array.from({ length: 10 }, (_, i) => guardian(i + 1)))
    expect(items()).toHaveLength(10)
    expect(addButton()).not.toBeInTheDocument()
    expect(
      within(section()).getByText('Tối đa 10 phụ huynh. Hãy xoá bớt một người để thêm người khác.'),
    ).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('loading: a busy, labelled region inside the section, no Add guardian; the rest of the page works', async () => {
    workspaceApi({}, { guardians: [LAN] })
    let release = () => {}
    server.use(
      http.get('*/api/v1/tutor/students/:sid/guardians', async () => {
        await new Promise<void>((resolve) => (release = resolve))
        return HttpResponse.json([LAN])
      }),
    )
    renderRoute(`/tutor/students/${SID}`)
    await screen.findByRole('heading', { level: 1, name: 'Nguyễn Văn An' })
    const busy = within(section()).getByRole('status', { name: 'Đang tải danh sách phụ huynh' })
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(addButton()).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sửa hồ sơ' }))
    expect(await screen.findByRole('form', { name: 'Sửa hồ sơ' })).toBeInTheDocument()
    release()
    expect(await within(section()).findByRole('heading', { level: 3, name: 'Nguyễn Thị Lan' })).toBeInTheDocument()
  })

  it('error: the alert with Retry inside the section, no Add guardian; Retry loads; the rest of the page works', async () => {
    workspaceApi({}, { guardians: [LAN] })
    server.use(http.get('*/api/v1/tutor/students/:sid/guardians', () => problem(500, 'INTERNAL_ERROR')))
    const { container } = renderRoute(`/tutor/students/${SID}`)
    const alert = await within(await screen.findByRole('region', { name: 'Phụ huynh' })).findByRole('alert')
    expect(alert).toHaveTextContent('Không tải được danh sách phụ huynh.')
    expect(addButton()).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sửa hồ sơ' })).toBeEnabled()
    expect(
      within(screen.getByRole('region', { name: 'Tài khoản' })).getByRole('button', { name: 'Tạm nghỉ' }),
    ).toBeEnabled()
    await expectNoAxeViolations(container)
    server.use(http.get('*/api/v1/tutor/students/:sid/guardians', () => HttpResponse.json([LAN])))
    await userEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }))
    expect(await within(section()).findByRole('heading', { level: 3, name: 'Nguyễn Thị Lan' })).toBeInTheDocument()
    expect(addButton()).toBeInTheDocument()
    // AC11 (a): the pressed button is gone; focus is on the section heading, never on body.
    expect(screen.getByRole('heading', { level: 2, name: 'Phụ huynh' })).toHaveFocus()
  })

  it('a 404 on the guardians shows the not-found view', async () => {
    workspaceApi()
    server.use(http.get('*/api/v1/tutor/students/:sid/guardians', () => problem(404, 'NOT_FOUND')))
    renderRoute(`/tutor/students/${SID}`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy học viên' })).toBeInTheDocument()
  })
})

describe('Guardians: add (AC2)', { timeout: 20_000 }, () => {
  it('opens an empty labelled form after the list (Add hidden, focus on Name); a name only sends {name}; appended, toast, focus', async () => {
    const { api } = await openWorkspace()
    await userEvent.click(addButton()!)
    expect(form()).toHaveAccessibleName('Phụ huynh mới')
    await waitFor(() => expect(input('Tên (bắt buộc)')).toHaveFocus())
    expect(addButton()).not.toBeInTheDocument()
    // After the list.
    expect(within(section()).getByRole('list').compareDocumentPosition(form())).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    for (const name of ['Quan hệ', 'Điện thoại', 'Email', 'Ghi chú']) expect(input(name)).toHaveValue('')
    expect(screen.getByText('Ví dụ: mẹ, bố, vợ hoặc chồng')).toBeInTheDocument()
    await userEvent.type(input('Tên (bắt buộc)'), '  Lê Thị Cúc ')
    const gets = api.calls.guardianGets
    await userEvent.click(save())
    await waitFor(() => expect(editOf('Lê Thị Cúc')).toHaveFocus())
    expect(api.calls.guardianPost).toEqual([{ name: 'Lê Thị Cúc' }])
    expect(names()).toEqual(['Nguyễn Thị Lan', 'Trần Văn Ba', 'Lê Thị Cúc'])
    expect(api.calls.guardianGets).toBe(gets)
    expect(toastTexts()).toEqual(['Đã thêm phụ huynh'])
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(addButton()).toBeInTheDocument()
  })

  it('with all fields sends the trimmed five', async () => {
    const { api } = await openWorkspace([])
    await userEvent.click(addButton()!)
    await userEvent.type(input('Tên (bắt buộc)'), ' Lê Thị Cúc ')
    await userEvent.type(input('Quan hệ'), ' Bà ')
    await userEvent.type(input('Điện thoại'), ' 0912 000 111 ')
    await userEvent.type(input('Email'), ' cuc@example.com ')
    await userEvent.type(input('Ghi chú'), ' Dòng một{Enter}Dòng hai ')
    await userEvent.click(save())
    await waitFor(() => expect(editOf('Lê Thị Cúc')).toHaveFocus())
    expect(api.calls.guardianPost).toEqual([
      {
        name: 'Lê Thị Cúc',
        relationship: 'Bà',
        phone: '0912 000 111',
        email: 'cuc@example.com',
        notes: 'Dòng một\nDòng hai',
      },
    ])
    expect(screen.queryByText('Chưa thêm phụ huynh nào.')).not.toBeInTheDocument()
  })

  it("another tab's 10th: the alert takes focus, the list is refetched, the input stays, no summary", async () => {
    const nine = Array.from({ length: 9 }, (_, i) => guardian(i + 1))
    const { api, container } = await openWorkspace(nine)
    await userEvent.click(addButton()!)
    await userEvent.type(input('Tên (bắt buộc)'), 'Lê Thị Cúc')
    api.addGuardianElsewhere(guardian(50, { name: 'Tab khác' }))
    await userEvent.click(save())
    const alert = await within(form()).findByRole('alert')
    expect(alert).toHaveTextContent('Học viên này đã có 10 phụ huynh.')
    await waitFor(() => expect(alert.parentElement).toHaveFocus())
    await waitFor(() => expect(names()).toContain('Tab khác'))
    expect(input('Tên (bắt buộc)')).toHaveValue('Lê Thị Cúc')
    expect(screen.queryByRole('alert', { name: 'Chưa lưu được phụ huynh' })).not.toBeInTheDocument()
    await expectNoAxeViolations(container)
    // Cancel (dirty) → Discard: Add guardian is gone at 10, so focus goes to the heading.
    await userEvent.click(within(form()).getByRole('button', { name: 'Huỷ' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Bỏ thay đổi' }))
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Phụ huynh' })).toHaveFocus())
    expect(screen.getByText('Tối đa 10 phụ huynh. Hãy xoá bớt một người để thêm người khác.')).toBeInTheDocument()
  })

  it('a 404 on adding shows the not-found view', async () => {
    await openWorkspace()
    server.use(http.post('*/api/v1/tutor/students/:sid/guardians', () => problem(404, 'NOT_FOUND')))
    await userEvent.click(addButton()!)
    await userEvent.type(input('Tên (bắt buộc)'), 'Lê Thị Cúc')
    await userEvent.click(save())
    expect(await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy học viên' })).toBeInTheDocument()
  })
})

describe('Guardians: edit (AC3)', { timeout: 20_000 }, () => {
  it('opens in place with the saved values and focus on Name; phone changed + email cleared sends only those; toast, focus', async () => {
    const { api } = await openWorkspace()
    await userEvent.click(editOf('Nguyễn Thị Lan'))
    expect(form()).toHaveAccessibleName('Sửa phụ huynh Nguyễn Thị Lan')
    expect(items()[0]).toContainElement(form())
    await waitFor(() => expect(input('Tên (bắt buộc)')).toHaveFocus())
    expect(input('Tên (bắt buộc)')).toHaveValue('Nguyễn Thị Lan')
    expect(input('Quan hệ')).toHaveValue('Mẹ')
    expect(input('Điện thoại')).toHaveValue('0912 345 678')
    expect(input('Email')).toHaveValue('lan@example.com')
    expect(input('Ghi chú')).toHaveValue('Gọi sau 18h\nKhông nhắn tin')
    expect(screen.getByText('26 / 2.000')).toBeInTheDocument()
    await userEvent.clear(input('Điện thoại'))
    await userEvent.type(input('Điện thoại'), '0987 654 321')
    await userEvent.clear(input('Email'))
    await userEvent.click(save())
    await waitFor(() => expect(editOf('Nguyễn Thị Lan')).toHaveFocus())
    expect(api.calls.guardianPatch).toEqual([{ gid: LAN.id, body: { version: 0, phone: '0987 654 321', email: null } }])
    const lan = items()[0]!
    expect(within(lan).getByRole('link', { name: 'Gọi 0987 654 321' })).toBeInTheDocument()
    expect(within(lan).getAllByText('Chưa có')).toHaveLength(1)
    expect(toastTexts()).toEqual(['Đã lưu thông tin phụ huynh'])
    // The answer's version is the next one sent.
    await userEvent.click(editOf('Nguyễn Thị Lan'))
    await userEvent.type(input('Quan hệ'), ' ruột')
    await userEvent.click(save())
    await waitFor(() => expect(api.calls.guardianPatch[1]?.body).toEqual({ version: 1, relationship: 'Mẹ ruột' }))
  })

  it('an unchanged or whitespace-only change sends nothing and closes, focus on Edit', async () => {
    const { api } = await openWorkspace()
    await userEvent.click(editOf('Trần Văn Ba'))
    await userEvent.click(save())
    await waitFor(() => expect(editOf('Trần Văn Ba')).toHaveFocus())
    await userEvent.click(editOf('Trần Văn Ba'))
    await userEvent.type(input('Quan hệ'), '   ')
    await userEvent.type(input('Tên (bắt buộc)'), ' ')
    await userEvent.click(save())
    await waitFor(() => expect(editOf('Trần Văn Ba')).toHaveFocus())
    expect(api.calls.guardianPatch).toEqual([])
    expect(toastTexts()).toEqual([])
  })

  it('client checks: the summary lists each error and takes focus; no request (axe)', async () => {
    const { api, container } = await openWorkspace()
    await userEvent.click(editOf('Nguyễn Thị Lan'))
    await userEvent.clear(input('Tên (bắt buộc)'))
    await userEvent.type(input('Quan hệ'), 'x'.repeat(40))
    await userEvent.clear(input('Điện thoại'))
    await userEvent.type(input('Điện thoại'), '12')
    await userEvent.clear(input('Email'))
    await userEvent.type(input('Email'), 'khong-hop-le')
    await userEvent.click(save())
    const summary = screen.getByRole('alert', { name: 'Chưa lưu được phụ huynh' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(
      within(summary)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual([
      'Hãy nhập tên phụ huynh.',
      'Tối đa 40 ký tự.',
      'Hãy nhập 6 đến 20 ký tự: chữ số, dấu cách, +, (, ), . hoặc -.',
      'Hãy nhập địa chỉ email dạng ten@vidu.com.',
    ])
    expect(input('Tên (bắt buộc)')).toHaveAttribute('aria-invalid', 'true')
    expect(api.calls.guardianPatch).toEqual([])
    await expectNoAxeViolations(container)
  })

  it('name 120 and notes 2,000 pass; 121 and 2,001 are refused', async () => {
    const { api } = await openWorkspace([BA])
    await userEvent.click(editOf('Trần Văn Ba'))
    const user = userEvent.setup()
    await user.clear(input('Tên (bắt buộc)'))
    await user.click(input('Tên (bắt buộc)'))
    await user.paste('n'.repeat(121))
    await user.click(input('Ghi chú'))
    await user.paste('g'.repeat(2001))
    await user.click(save())
    const summary = screen.getByRole('alert', { name: 'Chưa lưu được phụ huynh' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(
      within(summary)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Tối đa 120 ký tự.', 'Tối đa 2000 ký tự.'])
    await user.type(input('Tên (bắt buộc)'), '{Backspace}')
    await user.type(input('Ghi chú'), '{Backspace}')
    await user.click(save())
    await waitFor(() => expect(api.calls.guardianPatch).toHaveLength(1))
    expect(api.calls.guardianPatch[0]!.body).toEqual({ version: 0, name: 'n'.repeat(120), notes: 'g'.repeat(2000) })
  })

  it('a 422 maps to its field, an unknown one to the summary, which takes focus', async () => {
    await openWorkspace()
    server.use(
      http.patch('*/api/v1/tutor/guardians/:gid', () =>
        problem(422, 'VALIDATION_FAILED', 'req-422', {
          errors: [
            { field: 'email', code: 'INVALID_FORMAT' },
            { field: 'somethingElse', code: 'INVALID_VALUE' },
          ],
        }),
      ),
    )
    await userEvent.click(editOf('Nguyễn Thị Lan'))
    await userEvent.type(input('Email'), 'm')
    await userEvent.click(save())
    const summary = screen.getByRole('alert', { name: 'Chưa lưu được phụ huynh' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(input('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(summary).toHaveTextContent('Giá trị này có ký tự hoặc định dạng không được phép.')
    expect(summary).toHaveTextContent('Máy chủ không chấp nhận một giá trị. Kiểm tra lại biểu mẫu rồi thử lại.')
  })

  it('a 500 keeps the input with the alert above Save; a network failure too', async () => {
    await openWorkspace()
    server.use(http.patch('*/api/v1/tutor/guardians/:gid', () => problem(500, 'INTERNAL_ERROR')))
    await userEvent.click(editOf('Nguyễn Thị Lan'))
    await userEvent.type(input('Quan hệ'), ' ruột')
    await userEvent.click(save())
    const alert = await within(form()).findByText('Không lưu được phụ huynh. Thông tin bạn nhập vẫn còn: hãy thử lại.')
    expect(alert.compareDocumentPosition(save())).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(input('Quan hệ')).toHaveValue('Mẹ ruột')
    server.use(http.patch('*/api/v1/tutor/guardians/:gid', () => HttpResponse.error()))
    await userEvent.click(save())
    expect(
      await within(form()).findByText(
        'Không kết nối được máy chủ. Thông tin bạn nhập vẫn còn: kiểm tra kết nối rồi thử lại.',
      ),
    ).toBeInTheDocument()
  })

  it('Save is pending while sending; a double click sends one request', async () => {
    const { api } = await openWorkspace()
    let release = () => {}
    server.use(
      http.patch('*/api/v1/tutor/guardians/:gid', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        api.calls.guardianPatch.push({ gid: LAN.id, body })
        await new Promise<void>((resolve) => (release = resolve))
        return HttpResponse.json({ ...LAN, relationship: 'Mẹ ruột', version: 1 })
      }),
    )
    await userEvent.click(editOf('Nguyễn Thị Lan'))
    await userEvent.type(input('Quan hệ'), ' ruột')
    await userEvent.dblClick(save())
    await waitFor(() => expect(save()).toHaveTextContent('Đang lưu…'))
    expect(save()).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(save())
    release()
    await waitFor(() => expect(editOf('Nguyễn Thị Lan')).toHaveFocus())
    expect(api.calls.guardianPatch).toHaveLength(1)
  })
})

describe('Guardians: conflict and removed elsewhere (AC4)', { timeout: 20_000 }, () => {
  it('a stale save opens the conflict dialog: Copy my notes, Cancel keeps the input, Reload shows the other tab and closes', async () => {
    const { api } = await openWorkspace()
    api.changeGuardianElsewhere(LAN.id, { phone: '0999 000 999' })
    await userEvent.click(editOf('Nguyễn Thị Lan'))
    await userEvent.clear(input('Ghi chú'))
    await userEvent.type(input('Ghi chú'), 'Ghi chú của tôi')
    await userEvent.click(save())
    const dialog = await screen.findByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })
    // AC11 (b): the guardian's text, not the profile's "Học viên này…".
    expect(dialog).toHaveTextContent(
      'Phụ huynh này vừa được thay đổi ở một tab hoặc cửa sổ khác. Tải lại để xem bản mới nhất; những thay đổi chưa lưu của bạn sẽ mất.',
    )
    expect(dialog).not.toHaveTextContent('Học viên này')
    await expectNoAxeViolations(document.body)
    const user = userEvent.setup()
    const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    await user.click(within(dialog).getByRole('button', { name: 'Sao chép ghi chú phụ huynh của tôi' }))
    expect(write).toHaveBeenCalledWith('Ghi chú của tôi')
    await user.click(within(dialog).getByRole('button', { name: 'Huỷ' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(input('Ghi chú')).toHaveValue('Ghi chú của tôi')
    await user.click(save())
    await user.click(
      within(await screen.findByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })).getByRole('button', {
        name: 'Tải lại',
      }),
    )
    await waitFor(() => expect(screen.queryByRole('form')).not.toBeInTheDocument())
    const lan = items()[0]!
    expect(within(lan).getByRole('link', { name: 'Gọi 0999 000 999' })).toBeInTheDocument()
    expect(within(lan).getByText(/Gọi sau 18h/)).toBeInTheDocument()
  })

  it('without a notes change the dialog has no copy button', async () => {
    const { api } = await openWorkspace()
    api.changeGuardianElsewhere(LAN.id, { phone: '0999 000 999' })
    await userEvent.click(editOf('Nguyễn Thị Lan'))
    await userEvent.type(input('Quan hệ'), 'x')
    await userEvent.click(save())
    const dialog = await screen.findByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })
    expect(within(dialog).queryByRole('button', { name: /Sao chép/ })).not.toBeInTheDocument()
  })

  it('removed in another tab: the list is refetched without it and the warning takes focus until the next guardian action', async () => {
    const { api, container } = await openWorkspace()
    api.removeGuardianElsewhere(LAN.id)
    await userEvent.click(editOf('Nguyễn Thị Lan'))
    await userEvent.type(input('Quan hệ'), 'x')
    await userEvent.click(save())
    const warning = await within(section()).findByText('Phụ huynh này đã bị xoá ở một tab hoặc cửa sổ khác.')
    await waitFor(() => expect(warning.closest('[tabindex="-1"]')).toHaveFocus())
    await waitFor(() => expect(names()).toEqual(['Trần Văn Ba']))
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    // At the top of the section, under its heading.
    expect(screen.getByRole('heading', { level: 2, name: 'Phụ huynh' }).compareDocumentPosition(warning)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    await expectNoAxeViolations(container)
    await userEvent.click(addButton()!)
    expect(screen.queryByText('Phụ huynh này đã bị xoá ở một tab hoặc cửa sổ khác.')).not.toBeInTheDocument()
  })
})

describe('Guardians: remove (AC5)', { timeout: 20_000 }, () => {
  const dialog = () => screen.getByRole('alertdialog', { name: 'Xoá Nguyễn Thị Lan khỏi danh sách phụ huynh?' })

  it('asks first; Cancel sends nothing; confirm removes it, toasts and focuses the heading (axe)', async () => {
    const { api } = await openWorkspace()
    await userEvent.click(removeOf('Nguyễn Thị Lan'))
    expect(dialog()).toHaveTextContent('Thông tin liên hệ của người này sẽ bị xoá. Không thể hoàn tác.')
    await waitFor(() => expect(within(dialog()).getByRole('button', { name: 'Huỷ' })).toHaveFocus())
    await expectNoAxeViolations(document.body)
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Huỷ' }))
    await waitFor(() => expect(dialogNamed('Xoá Nguyễn Thị Lan khỏi danh sách phụ huynh?')).not.toBeInTheDocument())
    expect(api.calls.guardianDelete).toEqual([])
    await userEvent.click(removeOf('Nguyễn Thị Lan'))
    const gets = api.calls.guardianGets
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Xoá phụ huynh' }))
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Phụ huynh' })).toHaveFocus())
    expect(api.calls.guardianDelete).toEqual([LAN.id])
    expect(names()).toEqual(['Trần Văn Ba'])
    expect(api.calls.guardianGets).toBe(gets)
    expect(toastTexts()).toEqual(['Đã xoá Nguyễn Thị Lan'])
    expect(dialogNamed('Xoá Nguyễn Thị Lan khỏi danh sách phụ huynh?')).not.toBeInTheDocument()
  })

  it('while pending the dialog shows "Removing…" and cannot be dismissed', async () => {
    await openWorkspace()
    let release = () => {}
    server.use(
      http.delete('*/api/v1/tutor/guardians/:gid', async () => {
        await new Promise<void>((resolve) => (release = resolve))
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await userEvent.click(removeOf('Nguyễn Thị Lan'))
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Xoá phụ huynh' }))
    await waitFor(() => expect(within(dialog()).getByRole('button', { name: 'Đang xoá…' })).toBeInTheDocument())
    await userEvent.keyboard('{Escape}')
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Huỷ' }))
    expect(dialog()).toBeInTheDocument()
    release()
    await waitFor(() => expect(dialogNamed('Xoá Nguyễn Thị Lan khỏi danh sách phụ huynh?')).not.toBeInTheDocument())
    expect(names()).toEqual(['Trần Văn Ba'])
  })

  it('a 5xx keeps the dialog open with its alert (axe); a 404 closes it and refetches', async () => {
    const { api } = await openWorkspace()
    server.use(http.delete('*/api/v1/tutor/guardians/:gid', () => problem(500, 'INTERNAL_ERROR')))
    await userEvent.click(removeOf('Nguyễn Thị Lan'))
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Xoá phụ huynh' }))
    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('Không xoá được phụ huynh. Hãy thử lại.')
    await expectNoAxeViolations(document.body)
    expect(api.guardians).toHaveLength(2)
    server.use(http.delete('*/api/v1/tutor/guardians/:gid', () => problem(404, 'NOT_FOUND')))
    api.removeGuardianElsewhere(LAN.id)
    const gets = api.calls.guardianGets
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Xoá phụ huynh' }))
    await waitFor(() => expect(dialogNamed('Xoá Nguyễn Thị Lan khỏi danh sách phụ huynh?')).not.toBeInTheDocument())
    await waitFor(() => expect(api.calls.guardianGets).toBe(gets + 1))
    expect(names()).toEqual(['Trần Văn Ba'])
    expect(toastTexts()).toEqual(['Đã xoá Nguyễn Thị Lan'])
  })
})

describe('Guardians: one form at a time and the guard (AC6)', { timeout: 20_000 }, () => {
  const account = () => screen.getByRole('region', { name: 'Tài khoản' })
  const accountButtons = () => within(account()).getAllByRole('button')
  const guardianTriggers = () => [
    editOf('Nguyễn Thị Lan'),
    removeOf('Nguyễn Thị Lan'),
    editOf('Trần Văn Ba'),
    removeOf('Trần Văn Ba'),
  ]

  it('the profile form disables every guardian trigger and the Account actions, with both hints', async () => {
    await openWorkspace()
    await userEvent.click(screen.getByRole('button', { name: 'Sửa hồ sơ' }))
    await screen.findByRole('form', { name: 'Sửa hồ sơ' })
    for (const button of [...guardianTriggers(), addButton()!]) expect(button).toBeDisabled()
    expect(within(section()).getByText('Hãy lưu hoặc huỷ thay đổi trước.')).toBeInTheDocument()
    for (const button of accountButtons()) expect(button).toBeDisabled()
    expect(within(account()).getByText('Hãy lưu hoặc huỷ thay đổi trước.')).toBeInTheDocument()
  })

  it('the add form disables Edit profile, every Edit and Remove and the Account actions (Account hint only)', async () => {
    await openWorkspace()
    await userEvent.click(addButton()!)
    expect(screen.getByRole('button', { name: 'Sửa hồ sơ' })).toBeDisabled()
    for (const button of guardianTriggers()) expect(button).toBeDisabled()
    for (const button of accountButtons()) expect(button).toBeDisabled()
    expect(within(account()).getByText('Hãy lưu hoặc huỷ thay đổi trước.')).toBeInTheDocument()
    expect(within(section()).queryByText('Hãy lưu hoặc huỷ thay đổi trước.')).not.toBeInTheDocument()
  })

  it("an edit form disables Edit profile, Add guardian and the other guardian's triggers", async () => {
    await openWorkspace()
    await userEvent.click(editOf('Nguyễn Thị Lan'))
    expect(screen.getByRole('button', { name: 'Sửa hồ sơ' })).toBeDisabled()
    expect(addButton()).toBeDisabled()
    expect(editOf('Trần Văn Ba')).toBeDisabled()
    expect(removeOf('Trần Văn Ba')).toBeDisabled()
    for (const button of accountButtons()) expect(button).toBeDisabled()
  })

  it('a pending status request and the reset card leave the guardian triggers enabled', async () => {
    const { api } = await openWorkspace()
    let release = () => {}
    server.use(
      http.post('*/api/v1/tutor/students/:sid/status', async () => {
        await new Promise<void>((resolve) => (release = resolve))
        return HttpResponse.json({ ...api.current, status: 'PAUSED', version: 1 })
      }),
    )
    await userEvent.click(within(account()).getByRole('button', { name: 'Tạm nghỉ' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sửa hồ sơ' })).toBeDisabled())
    for (const button of [...guardianTriggers(), addButton()!]) expect(button).toBeEnabled()
    release()
    await userEvent.click(within(account()).getByRole('button', { name: /Đặt lại mật khẩu/ }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog', { name: /^Đặt lại mật khẩu cho/ })).getByRole('button', {
        name: 'Đặt lại mật khẩu',
      }),
    )
    await screen.findByRole('heading', { level: 2, name: 'Mật khẩu tạm mới' })
    expect(screen.getByRole('button', { name: 'Sửa hồ sơ' })).toBeDisabled()
    for (const button of [...guardianTriggers(), addButton()!]) expect(button).toBeEnabled()
  })

  it('Cancel of a dirty form asks: Keep editing stays, Discard closes (focus on Edit); a clean Cancel returns focus to Add', async () => {
    await openWorkspace()
    await userEvent.click(editOf('Nguyễn Thị Lan'))
    await userEvent.type(input('Quan hệ'), 'x')
    await userEvent.click(within(form()).getByRole('button', { name: 'Huỷ' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Bỏ các thay đổi?' })
    expect(dialog).toHaveTextContent('Những thay đổi bạn vừa nhập cho phụ huynh này sẽ mất.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tiếp tục sửa' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(input('Quan hệ')).toHaveValue('Mẹx')
    await userEvent.click(within(form()).getByRole('button', { name: 'Huỷ' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Bỏ thay đổi' }))
    await waitFor(() => expect(editOf('Nguyễn Thị Lan')).toHaveFocus())
    expect(within(items()[0]!).getByText('Mẹ')).toBeInTheDocument()
    await userEvent.click(addButton()!)
    await userEvent.click(within(form()).getByRole('button', { name: 'Huỷ' }))
    await waitFor(() => expect(addButton()).toHaveFocus())
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('a dirty guardian form asks on the shell nav and the home link; Discard leaves', async () => {
    const { router } = await openWorkspace()
    await userEvent.click(addButton()!)
    await userEvent.type(input('Tên (bắt buộc)'), 'x')
    const nav = within(screen.getByRole('navigation', { name: 'Điều hướng gia sư' }))
    await userEvent.click(nav.getByRole('link', { name: 'Hôm nay' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Bỏ các thay đổi?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tiếp tục sửa' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(path(router)).toBe(`/tutor/students/${SID}`)
    await userEvent.click(screen.getByRole('link', { name: 'Lớp cô Lan' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Bỏ thay đổi' }))
    await waitFor(() => expect(path(router)).toBe('/tutor/today'))
  })

  it('own Log out passes a dirty guardian form; so does another tab’s sign-out', async () => {
    const { router } = await openWorkspace()
    await userEvent.click(editOf('Nguyễn Thị Lan'))
    await userEvent.type(input('Quan hệ'), 'x')
    await openAccountMenu()
    server.use(
      sessionAs(null),
      http.post('*/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    await waitFor(() => expect(path(router)).toBe('/login'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it("another tab's sign-out passes a dirty guardian form", async () => {
    const { router } = await openWorkspace()
    await userEvent.click(addButton()!)
    await userEvent.type(input('Tên (bắt buộc)'), 'x')
    server.use(sessionAs(null))
    const other = new BroadcastChannel(AUTH_CHANNEL)
    other.postMessage({ type: 'signed-out' })
    await waitFor(() => expect(path(router)).toBe('/login'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    other.close()
  })

  it('a forced change of password passes a dirty guardian form without a dialog', async () => {
    const { router } = await openWorkspace()
    await userEvent.click(editOf('Nguyễn Thị Lan'))
    await userEvent.type(input('Quan hệ'), 'x')
    server.use(
      sessionAs('TUTOR', true),
      http.patch('*/api/v1/tutor/guardians/:gid', () => problem(403, 'PASSWORD_CHANGE_REQUIRED')),
    )
    await userEvent.click(save())
    await waitFor(() => expect(path(router)).toBe('/change-password'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
