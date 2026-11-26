import { onlineManager } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../../../test/axe'
import { renderRoute } from '../../../test/render'
import { META, problem, server, sessionAs } from '../../../test/server'
import { setViewportWidth } from '../../../test/viewport'

const h1 = (name: string) => screen.findByRole('heading', { level: 1, name })
const name = () => screen.getByRole('textbox', { name: /^Tên không gian làm việc/ })
const zone = () => screen.getByRole('combobox', { name: 'Múi giờ mặc định' })
const languages = () => screen.getByRole('radiogroup', { name: 'Ngôn ngữ mặc định' })
const save = () => screen.getByRole('button', { name: /^(Lưu|Đang lưu…)$/ })

const SEED = {
  displayName: 'Eng-LMS',
  defaultLocale: 'vi',
  defaultTimeZone: 'Asia/Ho_Chi_Minh',
  version: 0,
  updatedAt: '2026-11-25T00:00:00Z',
}

/** The workspace document as stored; a PATCH applies the sent properties and bumps the version, as the server does. */
function workspace(initial: Record<string, unknown> = {}) {
  let doc: Record<string, unknown> = { ...SEED, ...initial }
  const sent: Record<string, unknown>[] = []
  server.use(
    sessionAs('TUTOR'),
    http.get('*/api/v1/tutor/settings', () => HttpResponse.json(doc)),
    http.patch('*/api/v1/tutor/settings', async ({ request }) => {
      const { version, ...body } = (await request.json()) as Record<string, unknown>
      sent.push({ version, ...body })
      doc = { ...doc, ...body, version: (doc.version as number) + 1 }
      return HttpResponse.json(doc)
    }),
  )
  return {
    sent,
    /** Another tab's save. */
    changeElsewhere: (change: Record<string, unknown>) => {
      doc = { ...doc, ...change, version: (doc.version as number) + 1 }
    },
  }
}

async function openPage(path = '/tutor/settings/workspace') {
  const result = renderRoute(path)
  await h1('Cài đặt')
  await screen.findByRole('textbox', { name: /^Tên không gian làm việc/ })
  return result
}

// jsdom has no layout: React Aria's virtualised list renders every row unless sizes are defined (ui/ComboBox.test).
const sizes = { clientHeight: 440, clientWidth: 320, scrollHeight: 44, scrollWidth: 320 }
beforeEach(() => {
  for (const [key, value] of Object.entries(sizes))
    Object.defineProperty(HTMLElement.prototype, key, { configurable: true, get: () => value })
})
afterEach(() => {
  for (const key of Object.keys(sizes)) delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key]
})

describe('T-M2.35 AC6: the Settings tabs and the redirect', () => {
  it('/tutor/settings redirects to the Workspace tab; tabs Workspace, Account; Workspace current; the title follows', async () => {
    setViewportWidth(1280)
    workspace()
    const { router, container } = renderRoute('/tutor/settings')
    await h1('Cài đặt')
    await waitFor(() => expect(router.state.location.pathname).toBe('/tutor/settings/workspace'))
    const nav = screen.getByRole('navigation', { name: 'Điều hướng gia sư' })
    expect(within(nav).getByRole('link', { name: 'Cài đặt' })).toHaveAttribute('aria-current', 'page')
    const tabs = screen.getByRole('navigation', { name: 'Các mục cài đặt' })
    expect(
      within(tabs)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Không gian làm việc', 'Tài khoản'])
    expect(within(tabs).getByRole('link', { name: 'Không gian làm việc' })).toHaveAttribute('aria-current', 'page')
    expect(within(tabs).getByRole('link', { name: 'Tài khoản' })).not.toHaveAttribute('aria-current')
    await waitFor(() => expect(document.title).toBe('Cài đặt không gian làm việc · Eng-LMS'))
    await screen.findByRole('textbox', { name: /^Tên không gian làm việc/ })
    expect(screen.getByRole('heading', { level: 2, name: 'Không gian làm việc' })).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('the Account tab is one click away; Account becomes current', async () => {
    workspace()
    const { router } = await openPage()
    await userEvent.click(screen.getByRole('link', { name: 'Tài khoản' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/tutor/settings/account'))
    await screen.findByRole('textbox', { name: 'Tên hiển thị' })
  })
})

describe('T-M2.35 AC7: the Workspace form', () => {
  it('loads the values; the language options are the meta locales; Save is disabled (focusable) while unchanged', async () => {
    workspace({ displayName: 'Lớp cô Lan', defaultTimeZone: 'Asia/Saigon' })
    server.use(http.get('*/api/v1/meta', () => HttpResponse.json({ ...META, locales: ['vi', 'en'] })))
    const { container } = await openPage()
    expect(name()).toHaveValue('Lớp cô Lan')
    // An alias the engine may not list is still an option and shows unchanged.
    expect(zone()).toHaveValue('Asia/Saigon')
    expect(
      within(languages())
        .getAllByRole('radio')
        .map((r) => r.getAttribute('lang')),
    ).toEqual(['vi', 'en'])
    expect(within(languages()).getByRole('radio', { name: 'Tiếng Việt' })).toHaveAttribute('aria-checked', 'true')
    expect(within(languages()).getByRole('radio', { name: 'English' })).toBeInTheDocument()
    expect(screen.getByText('Hiện ở trang đăng nhập và trên thanh menu.')).toBeInTheDocument()
    expect(screen.getByText('Áp dụng cho học viên thêm từ nay về sau.')).toBeInTheDocument()
    expect(save()).toHaveAttribute('aria-disabled', 'true')
    expect(save()).not.toBeDisabled()
    await expectNoAxeViolations(container)
  })

  it('shows a skeleton while loading, and an error with Try again when the read fails', async () => {
    workspace()
    let failing = true
    server.use(http.get('*/api/v1/tutor/settings', () => (failing ? problem(500, 'INTERNAL_ERROR') : undefined)))
    renderRoute('/tutor/settings/workspace')
    expect(await screen.findByRole('status', { name: 'Đang tải cài đặt không gian làm việc' })).toHaveAttribute(
      'aria-busy',
      'true',
    )
    const alert = await screen.findByText('Chưa tải được cài đặt không gian làm việc.', {}, { timeout: 10_000 })
    failing = false
    await userEvent.click(within(alert.closest('[role]')!).getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('textbox', { name: /^Tên không gian làm việc/ })).toHaveValue('Eng-LMS')
  })

  it('sends version and only the changed properties; toast, focus stays on Save; the shell name updates; meta keeps the rest', async () => {
    const { sent } = workspace()
    const { queryClient } = await openPage()
    await userEvent.clear(name())
    await userEvent.type(name(), '  Lớp tiếng Anh cô Lan ')
    expect(save()).not.toHaveAttribute('aria-disabled')
    await userEvent.click(save())
    await waitFor(() => expect(sent).toEqual([{ version: 0, displayName: 'Lớp tiếng Anh cô Lan' }]))
    expect(await screen.findByText('Đã lưu')).toBeInTheDocument()
    await waitFor(() => expect(save()).toHaveAttribute('aria-disabled', 'true'))
    expect(save()).toHaveFocus()
    expect(queryClient.getQueryData(['settings', 'meta'])).toEqual({ ...META, displayName: 'Lớp tiếng Anh cô Lan' })
    // The shell shows the new name without a reload.
    expect(screen.getByText('Lớp tiếng Anh cô Lan', { selector: 'span' })).toBeVisible()

    // The defaults: the next save carries the new version and only them.
    await userEvent.click(within(languages()).getByRole('radio', { name: 'English' }))
    await userEvent.click(zone())
    await userEvent.keyboard('{Control>}a{/Control}bangkok{ArrowDown}{Enter}')
    expect(zone()).toHaveValue('Asia/Bangkok')
    await userEvent.click(save())
    await waitFor(() =>
      expect(sent.at(-1)).toEqual({ version: 1, defaultLocale: 'en', defaultTimeZone: 'Asia/Bangkok' }),
    )
    // The UI language itself does not change (only the default for new students).
    expect(screen.getByRole('heading', { level: 1, name: 'Cài đặt' })).toBeInTheDocument()
  })

  it('a click on the disabled Save, or Enter, sends nothing; a second click while saving sends nothing more', async () => {
    const { sent } = workspace()
    await openPage()
    await userEvent.click(save())
    await userEvent.type(name(), '{Enter}')
    expect(sent).toEqual([])
    let release!: () => void
    server.use(
      http.patch('*/api/v1/tutor/settings', async ({ request }) => {
        sent.push((await request.json()) as Record<string, unknown>)
        await new Promise<void>((resolve) => (release = resolve))
        return HttpResponse.json({ ...SEED, displayName: 'Eng-LMS 2', version: 1 })
      }),
    )
    await userEvent.type(name(), ' 2')
    await userEvent.click(save())
    await waitFor(() => expect(save()).toHaveTextContent('Đang lưu…'))
    await userEvent.click(save())
    release()
    await screen.findByText('Đã lưu')
    expect(sent).toEqual([{ version: 0, displayName: 'Eng-LMS 2' }])
  })

  it.each([
    ['', 'Hãy nhập tên không gian làm việc.'],
    ['a'.repeat(121), 'Tên không gian làm việc tối đa 120 ký tự.'],
    ['Lớp\u202Ecô Lan', 'Tên này chứa ký tự ẩn hoặc ký tự điều khiển (U+202E). Hãy xoá ký tự đó và gõ lại tên.'],
    ['Lớp\u200Bcô Lan', 'Tên này chứa ký tự ẩn hoặc ký tự điều khiển (U+200B). Hãy xoá ký tự đó và gõ lại tên.'],
    ['Lớp\tcô Lan', 'Tên này chứa ký tự ẩn hoặc ký tự điều khiển (U+0009). Hãy xoá ký tự đó và gõ lại tên.'],
    ['Lớp\u2028cô Lan', 'Tên này chứa ký tự ẩn hoặc ký tự điều khiển (U+2028). Hãy xoá ký tự đó và gõ lại tên.'],
  ])('a client error (%j) shows the summary with focus and the field error; nothing is sent', async (value, text) => {
    const { sent } = workspace()
    await openPage()
    await userEvent.clear(name())
    if (value) {
      await userEvent.click(name())
      await userEvent.paste(value)
    }
    await userEvent.click(save())
    const summary = await screen.findByRole('alert', { name: 'Chưa lưu được cài đặt' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(within(summary).getByRole('link', { name: text })).toHaveAttribute('href', '#workspace-display-name')
    expect(name()).toHaveAttribute('aria-invalid', 'true')
    expect(name()).toHaveAccessibleDescription(expect.stringContaining(text))
    expect(sent).toEqual([])
  })

  // T-M2.33 scope 8: a stored name saved before the rule does not block a defaults-only save; editing it applies the rule.
  it('a stored name with U+2028: a locale-only save succeeds; an edit of the name is refused', async () => {
    const { sent } = workspace({ displayName: 'Lớp\u2028Lan' })
    await openPage()
    await userEvent.click(within(languages()).getByRole('radio', { name: 'English' }))
    await userEvent.click(save())
    await waitFor(() => expect(sent).toEqual([{ version: 0, defaultLocale: 'en' }]))
    expect(name()).not.toHaveAttribute('aria-invalid')
    await userEvent.type(name(), '!')
    await userEvent.click(save())
    const summary = await screen.findByRole('alert', { name: 'Chưa lưu được cài đặt' })
    expect(
      within(summary).getByRole('link', {
        name: 'Tên này chứa ký tự ẩn hoặc ký tự điều khiển (U+2028). Hãy xoá ký tự đó và gõ lại tên.',
      }),
    ).toBeInTheDocument()
    expect(sent).toHaveLength(1)
  })

  it('120 characters with Vietnamese diacritics are accepted', async () => {
    const { sent } = workspace()
    await openPage()
    const long = 'Lớp cô Lành '.repeat(10)
    await userEvent.clear(name())
    await userEvent.click(name())
    await userEvent.paste(long)
    await userEvent.click(save())
    await waitFor(() => expect(sent).toEqual([{ version: 0, displayName: long.trim() }]))
  })

  it('a 422 shows each field problem in the summary (focused) and on the fields; an unknown one as the generic line', async () => {
    workspace()
    server.use(
      http.patch('*/api/v1/tutor/settings', () =>
        problem(422, 'VALIDATION_FAILED', 'req-1', {
          errors: [
            { field: 'displayName', code: 'INVALID_FORMAT' },
            { field: 'defaultTimeZone', code: 'INVALID_VALUE' },
            { field: 'defaultLocale', code: 'INVALID_VALUE' },
          ],
        }),
      ),
    )
    const { container } = await openPage()
    await userEvent.type(name(), ' 2')
    await userEvent.click(save())
    const summary = await screen.findByRole('alert', { name: 'Chưa lưu được cài đặt' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(
      within(summary)
        .getAllByRole('listitem')
        .map((l) => l.textContent),
    ).toEqual([
      // A server-only refusal (the name passes the client rule): the generic message, no code point.
      'Tên này chứa ký tự ẩn hoặc ký tự điều khiển. Hãy xoá ký tự đó và gõ lại tên.',
      'Hãy chọn một múi giờ trong danh sách.',
      'Có giá trị không được chấp nhận. Hãy kiểm tra biểu mẫu rồi thử lại.',
    ])
    expect(name()).toHaveAttribute('aria-invalid', 'true')
    expect(zone()).toHaveAttribute('aria-invalid', 'true')
    await expectNoAxeViolations(container)
  })

  it('a 409 after a direct load opens the translated conflict dialog; Keep editing returns to the last field', async () => {
    const { sent, changeElsewhere } = workspace()
    await openPage()
    changeElsewhere({ displayName: 'Tên ở tab khác' })
    server.use(
      http.patch('*/api/v1/tutor/settings', async ({ request }) => {
        sent.push((await request.json()) as Record<string, unknown>)
        return problem(409, 'STALE_VERSION')
      }),
    )
    await userEvent.type(name(), ' 2')
    await userEvent.click(save())
    const dialog = await screen.findByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })
    expect(dialog).toHaveTextContent('Cài đặt không gian làm việc vừa được thay đổi ở một tab hoặc cửa sổ khác.')
    expect(within(dialog).getByRole('button', { name: 'Tải lại' })).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tiếp tục sửa' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await waitFor(() => expect(name()).toHaveFocus())
    expect(name()).toHaveValue('Eng-LMS 2')
    expect(sent).toEqual([{ version: 0, displayName: 'Eng-LMS 2' }])
  })

  it('Reload in the conflict dialog shows the stored values and the new version; focus on Save', async () => {
    const { sent, changeElsewhere } = workspace()
    await openPage()
    changeElsewhere({ displayName: 'Tên ở tab khác' })
    server.use(http.patch('*/api/v1/tutor/settings', () => problem(409, 'STALE_VERSION'), { once: true }))
    await userEvent.type(name(), ' 2')
    await userEvent.click(save())
    const dialog = await screen.findByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tải lại' }))
    await waitFor(() => expect(name()).toHaveValue('Tên ở tab khác'))
    await waitFor(() => expect(save()).toHaveFocus())
    expect(save()).toHaveAttribute('aria-disabled', 'true')
    await userEvent.type(name(), '!')
    await userEvent.click(save())
    await waitFor(() => expect(sent).toEqual([{ version: 1, displayName: 'Tên ở tab khác!' }]))
  })

  it.each([
    [500, 'Chưa lưu được cài đặt. Hãy thử lại.'],
    [0, 'Chưa lưu được: có vẻ bạn đang ngoại tuyến. Hãy thử lại khi có mạng.'],
  ])('a failed save (%i) shows an InlineAlert with Try again, never a toast; Try again saves', async (status, text) => {
    const { sent } = workspace()
    server.use(
      http.patch('*/api/v1/tutor/settings', () => (status ? problem(status, 'INTERNAL_ERROR') : HttpResponse.error()), {
        once: true,
      }),
    )
    await openPage()
    await userEvent.type(name(), ' 2')
    await userEvent.click(save())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(text)
    expect(screen.queryByText('Đã lưu')).not.toBeInTheDocument()
    await userEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }))
    await screen.findByText('Đã lưu')
    expect(sent).toEqual([{ version: 0, displayName: 'Eng-LMS 2' }])
  })

  it('offline: Save shows the network alert at once, and nothing is replayed when the connection returns', async () => {
    const { sent } = workspace()
    let tried = 0
    server.use(
      http.patch(
        '*/api/v1/tutor/settings',
        () => {
          tried++
          return HttpResponse.error()
        },
        { once: true },
      ),
    )
    const { queryClient } = await openPage()
    await userEvent.type(name(), ' 2')
    onlineManager.setOnline(false)
    try {
      await userEvent.click(save())
      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Chưa lưu được: có vẻ bạn đang ngoại tuyến.')
      expect(tried).toBe(1)
      expect(
        queryClient
          .getMutationCache()
          .getAll()
          .filter((m) => m.state.isPaused),
      ).toEqual([])
    } finally {
      onlineManager.setOnline(true)
    }
    expect(sent).toEqual([])
  })

  it('text typed while saving stays after the answer, Save stays enabled, and leaving asks first', async () => {
    const { sent } = workspace()
    let release!: () => void
    server.use(
      http.patch('*/api/v1/tutor/settings', async ({ request }) => {
        sent.push((await request.json()) as Record<string, unknown>)
        await new Promise<void>((resolve) => (release = resolve))
        return HttpResponse.json({ ...SEED, displayName: 'Eng-LMS 2', version: 1 })
      }),
    )
    const { router } = await openPage()
    await userEvent.type(name(), ' 2')
    await userEvent.click(save())
    await waitFor(() => expect(save()).toHaveTextContent('Đang lưu…'))
    await userEvent.type(name(), ' mới')
    release()
    await screen.findByText('Đã lưu')
    expect(name()).toHaveValue('Eng-LMS 2 mới')
    await waitFor(() => expect(save()).toHaveTextContent(/^Lưu$/))
    expect(save()).not.toHaveAttribute('aria-disabled')
    void router.navigate('/tutor/today')
    const dialog = await screen.findByRole('alertdialog', { name: 'Bỏ các thay đổi?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tiếp tục sửa' }))
    expect(router.state.location.pathname).toBe('/tutor/settings/workspace')
  })

  it('in English', async () => {
    localStorage.setItem('englms.locale', 'en')
    const { i18n } = await import('../../../lib/i18n')
    await i18n.changeLanguage('en')
    workspace()
    renderRoute('/tutor/settings/workspace')
    await h1('Settings')
    expect(await screen.findByRole('textbox', { name: 'Workspace name (required)' })).toHaveValue('Eng-LMS')
    expect(screen.getByRole('radiogroup', { name: 'Default language' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Default time zone' })).toBeInTheDocument()
    expect(screen.getByText('Applies to students you add from now on.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-disabled', 'true')
    expect(
      within(screen.getByRole('navigation', { name: 'Settings sections' }))
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Workspace', 'Account'])
    await waitFor(() => expect(document.title).toBe('Workspace settings · Eng-LMS'))

    // T-M2.33 AC5: the client rule names the code point in English too.
    const field = screen.getByRole('textbox', { name: 'Workspace name (required)' })
    await userEvent.click(field)
    await userEvent.paste('\u200B')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    const summary = await screen.findByRole('alert', { name: 'Your settings were not saved' })
    expect(
      within(summary).getByRole('link', {
        name: 'This name contains an invisible or control character (U+200B). Delete it and type the name again.',
      }),
    ).toBeInTheDocument()
    expect(field).toHaveAccessibleDescription(
      expect.stringContaining(
        'This name contains an invisible or control character (U+200B). Delete it and type the name again.',
      ),
    )
  })
})

// T-M2.7: the time-zone strings it shares with the account form come from the `account` namespace (moved out of `settings`).
describe('T-M2.7: the default time zone keeps its shared strings', () => {
  it('the hint, the button and the list are named in Vietnamese', async () => {
    workspace()
    await openPage()
    expect(zone()).toHaveAccessibleDescription(expect.stringContaining('Gõ tên thành phố hoặc khu vực để tìm.'))
    const button = screen.getByRole('button', { name: /^Hiện các múi giờ/ })
    expect(button).toHaveAttribute('aria-label', 'Hiện các múi giờ')
    await userEvent.click(button)
    expect(await screen.findByRole('listbox', { name: /Các múi giờ/ })).toHaveAttribute('aria-label', 'Các múi giờ')
  })
})
