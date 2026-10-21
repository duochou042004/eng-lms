import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { AUTH_CHANNEL } from '../../auth/api/authChannel'
import { expectNoAxeViolations } from '../../../test/axe'
import { renderRoute } from '../../../test/render'
import { problem, server, sessionAs } from '../../../test/server'
import { openAccountMenu } from '../../../test/shell'
import { guardian, learningProfile, SID, workspaceApi } from '../../../test/students'

// T-M2.17 AC1 (the section and its states), AC3 (edit and save), AC4 (validation, 422 mapping), AC5 (the transitions
// table, conflict, not found), AC6 (one form at a time, the guard), AC8 (axe). Typing makes these slow: 20 s timeouts.

const FILLED = learningProfile({
  currentLevel: 'B1',
  strengths: ['Nghe', 'Phát âm', 'https://example.com'],
  weaknesses: ['<b>x</b>', 'Ngữ pháp'],
  learningNotes: 'Dòng một\nDòng hai',
  customFields: [
    { label: 'Mục tiêu', value: '650' },
    { label: 'Phong cách học', value: '' },
  ],
  updatedAt: '2026-10-20T03:00:00Z',
  version: 3,
})
const LAN = guardian(1, { name: 'Nguyễn Thị Lan' })

const section = () => screen.getByRole('region', { name: 'Hồ sơ học tập' })
const editLp = () => screen.getByRole('button', { name: 'Sửa hồ sơ học tập' })
const editProfile = () => screen.getByRole('button', { name: 'Sửa hồ sơ' })
const form = () => screen.getByRole('form', { name: 'Sửa hồ sơ học tập' })
const textbox = (name: string) => within(form()).getByRole('textbox', { name })
const group = (name: string) => within(form()).getByRole('group', { name })
const save = () => within(form()).getByRole('button', { name: /^(Lưu|Đang lưu…)$/ })
const cancel = () => within(form()).getByRole('button', { name: 'Huỷ' })
const summary = () => within(form()).getByRole('alert', { name: 'Chưa lưu được hồ sơ học tập' })
const toastTexts = () => {
  const region = screen.queryByRole('region', { name: 'Thông báo' })
  return region
    ? within(region)
        .getAllByRole('status')
        .map((s) => s.textContent)
    : []
}
const rows = () =>
  within(section())
    .getAllByRole('term')
    .map((term) => [term.textContent, term.nextElementSibling!.textContent])
const path = (router: { state: { location: { pathname: string } } }) => router.state.location.pathname

async function openWorkspace(
  profile: Record<string, unknown> = FILLED,
  guardians: Array<Record<string, unknown>> = [],
) {
  const api = workspaceApi({}, { profile, guardians })
  const result = renderRoute(`/tutor/students/${SID}`)
  await screen.findByRole('heading', { level: 1, name: 'Nguyễn Văn An' })
  await within(screen.getByRole('region', { name: 'Hồ sơ học tập' })).findByRole('button', {
    name: 'Sửa hồ sơ học tập',
  })
  return { api, ...result }
}

async function openForm(profile: Record<string, unknown> = FILLED, guardians: Array<Record<string, unknown>> = []) {
  const opened = await openWorkspace(profile, guardians)
  await userEvent.click(editLp())
  await screen.findByRole('form', { name: 'Sửa hồ sơ học tập' })
  return opened
}

describe('Learning profile: the section (AC1)', { timeout: 20_000 }, () => {
  it('sits between Guardians and Account; level, chips in order, notes with line breaks, custom fields; text only (axe)', async () => {
    const { container } = await openWorkspace()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Thông tin cá nhân',
      'Liên hệ',
      'Ghi chú',
      'Phụ huynh',
      'Hồ sơ học tập',
      'Tài khoản',
    ])
    expect(rows()).toEqual([
      ['Trình độ hiện tại', 'B1'],
      ['Điểm mạnh', 'NghePhát âmhttps://example.com'],
      ['Điểm yếu', '<b>x</b>Ngữ pháp'],
      ['Ghi chú học tập', 'Dòng một\nDòng hai'],
      ['Mục tiêu', '650'],
      ['Phong cách học', 'Chưa có'],
    ])
    const strengths = within(section()).getAllByRole('list')[0]!
    expect(
      within(strengths)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Nghe', 'Phát âm', 'https://example.com'])
    expect(within(section()).queryByRole('link')).not.toBeInTheDocument()
    expect(section().querySelector('b')).toBeNull()
    expect(within(section()).getByText(/Dòng một/)).toHaveClass('note')
    await expectNoAxeViolations(container)
  })

  it('a never-saved profile: the four rows "Not added", no custom rows', async () => {
    await openWorkspace(learningProfile())
    expect(rows()).toEqual([
      ['Trình độ hiện tại', 'Chưa có'],
      ['Điểm mạnh', 'Chưa có'],
      ['Điểm yếu', 'Chưa có'],
      ['Ghi chú học tập', 'Chưa có'],
    ])
  })

  it('loading: a busy, labelled region and no Edit learning profile; the rest of the page works', async () => {
    workspaceApi()
    let release = () => {}
    server.use(
      http.get('*/api/v1/tutor/students/:sid/learning-profile', async () => {
        await new Promise<void>((resolve) => (release = resolve))
        return HttpResponse.json(FILLED)
      }),
    )
    renderRoute(`/tutor/students/${SID}`)
    await screen.findByRole('heading', { level: 1, name: 'Nguyễn Văn An' })
    const busy = within(section()).getByLabelText('Đang tải hồ sơ học tập')
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('button', { name: 'Sửa hồ sơ học tập' })).not.toBeInTheDocument()
    expect(editProfile()).toBeEnabled()
    release()
    await within(section()).findByRole('button', { name: 'Sửa hồ sơ học tập' })
    expect(within(section()).queryByLabelText('Đang tải hồ sơ học tập')).not.toBeInTheDocument()
  })

  it('error: the alert with Try again in the section, no Edit learning profile; Try again focuses the h2 and loads', async () => {
    workspaceApi({}, { profile: FILLED })
    let failing = true
    server.use(
      http.get('*/api/v1/tutor/students/:sid/learning-profile', () =>
        failing ? problem(503, 'INTERNAL_ERROR') : HttpResponse.json(FILLED),
      ),
    )
    const { container } = renderRoute(`/tutor/students/${SID}`)
    const alert = await within(await screen.findByRole('region', { name: 'Hồ sơ học tập' })).findByRole('alert')
    expect(alert).toHaveTextContent('Không tải được hồ sơ học tập.')
    expect(screen.queryByRole('button', { name: 'Sửa hồ sơ học tập' })).not.toBeInTheDocument()
    expect(editProfile()).toBeEnabled()
    await expectNoAxeViolations(container)
    failing = false
    await userEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }))
    await within(section()).findByRole('button', { name: 'Sửa hồ sơ học tập' })
    expect(screen.getByRole('heading', { level: 2, name: 'Hồ sơ học tập' })).toHaveFocus()
  })

  it('a 404 on the profile shows the not-found view', async () => {
    workspaceApi()
    server.use(http.get('*/api/v1/tutor/students/:sid/learning-profile', () => problem(404, 'NOT_FOUND')))
    renderRoute(`/tutor/students/${SID}`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy học viên' })).toBeInTheDocument()
  })
})

describe('Learning profile: edit and save (AC3)', { timeout: 20_000 }, () => {
  it('opens with the stored values, focus on Current level, Edit learning profile hidden; the fields in order (axe)', async () => {
    const { container } = await openForm()
    expect(textbox('Trình độ hiện tại')).toHaveFocus()
    expect(textbox('Trình độ hiện tại')).toHaveValue('B1')
    expect(textbox('Trình độ hiện tại')).toHaveAccessibleDescription('Nhập tự do, ví dụ B1 hoặc thang đo của riêng bạn')
    expect(
      within(group('Điểm mạnh'))
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Xoá Nghe', 'Xoá Phát âm', 'Xoá https://example.com'])
    expect(textbox('Ghi chú học tập')).toHaveValue('Dòng một\nDòng hai')
    expect(group('Mục 1')).toBeInTheDocument()
    expect(within(group('Mục 1')).getByRole('textbox', { name: 'Nhãn (bắt buộc)' })).toHaveValue('Mục tiêu')
    expect(within(group('Mục 2')).getByRole('textbox', { name: 'Giá trị' })).toHaveValue('')
    expect(within(group('Mục tuỳ chỉnh')).getByRole('button', { name: 'Thêm mục' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sửa hồ sơ học tập' })).not.toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('a never-saved profile sends version null and every field; then the read view, the toast, focus on Edit', async () => {
    const { api, queryClient } = await openForm(learningProfile())
    await userEvent.type(textbox('Trình độ hiện tại'), '  A2 ')
    await userEvent.type(textbox('Điểm mạnh'), 'Nghe{Enter}Nói,')
    // Text left in a tag input is committed by Save.
    await userEvent.type(textbox('Điểm yếu'), 'Viết')
    await userEvent.type(textbox('Ghi chú học tập'), ' Học tối thứ Ba ')
    const add = within(group('Mục tuỳ chỉnh')).getByRole('button', { name: 'Thêm mục' })
    await userEvent.click(add)
    // An empty row (left out), then a filled one.
    await userEvent.click(within(group('Mục tuỳ chỉnh')).getByRole('button', { name: 'Thêm mục' }))
    expect(within(group('Mục 2')).getByRole('textbox', { name: 'Nhãn (bắt buộc)' })).toHaveFocus()
    await userEvent.type(within(group('Mục 2')).getByRole('textbox', { name: 'Nhãn (bắt buộc)' }), ' Mục tiêu ')
    await userEvent.type(within(group('Mục 2')).getByRole('textbox', { name: 'Giá trị' }), ' 650 ')
    await userEvent.click(save())
    await waitFor(() => expect(editLp()).toHaveFocus())
    expect(api.calls.profilePut).toEqual([
      {
        version: null,
        currentLevel: 'A2',
        strengths: ['Nghe', 'Nói'],
        weaknesses: ['Viết'],
        learningNotes: 'Học tối thứ Ba',
        customFields: [{ label: 'Mục tiêu', value: '650' }],
      },
    ])
    expect(toastTexts()).toEqual(['Đã lưu hồ sơ học tập'])
    expect(rows()).toEqual([
      ['Trình độ hiện tại', 'A2'],
      ['Điểm mạnh', 'NgheNói'],
      ['Điểm yếu', 'Viết'],
      ['Ghi chú học tập', 'Học tối thứ Ba'],
      ['Mục tiêu', '650'],
    ])
    // The answer replaced the cache entry (no refetch).
    expect(queryClient.getQueryData<{ version: number }>(['students', 'learningProfile', SID])?.version).toBe(1)
    expect(api.calls.profileGets).toBe(1)
  })

  it('a saved profile sends its version; emptied texts are null; tags removed; a later save uses the new version', async () => {
    const { api } = await openForm()
    await userEvent.clear(textbox('Trình độ hiện tại'))
    await userEvent.clear(textbox('Ghi chú học tập'))
    await userEvent.type(textbox('Ghi chú học tập'), '   ')
    await userEvent.click(within(group('Điểm yếu')).getByRole('button', { name: 'Xoá <b>x</b>' }))
    await userEvent.click(within(group('Mục 1')).getByRole('button', { name: 'Xoá mục 1' }))
    await userEvent.click(save())
    await waitFor(() => expect(editLp()).toHaveFocus())
    expect(api.calls.profilePut[0]).toEqual({
      version: 3,
      currentLevel: null,
      strengths: ['Nghe', 'Phát âm', 'https://example.com'],
      weaknesses: ['Ngữ pháp'],
      learningNotes: null,
      customFields: [{ label: 'Phong cách học', value: '' }],
    })
    await userEvent.click(editLp())
    await userEvent.type(textbox('Trình độ hiện tại'), 'B2')
    await userEvent.click(save())
    await waitFor(() => expect(api.calls.profilePut).toHaveLength(2))
    expect(api.calls.profilePut[1]).toMatchObject({ version: 4, currentLevel: 'B2' })
  })

  it('an unchanged form (also after whitespace-only edits and an empty row) sends nothing, closes, focuses Edit, no toast', async () => {
    const { api } = await openForm()
    await userEvent.type(textbox('Trình độ hiện tại'), '  ')
    await userEvent.type(textbox('Điểm mạnh'), '   ')
    await userEvent.click(within(group('Mục tuỳ chỉnh')).getByRole('button', { name: 'Thêm mục' }))
    await userEvent.click(save())
    await waitFor(() => expect(editLp()).toHaveFocus())
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(api.calls.profilePut).toEqual([])
    expect(toastTexts()).toEqual([])
  })

  it('Enter in a tag input adds the tag and never submits the form', async () => {
    const { api } = await openForm()
    await userEvent.type(textbox('Điểm yếu'), 'Từ vựng{Enter}')
    expect(api.calls.profilePut).toEqual([])
    expect(form()).toBeInTheDocument()
    expect(within(group('Điểm yếu')).getByRole('button', { name: 'Xoá Từ vựng' })).toBeInTheDocument()
    expect(textbox('Điểm yếu')).toHaveFocus()
  })

  it('Save is pending while sending and a double click sends one request', async () => {
    const { api } = await openForm()
    server.use(
      http.put('*/api/v1/tutor/students/:sid/learning-profile', async ({ request }) => {
        api.calls.profilePut.push((await request.json()) as Record<string, unknown>)
        await delay(300)
        return HttpResponse.json({ ...FILLED, currentLevel: 'B2', version: 4 })
      }),
    )
    await userEvent.clear(textbox('Trình độ hiện tại'))
    await userEvent.type(textbox('Trình độ hiện tại'), 'B2')
    await userEvent.dblClick(save())
    expect(save()).toHaveTextContent('Đang lưu…')
    expect(save()).toHaveFocus()
    await waitFor(() => expect(editLp()).toHaveFocus())
    expect(api.calls.profilePut).toHaveLength(1)
  })

  it('a 500 keeps every input with the alert above the actions; a network failure too', async () => {
    await openForm()
    server.use(http.put('*/api/v1/tutor/students/:sid/learning-profile', () => problem(500, 'INTERNAL_ERROR')))
    await userEvent.type(textbox('Điểm mạnh'), 'Đọc')
    await userEvent.click(save())
    expect(
      await within(form()).findByText('Không lưu được hồ sơ học tập. Thông tin bạn nhập vẫn còn: hãy thử lại.'),
    ).toBeInTheDocument()
    // The committed text is a chip now.
    expect(within(group('Điểm mạnh')).getByRole('button', { name: 'Xoá Đọc' })).toBeInTheDocument()
    server.use(http.put('*/api/v1/tutor/students/:sid/learning-profile', () => HttpResponse.error()))
    await userEvent.click(save())
    expect(await within(form()).findByText(/Không kết nối được máy chủ/)).toBeInTheDocument()
    expect(textbox('Trình độ hiện tại')).toHaveValue('B1')
  })
})

describe('Learning profile: validation and 422 (AC4)', { timeout: 20_000 }, () => {
  it('client limits: level 40, notes 2,000, label 60 and required with a value, value 500; the summary takes focus', async () => {
    const { api } = await openForm(learningProfile())
    await userEvent.click(textbox('Trình độ hiện tại'))
    await userEvent.paste('x'.repeat(41))
    await userEvent.click(textbox('Ghi chú học tập'))
    await userEvent.paste('y'.repeat(2001))
    await userEvent.click(within(group('Mục tuỳ chỉnh')).getByRole('button', { name: 'Thêm mục' }))
    await userEvent.paste('z'.repeat(61))
    await userEvent.click(within(group('Mục tuỳ chỉnh')).getByRole('button', { name: 'Thêm mục' }))
    await userEvent.click(within(group('Mục 2')).getByRole('textbox', { name: 'Giá trị' }))
    await userEvent.paste('v'.repeat(501))
    await userEvent.click(save())
    await waitFor(() => expect(summary()).toHaveFocus())
    expect(
      within(summary())
        .getAllByRole('link')
        .map((a) => [a.textContent, a.getAttribute('href')]),
    ).toEqual([
      ['Tối đa 40 ký tự.', '#learning-profile-currentLevel'],
      ['Tối đa 2000 ký tự.', '#learning-profile-learningNotes'],
      ['Tối đa 60 ký tự.', '#learning-profile-field-0-label'],
      ['Hãy nhập nhãn.', '#learning-profile-field-1-label'],
      ['Tối đa 500 ký tự.', '#learning-profile-field-1-value'],
    ])
    expect(api.calls.profilePut).toEqual([])
  })

  it('AC10 (a): no error on blur; after a failed Save the inline error clears while typing (DEC-142)', async () => {
    const { api } = await openForm(learningProfile())
    await userEvent.click(within(group('Mục tuỳ chỉnh')).getByRole('button', { name: 'Thêm mục' }))
    const label = within(group('Mục 1')).getByRole('textbox', { name: 'Nhãn (bắt buộc)' })
    await userEvent.type(within(group('Mục 1')).getByRole('textbox', { name: 'Giá trị' }), '650')
    await userEvent.type(label, 'M')
    await userEvent.clear(label)
    await userEvent.tab()
    expect(label).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByText('Hãy nhập nhãn.')).not.toBeInTheDocument()
    await userEvent.click(save())
    await waitFor(() => expect(summary()).toHaveFocus())
    expect(label).toHaveAttribute('aria-invalid', 'true')
    await userEvent.type(label, 'Mục tiêu')
    expect(label).not.toHaveAttribute('aria-invalid')
    expect(within(group('Mục 1')).queryByText('Hãy nhập nhãn.')).not.toBeInTheDocument()
    await userEvent.click(save())
    await waitFor(() => expect(api.calls.profilePut).toHaveLength(1))
  })

  it('a refused tag left in the input blocks Save with its error in the summary', async () => {
    const { api } = await openForm()
    await userEvent.type(textbox('Điểm mạnh'), 'NGHE')
    await userEvent.click(save())
    await waitFor(() => expect(summary()).toHaveFocus())
    expect(within(summary()).getByRole('link', { name: 'Đã thêm rồi.' })).toHaveAttribute(
      'href',
      '#learning-profile-strengths',
    )
    expect(textbox('Điểm mạnh')).toHaveValue('NGHE')
    expect(api.calls.profilePut).toEqual([])
  })

  it('30 rows: Add field is hidden with the limit text; removing one shows it again with focus', async () => {
    const thirty = Array.from({ length: 30 }, (_, i) => ({ label: `Nhãn ${i + 1}`, value: '' }))
    await openForm(learningProfile({ customFields: thirty, version: 0 }))
    expect(within(group('Mục tuỳ chỉnh')).queryByRole('button', { name: 'Thêm mục' })).not.toBeInTheDocument()
    expect(within(group('Mục tuỳ chỉnh')).getByText('Tối đa 30 mục.')).toBeInTheDocument()
    await userEvent.click(within(group('Mục 30')).getByRole('button', { name: 'Xoá mục 30' }))
    await waitFor(() => expect(within(group('Mục tuỳ chỉnh')).getByRole('button', { name: 'Thêm mục' })).toHaveFocus())
  })

  it('a 422 maps currentLevel, strengths[2] (naming the tag) and customFields[1].label (after a dropped empty row) to fields; TOO_MANY to the summary', async () => {
    await openForm(learningProfile({ strengths: ['Nghe', 'Nói', 'Đọc'], version: 0 }))
    server.use(
      http.put('*/api/v1/tutor/students/:sid/learning-profile', () =>
        problem(422, 'VALIDATION_FAILED', 'req-422', {
          errors: [
            { field: 'currentLevel', code: 'TOO_LONG' },
            { field: 'strengths[2]', code: 'INVALID_FORMAT' },
            { field: 'customFields[1].label', code: 'TOO_LONG' },
            { field: 'customFields', code: 'TOO_MANY' },
          ],
        }),
      ),
    )
    await userEvent.type(textbox('Trình độ hiện tại'), 'B1')
    const fields = () => group('Mục tuỳ chỉnh')
    await userEvent.click(within(fields()).getByRole('button', { name: 'Thêm mục' }))
    await userEvent.type(within(group('Mục 1')).getByRole('textbox', { name: 'Nhãn (bắt buộc)' }), 'Một')
    await userEvent.click(within(fields()).getByRole('button', { name: 'Thêm mục' }))
    await userEvent.click(within(fields()).getByRole('button', { name: 'Thêm mục' }))
    await userEvent.type(within(group('Mục 3')).getByRole('textbox', { name: 'Nhãn (bắt buộc)' }), 'Ba')
    await userEvent.click(save())
    await waitFor(() => expect(summary()).toHaveFocus())
    expect(
      within(summary())
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([
      'Tối đa 40 ký tự.',
      '“Đọc”: Giá trị này có ký tự hoặc định dạng không được phép.',
      'Tối đa 60 ký tự.',
      'Tối đa 30 mục.',
    ])
    expect(textbox('Điểm mạnh')).toHaveAccessibleDescription(/“Đọc”: Giá trị này có ký tự/)
    expect(within(group('Mục 3')).getByRole('textbox', { name: 'Nhãn (bắt buộc)' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(within(group('Mục 1')).getByRole('textbox', { name: 'Nhãn (bắt buộc)' })).not.toHaveAttribute('aria-invalid')
    await expectNoAxeViolations(form())
  })

  it('a 422 TOO_MANY on weaknesses shows "Up to 30 tags." on that field', async () => {
    await openForm()
    server.use(
      http.put('*/api/v1/tutor/students/:sid/learning-profile', () =>
        problem(422, 'VALIDATION_FAILED', 'req-422', { errors: [{ field: 'weaknesses', code: 'TOO_MANY' }] }),
      ),
    )
    await userEvent.type(textbox('Điểm yếu'), 'Viết{Enter}')
    await userEvent.click(save())
    await waitFor(() => expect(summary()).toHaveFocus())
    expect(textbox('Điểm yếu')).toHaveAccessibleDescription(/Tối đa 30 thẻ\./)
  })
})

type Outcome = 'saved' | 'conflict' | 'fields' | 'notFound' | 'alert' | 'none'

describe('Learning profile: every transition of the PUT (AC5, Domain rules)', { timeout: 20_000 }, () => {
  it.each<{
    name: string
    profile: Record<string, unknown>
    before?: (api: ReturnType<typeof workspaceApi>) => void
    change?: boolean
    sent?: number | null
    outcome: Outcome
    version?: number
  }>([
    {
      name: 'none, version null → 200 created (version 1: the empty row, then the values)',
      profile: learningProfile(),
      sent: null,
      outcome: 'saved',
      version: 1,
    },
    {
      name: 'none, a number → 409',
      profile: learningProfile({ version: 2 }),
      before: () =>
        server.use(http.put('*/api/v1/tutor/students/:sid/learning-profile', () => problem(409, 'STALE_VERSION'))),
      outcome: 'conflict',
    },
    {
      name: 'exists, version null (another tab created it) → 409',
      profile: learningProfile(),
      before: (api) => api.saveProfileElsewhere({ currentLevel: 'C1' }),
      sent: null,
      outcome: 'conflict',
    },
    { name: 'exists n, n → 200 replaced (n + 1)', profile: FILLED, sent: 3, outcome: 'saved', version: 4 },
    { name: 'exists n, unchanged → no request', profile: FILLED, change: false, outcome: 'none' },
    {
      name: 'exists n, m ≠ n (another tab saved) → 409',
      profile: FILLED,
      before: (api) => api.saveProfileElsewhere({ currentLevel: 'C1' }),
      sent: 3,
      outcome: 'conflict',
    },
    {
      name: 'invalid values → 422 fields',
      profile: FILLED,
      before: () =>
        server.use(
          http.put('*/api/v1/tutor/students/:sid/learning-profile', () =>
            problem(422, 'VALIDATION_FAILED', 'req-422', { errors: [{ field: 'currentLevel', code: 'TOO_LONG' }] }),
          ),
        ),
      outcome: 'fields',
    },
    {
      name: 'student unknown → 404 not found',
      profile: FILLED,
      before: () =>
        server.use(http.put('*/api/v1/tutor/students/:sid/learning-profile', () => problem(404, 'NOT_FOUND'))),
      outcome: 'notFound',
    },
    {
      name: 'a server failure → the alert, input kept',
      profile: FILLED,
      before: () =>
        server.use(http.put('*/api/v1/tutor/students/:sid/learning-profile', () => problem(503, 'INTERNAL_ERROR'))),
      outcome: 'alert',
    },
  ])('$name', async ({ profile, before, change = true, sent, outcome, version }) => {
    const { api, queryClient } = await openForm(profile)
    before?.(api)
    if (change) await userEvent.type(textbox('Trình độ hiện tại'), 'x')
    await userEvent.click(save())
    if (outcome === 'saved') {
      await waitFor(() => expect(editLp()).toHaveFocus())
      expect(toastTexts()).toEqual(['Đã lưu hồ sơ học tập'])
      expect(queryClient.getQueryData<{ version: number }>(['students', 'learningProfile', SID])?.version).toBe(version)
    } else if (outcome === 'conflict') {
      expect(await screen.findByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })).toHaveTextContent(
        /Hồ sơ học tập này vừa được thay đổi/,
      )
    } else if (outcome === 'fields') {
      await waitFor(() => expect(summary()).toHaveFocus())
    } else if (outcome === 'notFound') {
      expect(await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy học viên' })).toBeInTheDocument()
    } else if (outcome === 'alert') {
      expect(await within(form()).findByText(/Không lưu được hồ sơ học tập/)).toBeInTheDocument()
      expect(textbox('Trình độ hiện tại')).toHaveValue('B1x')
    } else {
      await waitFor(() => expect(editLp()).toHaveFocus())
      expect(api.calls.profilePut).toEqual([])
    }
    if (sent !== undefined) expect(api.calls.profilePut[0]?.version).toBe(sent)
  })
})

describe('Learning profile: conflict (AC5)', { timeout: 20_000 }, () => {
  it('Copy my learning notes copies; Cancel keeps the input; Reload shows the other tab, closes, focuses Edit (axe)', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const { api } = await openForm()
    api.saveProfileElsewhere({ currentLevel: 'C1' })
    await userEvent.clear(textbox('Ghi chú học tập'))
    await userEvent.type(textbox('Ghi chú học tập'), 'Ghi chú của tab này')
    await userEvent.click(save())
    const dialog = await screen.findByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })
    await expectNoAxeViolations(document.body)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sao chép ghi chú học tập của tôi' }))
    expect(writeText).toHaveBeenCalledWith('Ghi chú của tab này')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(textbox('Ghi chú học tập')).toHaveValue('Ghi chú của tab này')
    // React Aria's dialog gives focus back to the control that had it before (Save).
    await waitFor(() => expect(save()).toHaveFocus())
    await userEvent.click(save())
    await userEvent.click(
      within(await screen.findByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })).getByRole('button', {
        name: 'Tải lại',
      }),
    )
    await waitFor(() => expect(editLp()).toHaveFocus())
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(rows()[0]).toEqual(['Trình độ hiện tại', 'C1'])
  })

  it('without a notes change the dialog has no Copy my learning notes', async () => {
    const { api } = await openForm()
    api.saveProfileElsewhere({ currentLevel: 'C1' })
    await userEvent.type(textbox('Trình độ hiện tại'), 'x')
    await userEvent.click(save())
    const dialog = await screen.findByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })
    expect(within(dialog).queryByRole('button', { name: /Sao chép/ })).not.toBeInTheDocument()
  })
})

describe('Learning profile: one form at a time and the guard (AC6)', { timeout: 20_000 }, () => {
  const account = () => screen.getByRole('region', { name: 'Tài khoản' })
  const guardians = () => screen.getByRole('region', { name: 'Phụ huynh' })
  const hint = 'Hãy lưu hoặc huỷ thay đổi trước.'

  it('the learning-profile form disables every other trigger and the Account actions; the Guardians and Account hints show', async () => {
    await openForm(FILLED, [LAN])
    await within(guardians()).findByRole('heading', { level: 3, name: 'Nguyễn Thị Lan' })
    for (const name of ['Sửa hồ sơ', 'Thêm phụ huynh', 'Sửa Nguyễn Thị Lan', 'Xoá Nguyễn Thị Lan'])
      expect(screen.getByRole('button', { name })).toBeDisabled()
    for (const button of within(account()).getAllByRole('button')) expect(button).toBeDisabled()
    expect(within(guardians()).getByText(hint)).toBeInTheDocument()
    expect(within(account()).getByText(hint)).toBeInTheDocument()
    expect(within(section()).queryByText(hint)).not.toBeInTheDocument()
  })

  it.each([
    ['the profile form', () => userEvent.click(editProfile())],
    ['the add-guardian form', () => userEvent.click(screen.getByRole('button', { name: 'Thêm phụ huynh' }))],
    ['a guardian edit form', () => userEvent.click(screen.getByRole('button', { name: 'Sửa Nguyễn Thị Lan' }))],
  ])('%s disables Edit learning profile with the hint in the section', async (_, open) => {
    await openWorkspace(FILLED, [LAN])
    await within(guardians()).findByRole('heading', { level: 3, name: 'Nguyễn Thị Lan' })
    await open()
    expect(editLp()).toBeDisabled()
    expect(within(section()).getByText(hint)).toBeInTheDocument()
  })

  it('a pending status request and the reset card leave Edit learning profile enabled', async () => {
    const { api } = await openWorkspace()
    let release = () => {}
    server.use(
      http.post('*/api/v1/tutor/students/:sid/status', async () => {
        await new Promise<void>((resolve) => (release = resolve))
        return HttpResponse.json({ ...api.current, status: 'PAUSED', version: 1 })
      }),
    )
    await userEvent.click(within(account()).getByRole('button', { name: 'Tạm nghỉ' }))
    await waitFor(() => expect(editProfile()).toBeDisabled())
    expect(editLp()).toBeEnabled()
    release()
    await userEvent.click(within(account()).getByRole('button', { name: /Đặt lại mật khẩu/ }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog', { name: /^Đặt lại mật khẩu cho/ })).getByRole('button', {
        name: 'Đặt lại mật khẩu',
      }),
    )
    await screen.findByRole('heading', { level: 2, name: 'Mật khẩu tạm mới' })
    expect(editLp()).toBeEnabled()
  })

  it('Cancel with only uncommitted tag text asks: Keep editing stays, Discard closes (focus on Edit); a clean Cancel closes', async () => {
    await openForm()
    await userEvent.type(textbox('Điểm mạnh'), 'Chưa thêm')
    await userEvent.click(cancel())
    const dialog = await screen.findByRole('alertdialog', { name: 'Bỏ các thay đổi?' })
    expect(dialog).toHaveTextContent('Những thay đổi bạn vừa nhập cho hồ sơ học tập này sẽ mất.')
    await expectNoAxeViolations(document.body)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tiếp tục sửa' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(textbox('Điểm mạnh')).toHaveValue('Chưa thêm')
    await userEvent.click(cancel())
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Bỏ thay đổi' }))
    await waitFor(() => expect(editLp()).toHaveFocus())
    expect(rows()[1]).toEqual(['Điểm mạnh', 'NghePhát âmhttps://example.com'])
    await userEvent.click(editLp())
    await userEvent.click(cancel())
    await waitFor(() => expect(editLp()).toHaveFocus())
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('a dirty form asks on the shell nav and the home link; Discard leaves', async () => {
    const { router } = await openForm()
    await userEvent.type(textbox('Điểm yếu'), 'x')
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

  it('own Log out passes a dirty form and leaves no profile data in the cache', async () => {
    const { router, queryClient } = await openForm()
    await userEvent.type(textbox('Trình độ hiện tại'), 'x')
    await openAccountMenu()
    // Signed out, the server refuses the tutor's requests (a mounted query refetches after the cache clear).
    server.use(
      sessionAs(null),
      http.post('*/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
      http.get('*/api/v1/tutor/*', () => problem(401, 'UNAUTHENTICATED')),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    await waitFor(() => expect(path(router)).toBe('/login'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    const held = queryClient.getQueryCache().findAll({ queryKey: ['students', 'learningProfile'] })
    expect(held.map((q) => q.state.data).filter((d) => d !== undefined)).toEqual([])
  })

  it("another tab's sign-out passes a dirty form and leaves no profile data in the cache", async () => {
    const { router, queryClient } = await openForm()
    await userEvent.type(textbox('Điểm mạnh'), 'x')
    server.use(
      sessionAs(null),
      http.get('*/api/v1/tutor/*', () => problem(401, 'UNAUTHENTICATED')),
    )
    const other = new BroadcastChannel(AUTH_CHANNEL)
    act(() => other.postMessage({ type: 'signed-out' }))
    await waitFor(() => expect(path(router)).toBe('/login'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(
        queryClient
          .getQueryCache()
          .findAll({ queryKey: ['students', 'learningProfile'] })
          .map((q) => q.state.data)
          .filter((d) => d !== undefined),
      ).toEqual([]),
    )
    other.close()
  })

  it('a forced change of password passes a dirty form without a dialog', async () => {
    const { router } = await openForm()
    await userEvent.type(textbox('Trình độ hiện tại'), 'x')
    server.use(
      sessionAs('TUTOR', true),
      http.put('*/api/v1/tutor/students/:sid/learning-profile', () => problem(403, 'PASSWORD_CHANGE_REQUIRED')),
    )
    await userEvent.click(save())
    await waitFor(() => expect(path(router)).toBe('/change-password'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
