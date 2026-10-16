import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { AUTH_CHANNEL } from '../../auth/api/authChannel'
import { expectNoAxeViolations } from '../../../test/axe'
import { renderRoute } from '../../../test/render'
import { META, problem, server, sessionAs } from '../../../test/server'
import { openAccountMenu } from '../../../test/shell'
import { page, row, SID, student } from '../../../test/students'

// T-M2.5 AC5 (suggestion, availability, races, create), AC6 (errors, double submit, the unsaved changes guard), AC7 (the
// credentials card and its hygiene), AC10 (axe). Typing with user-event and the 300 ms debounces make these slow on a busy
// runner, hence the 20 s timeouts.

const slug = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const CREDENTIALS = {
  username: 'nguyenvanan',
  temporaryPassword: 'Tạm-9xQ2-pW7m-Lk',
  expiresAt: '2026-10-23T03:00:00Z',
}

interface ApiOptions {
  suggestionDelay?: (fullName: string) => number
  taken?: string[]
  create?: (body: Record<string, unknown>) => Response | Promise<Response>
}

/** The tutor's API for the form: suggestion, availability and create; records what it receives. */
function formApi({ suggestionDelay = () => 0, taken = [], create }: ApiOptions = {}) {
  const calls = { suggestion: [] as string[], availability: [] as string[], create: [] as Record<string, unknown>[] }
  server.use(
    sessionAs('TUTOR'),
    http.get('*/api/v1/tutor/usernames/suggestion', async ({ request }) => {
      const fullName = new URL(request.url).searchParams.get('fullName')!
      calls.suggestion.push(fullName)
      await delay(suggestionDelay(fullName))
      return HttpResponse.json({ username: slug(fullName) })
    }),
    http.get('*/api/v1/tutor/usernames/availability', ({ request }) => {
      const username = new URL(request.url).searchParams.get('username')!
      calls.availability.push(username)
      const invalid = !/^[a-z0-9._-]{3,40}$/.test(username)
      const isTaken = taken.includes(username)
      return HttpResponse.json({
        username,
        available: !invalid && !isTaken,
        reason: invalid ? 'INVALID' : isTaken ? 'TAKEN' : null,
      })
    }),
    http.post('*/api/v1/tutor/students', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      calls.create.push(body)
      if (create) return create(body)
      return HttpResponse.json(
        { student: student({ fullName: body.fullName, username: body.username }), credentials: CREDENTIALS },
        { status: 201 },
      )
    }),
    http.get('*/api/v1/tutor/students', () => HttpResponse.json(page([row(1)]))),
    http.get(`*/api/v1/tutor/students/${SID}`, () => HttpResponse.json(student())),
    http.post('*/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
  )
  return calls
}

const field = (name: RegExp | string) => screen.getByRole('textbox', { name })
const fullName = () => field('Họ tên (bắt buộc)')
const username = () => field('Tên đăng nhập (bắt buộc)')
const createButton = () => screen.getByRole('button', { name: /^(Tạo|Đang tạo…)$/ })
const path = (router: { state: { location: { pathname: string } } }) => router.state.location.pathname

async function openForm() {
  const result = renderRoute('/tutor/students/new')
  await screen.findByRole('heading', { level: 1, name: 'Thêm học viên' })
  return result
}

describe('Add student: username suggestion and availability (AC5)', { timeout: 20_000 }, () => {
  it('fills Username from the server suggestion and shows "Available"; Create sends no password', async () => {
    const calls = formApi()
    const { container } = await openForm()
    expect(document.title).toBe('Thêm học viên · Eng-LMS')
    await userEvent.type(fullName(), 'Nguyễn Văn An')
    await waitFor(() => expect(username()).toHaveValue('nguyenvanan'))
    expect(await screen.findByText('Có thể dùng')).toBeInTheDocument()
    // Debounced: one suggestion request for the whole name.
    expect(calls.suggestion).toEqual(['Nguyễn Văn An'])
    await expectNoAxeViolations(container)
    await userEvent.click(createButton())
    await screen.findByRole('heading', { level: 2, name: 'Đã tạo học viên' })
    expect(calls.create).toEqual([{ fullName: 'Nguyễn Văn An', username: 'nguyenvanan' }])
  })

  it('sends no suggestion request for a name with fewer than 3 letters or digits', async () => {
    const calls = formApi()
    await openForm()
    await userEvent.type(fullName(), 'Đỗ')
    await new Promise((resolve) => setTimeout(resolve, 450))
    expect(calls.suggestion).toEqual([])
    expect(username()).toHaveValue('')
  })

  it('emptying the name clears an untouched username; editing Username stops the suggestion', async () => {
    const calls = formApi()
    await openForm()
    await userEvent.type(fullName(), 'Trần Bình')
    await waitFor(() => expect(username()).toHaveValue('tranbinh'))
    await userEvent.clear(fullName())
    await waitFor(() => expect(username()).toHaveValue(''))
    await userEvent.type(fullName(), 'Lê Hoa')
    await waitFor(() => expect(username()).toHaveValue('lehoa'))
    await userEvent.type(username(), '2')
    await userEvent.type(fullName(), ' Mai')
    await new Promise((resolve) => setTimeout(resolve, 450))
    expect(username()).toHaveValue('lehoa2')
    expect(calls.suggestion).not.toContain('Lê Hoa Mai')
  })

  it.each([
    ['taken', 'Đã có người dùng'],
    ['x y', 'Tên đăng nhập không hợp lệ'],
  ])('shows %j as "%s"', async (value, message) => {
    formApi({ taken: ['taken'] })
    const { container } = await openForm()
    await userEvent.type(username(), value)
    expect(await screen.findByText(message)).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('a stale suggestion answer never overwrites the newer one, nor a username the tutor typed', async () => {
    // The answer for the shorter name arrives last.
    const calls = formApi({ suggestionDelay: (name) => (['Nguyễn Văn', 'Phạm Văn'].includes(name) ? 700 : 0) })
    await openForm()
    await userEvent.type(fullName(), 'Nguyễn Văn')
    await waitFor(() => expect(calls.suggestion).toEqual(['Nguyễn Văn']))
    await userEvent.type(fullName(), ' An')
    await waitFor(() => expect(username()).toHaveValue('nguyenvanan'))
    await new Promise((resolve) => setTimeout(resolve, 800))
    expect(username()).toHaveValue('nguyenvanan')

    await userEvent.clear(fullName())
    await waitFor(() => expect(username()).toHaveValue(''))
    calls.suggestion.length = 0
    await userEvent.type(fullName(), 'Phạm Văn')
    await waitFor(() => expect(calls.suggestion).toEqual(['Phạm Văn']))
    await userEvent.type(username(), 'tu-dat')
    await new Promise((resolve) => setTimeout(resolve, 800))
    expect(username()).toHaveValue('tu-dat')
  })

  it('a stale availability answer never shows for a newer username', async () => {
    server.use(sessionAs('TUTOR'))
    server.use(
      http.get('*/api/v1/tutor/usernames/availability', async ({ request }) => {
        const value = new URL(request.url).searchParams.get('username')!
        if (value === 'taken') await delay(700)
        return HttpResponse.json({
          username: value,
          available: value !== 'taken',
          reason: value === 'taken' ? 'TAKEN' : null,
        })
      }),
    )
    await openForm()
    await userEvent.type(username(), 'taken')
    await new Promise((resolve) => setTimeout(resolve, 400)) // the slow check of "taken" is under way
    await userEvent.type(username(), '2')
    expect(await screen.findByText('Có thể dùng')).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(screen.queryByText('Đã có người dùng')).not.toBeInTheDocument()
    expect(screen.getByText('Có thể dùng')).toBeInTheDocument()
  })
})

describe('Add student: create with the optional sections (AC5)', { timeout: 20_000 }, () => {
  it('sends the contact (email, phone, two handles) and the note', async () => {
    const calls = formApi()
    await openForm()
    await userEvent.type(fullName(), 'Nguyễn Văn An')
    await waitFor(() => expect(username()).toHaveValue('nguyenvanan'))
    await userEvent.click(screen.getByRole('button', { name: 'Liên hệ (không bắt buộc)' }))
    await userEvent.type(field('Email'), 'an@example.com')
    await userEvent.type(field('Điện thoại'), '0901 234 567')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm liên hệ' }))
    expect(field('Tên kênh (bắt buộc)')).toHaveFocus()
    await userEvent.keyboard('Zalo')
    await userEvent.type(field('Đường dẫn hoặc ID'), 'https://zalo.me/0901234567')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm liên hệ' }))
    const second = screen.getByRole('group', { name: 'Liên hệ 2' })
    await userEvent.type(within(second).getByRole('textbox', { name: 'Tên kênh (bắt buộc)' }), 'Facebook')
    await userEvent.type(within(second).getByRole('textbox', { name: 'Đường dẫn hoặc ID' }), 'an.nguyen')
    await userEvent.click(screen.getByRole('button', { name: 'Ghi chú (không bắt buộc)' }))
    await userEvent.type(field('Ghi chú'), 'Dòng một{Enter}Dòng hai')
    await userEvent.click(createButton())
    await screen.findByRole('heading', { level: 2, name: 'Đã tạo học viên' })
    expect(calls.create).toEqual([
      {
        fullName: 'Nguyễn Văn An',
        username: 'nguyenvanan',
        email: 'an@example.com',
        phone: '0901 234 567',
        contactHandles: [
          { label: 'Zalo', value: 'https://zalo.me/0901234567' },
          { label: 'Facebook', value: 'an.nguyen' },
        ],
        note: 'Dòng một\nDòng hai',
      },
    ])
  })

  it('sends a typed password', async () => {
    const calls = formApi()
    await openForm()
    await userEvent.type(fullName(), 'Nguyễn Văn An')
    await waitFor(() => expect(username()).toHaveValue('nguyenvanan'))
    await userEvent.click(screen.getByRole('button', { name: 'Mật khẩu (không bắt buộc)' }))
    expect(screen.getByText(/Để trống thì hệ thống tạo mật khẩu tạm/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Mật khẩu tạm'), 'mot-mat-khau-dai')
    await userEvent.click(createButton())
    await screen.findByRole('heading', { level: 2, name: 'Đã tạo học viên' })
    expect(calls.create[0]).toMatchObject({ password: 'mot-mat-khau-dai' })
  })
})

describe('Add student: errors and double submit (AC6)', { timeout: 20_000 }, () => {
  it('a 409 USERNAME_TAKEN shows the error on Username and focuses it', async () => {
    formApi({
      create: () =>
        problem(409, 'USERNAME_TAKEN', 'req-1', { errors: [{ field: 'username', code: 'USERNAME_TAKEN' }] }),
    })
    await openForm()
    await userEvent.type(fullName(), 'Nguyễn Văn An')
    await waitFor(() => expect(username()).toHaveValue('nguyenvanan'))
    await userEvent.click(createButton())
    await waitFor(() => expect(username()).toHaveFocus())
    expect(username()).toHaveAttribute('aria-invalid', 'true')
    expect(username()).toHaveAccessibleDescription(expect.stringContaining('Tên đăng nhập này đã có người dùng'))
    expect(screen.queryByRole('heading', { level: 2, name: 'Chưa tạo được học viên' })).not.toBeInTheDocument()
  })

  it('422 field errors go to their fields (contact rows by index), unknown ones to the summary, which takes focus', async () => {
    formApi({
      create: () =>
        problem(422, 'VALIDATION_FAILED', 'req-2', {
          errors: [
            { field: 'contactHandles[1].value', code: 'TOO_LONG' },
            { field: 'phone', code: 'INVALID_FORMAT' },
            { field: 'somethingElse', code: 'INVALID_VALUE' },
          ],
        }),
    })
    const { container } = await openForm()
    await userEvent.type(fullName(), 'Nguyễn Văn An')
    await waitFor(() => expect(username()).toHaveValue('nguyenvanan'))
    await userEvent.click(screen.getByRole('button', { name: 'Liên hệ (không bắt buộc)' }))
    for (const label of ['Zalo', 'Facebook']) {
      await userEvent.click(screen.getByRole('button', { name: 'Thêm liên hệ' }))
      await userEvent.keyboard(label)
    }
    await userEvent.type(field('Điện thoại'), '0901 234 567')
    // Collapsed again: the error opens the section.
    await userEvent.click(screen.getByRole('button', { name: 'Liên hệ (không bắt buộc)' }))
    await userEvent.click(createButton())
    const summary = await screen.findByRole('alert', { name: 'Chưa tạo được học viên' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(screen.getByRole('button', { name: 'Liên hệ (không bắt buộc)' })).toHaveAttribute('aria-expanded', 'true')
    const second = screen.getByRole('group', { name: 'Liên hệ 2' })
    expect(within(second).getByRole('textbox', { name: 'Đường dẫn hoặc ID' })).toHaveAttribute('aria-invalid', 'true')
    expect(
      within(screen.getByRole('group', { name: 'Liên hệ 1' })).getByRole('textbox', { name: 'Đường dẫn hoặc ID' }),
    ).not.toHaveAttribute('aria-invalid')
    expect(field('Điện thoại')).toHaveAttribute('aria-invalid', 'true')
    const links = within(summary).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['#student-phone', '#student-handle-1-value'])
    expect(summary).toHaveTextContent('Máy chủ không chấp nhận một giá trị')
    await expectNoAxeViolations(container)
    await userEvent.click(links[1]!)
    expect(within(second).getByRole('textbox', { name: 'Đường dẫn hoặc ID' })).toHaveFocus()
  })

  it('a failed client check shows the summary with focus (and opens the section of the error)', async () => {
    const calls = formApi()
    await openForm()
    await userEvent.click(screen.getByRole('button', { name: 'Ghi chú (không bắt buộc)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Ghi chú (không bắt buộc)' }))
    await userEvent.click(createButton())
    const summary = await screen.findByRole('alert', { name: 'Chưa tạo được học viên' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(
      within(summary)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Hãy nhập họ tên học viên.', 'Hãy nhập tên đăng nhập.'])
    expect(calls.create).toEqual([])
  })

  it('a 500 shows the inline alert and keeps every input', async () => {
    formApi({ create: () => problem(500, 'INTERNAL_ERROR') })
    await openForm()
    await userEvent.type(fullName(), 'Nguyễn Văn An')
    await waitFor(() => expect(username()).toHaveValue('nguyenvanan'))
    await userEvent.click(screen.getByRole('button', { name: 'Liên hệ (không bắt buộc)' }))
    await userEvent.type(field('Email'), 'an@example.com')
    await userEvent.click(createButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tạo được học viên. Thông tin bạn nhập vẫn còn')
    expect(fullName()).toHaveValue('Nguyễn Văn An')
    expect(username()).toHaveValue('nguyenvanan')
    expect(field('Email')).toHaveValue('an@example.com')
  })

  it('a network failure says so and keeps the input', async () => {
    formApi({ create: () => HttpResponse.error() })
    await openForm()
    await userEvent.type(fullName(), 'Nguyễn Văn An')
    await waitFor(() => expect(username()).toHaveValue('nguyenvanan'))
    await userEvent.click(createButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('Không kết nối được máy chủ')
    expect(fullName()).toHaveValue('Nguyễn Văn An')
  })

  it('Create shows "Creating…" and is disabled while pending; a double click sends one request', async () => {
    const calls = formApi({
      create: async (body) => {
        await delay(300)
        return HttpResponse.json(
          { student: student({ fullName: body.fullName }), credentials: CREDENTIALS },
          { status: 201 },
        )
      },
    })
    await openForm()
    await userEvent.type(fullName(), 'Nguyễn Văn An')
    await waitFor(() => expect(username()).toHaveValue('nguyenvanan'))
    await userEvent.dblClick(createButton())
    await waitFor(() => expect(createButton()).toHaveTextContent('Đang tạo…'))
    expect(createButton()).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(createButton())
    await screen.findByRole('heading', { level: 2, name: 'Đã tạo học viên' })
    expect(calls.create).toHaveLength(1)
  })
})

describe('Add student: the unsaved changes guard (AC6)', { timeout: 20_000 }, () => {
  const typeName = async () => {
    await userEvent.type(fullName(), 'Nguyễn')
  }
  const nav = (name: string) =>
    within(screen.getByRole('navigation', { name: 'Điều hướng gia sư' })).getByRole('link', { name })

  it('asks before leaving a dirty form through the navigation: Keep editing stays, Discard leaves', async () => {
    formApi()
    const { router } = await openForm()
    await typeName()
    await userEvent.click(nav('Hôm nay'))
    const dialog = await screen.findByRole('alertdialog', { name: 'Bỏ học viên này?' })
    await expectNoAxeViolations(document.body)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tiếp tục nhập' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(path(router)).toBe('/tutor/students/new')
    expect(fullName()).toHaveValue('Nguyễn')
    await userEvent.click(nav('Hôm nay'))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Bỏ' }))
    await screen.findByRole('heading', { level: 1, name: 'Hôm nay' })
    expect(path(router)).toBe('/tutor/today')
  })

  it('a clean form leaves without asking, and so does Cancel', async () => {
    formApi()
    const { router } = await openForm()
    await userEvent.click(screen.getByRole('link', { name: 'Huỷ' }))
    await screen.findByRole('heading', { level: 1, name: 'Học viên' })
    expect(path(router)).toBe('/tutor/students')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('the home link and "Change password" also ask', async () => {
    formApi()
    const { router } = await openForm()
    await typeName()
    await userEvent.click(screen.getByRole('link', { name: META.displayName }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Tiếp tục nhập' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await openAccountMenu()
    await userEvent.click(screen.getByRole('link', { name: 'Đổi mật khẩu' }))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(path(router)).toBe('/tutor/students/new')
  })

  it('own Log out while dirty lands on /login without a dialog', async () => {
    formApi()
    const { router } = await openForm()
    await typeName()
    await openAccountMenu()
    server.use(sessionAs(null))
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    await waitFor(() => expect(path(router)).toBe('/login'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it("another tab's sign-out while dirty lands on /login without a dialog", async () => {
    formApi()
    const { router } = await openForm()
    await typeName()
    server.use(sessionAs(null))
    const other = new BroadcastChannel(AUTH_CHANNEL)
    other.postMessage({ type: 'signed-out' })
    await waitFor(() => expect(path(router)).toBe('/login'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    other.close()
  })

  it('warns before the tab closes while dirty (beforeunload)', async () => {
    formApi()
    await openForm()
    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)
    await typeName()
    const dirty = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirty)
    expect(dirty.defaultPrevented).toBe(true)
  })
})

describe('Add student: the credentials card (AC7)', { timeout: 20_000 }, () => {
  async function created() {
    formApi()
    const result = await openForm()
    await userEvent.type(fullName(), 'Nguyễn Văn An')
    await waitFor(() => expect(username()).toHaveValue('nguyenvanan'))
    await userEvent.click(createButton())
    const heading = await screen.findByRole('heading', { level: 2, name: 'Đã tạo học viên' })
    return { ...result, heading }
  }

  it('takes focus on its heading and shows the username, password, expiry, login URL and the notice', async () => {
    const { heading, container } = await created()
    await waitFor(() => expect(heading).toHaveFocus())
    const card = heading.closest('section')!
    expect(card).toHaveTextContent('nguyenvanan')
    expect(within(card).getByText(CREDENTIALS.temporaryPassword).tagName).toBe('SPAN')
    const expiry = new Intl.DateTimeFormat('vi', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(CREDENTIALS.expiresAt),
    )
    expect(card).toHaveTextContent(expiry)
    expect(card).toHaveTextContent(`${window.location.origin}/login`)
    expect(card).toHaveTextContent('Mật khẩu này chỉ hiện một lần.')
    expect(container.querySelector('input[type="password"], input[autocomplete]')).toBeNull()
    await expectNoAxeViolations(container)
  })

  it('Copy message puts the localised message on the clipboard and announces "Copied"', async () => {
    const { heading } = await created()
    const user = userEvent.setup()
    const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    const card = heading.closest('section')!
    await user.click(within(card).getByRole('button', { name: 'Sao chép tin nhắn' }))
    const message = write.mock.calls[0]![0]
    for (const value of ['Lớp cô Lan', 'nguyenvanan', CREDENTIALS.temporaryPassword, `${window.location.origin}/login`])
      expect(message).toContain(value)
    expect(message).toContain('tự đặt mật khẩu mới')
    expect(await within(card).findByText('Đã sao chép')).toBeInTheDocument()
    await user.click(within(card).getByRole('button', { name: 'Sao chép mật khẩu' }))
    expect(write).toHaveBeenLastCalledWith(CREDENTIALS.temporaryPassword)
  })

  it('a refused clipboard says how to copy by hand', async () => {
    const { heading } = await created()
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new DOMException('no', 'NotAllowedError'))
    await user.click(within(heading.closest('section')!).getByRole('button', { name: 'Sao chép tin nhắn' }))
    expect(await screen.findByText('Không sao chép được. Hãy chọn đoạn chữ rồi tự sao chép.')).toBeInTheDocument()
  })

  it('keeps the password out of the query cache, storage, history state and the URL; Open workspace, then Back shows an empty form', async () => {
    const { router, queryClient } = await created()
    const secret = CREDENTIALS.temporaryPassword
    await waitFor(() => expect(queryClient.getMutationCache().getAll()).toHaveLength(0))
    const cached = JSON.stringify([
      queryClient
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
      queryClient
        .getMutationCache()
        .getAll()
        .map((m) => m.state),
    ])
    expect(cached).not.toContain(secret)
    expect(JSON.stringify({ ...localStorage })).not.toContain(secret)
    expect(JSON.stringify({ ...sessionStorage })).not.toContain(secret)
    await userEvent.click(screen.getByRole('link', { name: 'Mở không gian học viên' }))
    await screen.findByRole('heading', { level: 1, name: 'Nguyễn Văn An' })
    expect(path(router)).toBe(`/tutor/students/${SID}`)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await act(() => router.navigate(-1))
    await screen.findByRole('heading', { level: 1, name: 'Thêm học viên' })
    expect(fullName()).toHaveValue('')
    expect(screen.queryByText(secret)).not.toBeInTheDocument()
    expect(JSON.stringify(router.state.location)).not.toContain(secret)
    expect(JSON.stringify(window.history.state)).not.toContain(secret)
  })

  it('Add another student shows an empty form with focus on Full name', async () => {
    await created()
    await userEvent.click(screen.getByRole('button', { name: 'Thêm học viên khác' }))
    await waitFor(() => expect(fullName()).toHaveFocus())
    expect(fullName()).toHaveValue('')
    expect(username()).toHaveValue('')
    expect(screen.queryByText(CREDENTIALS.temporaryPassword)).not.toBeInTheDocument()
  })
})
