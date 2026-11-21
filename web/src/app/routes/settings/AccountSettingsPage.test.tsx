import { focusManager, onlineManager } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../../../test/axe'
import { renderRoute } from '../../../test/render'
import { preferencesAs, problem, server, sessionAs, sessionBody } from '../../../test/server'
import { setViewportWidth } from '../../../test/viewport'

const h1 = (name: string) => screen.findByRole('heading', { level: 1, name })
const displayName = () => screen.getByRole('textbox', { name: 'Tên hiển thị' })
const timeZone = () => screen.getByRole('combobox', { name: 'Múi giờ' })
const save = () => screen.getByRole('button', { name: /^(Lưu|Đang lưu…)$/ })

/** The session as saved on the server; a preferences save updates it, as the server does. */
function tutorAccount(initial: Record<string, unknown> = {}) {
  let account: Record<string, unknown> = { ...sessionBody('TUTOR'), ...initial }
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

async function openPage(path = '/tutor/settings/account') {
  const result = renderRoute(path)
  await h1('Cài đặt')
  await screen.findByRole('textbox', { name: 'Tên hiển thị' })
  return result
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

describe('T-M2.6 AC5: Settings in the tutor shell', () => {
  it('the sidebar has Settings; /tutor/settings redirects to the Account tab, both current; the title follows', async () => {
    setViewportWidth(1280)
    tutorAccount()
    const { router, container } = renderRoute('/tutor/settings')
    await h1('Cài đặt')
    await waitFor(() => expect(router.state.location.pathname).toBe('/tutor/settings/account'))
    const nav = screen.getByRole('navigation', { name: 'Điều hướng gia sư' })
    expect(
      within(nav)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Hôm nay', 'Học viên', 'Cài đặt'])
    expect(within(nav).getByRole('link', { name: 'Cài đặt' })).toHaveAttribute('aria-current', 'page')
    const tabs = screen.getByRole('navigation', { name: 'Các mục cài đặt' })
    expect(within(tabs).getByRole('link', { name: 'Tài khoản' })).toHaveAttribute('aria-current', 'page')
    await waitFor(() => expect(document.title).toBe('Cài đặt tài khoản · Eng-LMS'))
    await screen.findByRole('textbox', { name: 'Tên hiển thị' })
    await expectNoAxeViolations(container)
  })

  it('in the drawer below 1024 px: choosing Settings moves focus to the h1', async () => {
    setViewportWidth(360)
    tutorAccount()
    renderRoute('/tutor/today')
    await h1('Hôm nay')
    await userEvent.click(screen.getByRole('button', { name: 'Mở điều hướng' }))
    const drawer = await screen.findByRole('dialog', { name: 'Điều hướng' })
    await userEvent.click(within(drawer).getByRole('link', { name: 'Cài đặt' }))
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Cài đặt' })).toHaveFocus())
  })
})

describe('T-M2.6 AC6: the Account page', () => {
  it('shows the saved values and the language switcher; Save is disabled (focusable) while nothing changed', async () => {
    tutorAccount({ displayName: 'Cô Lan', timeZone: 'Asia/Bangkok' })
    const { container } = await openPage()
    expect(screen.getByRole('radiogroup', { name: 'Ngôn ngữ' })).toBeInTheDocument()
    expect(displayName()).toHaveValue('Cô Lan')
    expect(timeZone()).toHaveValue('Asia/Bangkok')
    expect(save()).toHaveAttribute('aria-disabled', 'true')
    expect(save()).not.toBeDisabled()
    expect(screen.getByRole('link', { name: 'Đổi mật khẩu' })).toHaveAttribute('href', '/change-password')
    await expectNoAxeViolations(container)
  })

  it('a zone the engine does not list (an alias saved elsewhere) shows and is kept', async () => {
    const sent = tutorAccount({ timeZone: 'Asia/Saigon' })
    await openPage()
    expect(timeZone()).toHaveValue('Asia/Saigon')
    await userEvent.type(displayName(), 'Lan')
    await userEvent.click(save())
    await waitFor(() => expect(sent).toEqual([{ displayName: 'Lan' }]))
  })

  it('saves only the changed properties, toasts "Đã lưu", keeps focus on Save and disables it again', async () => {
    const sent = tutorAccount()
    await openPage()
    await userEvent.type(displayName(), '  Cô Lan ')
    expect(save()).not.toHaveAttribute('aria-disabled')
    await userEvent.click(save())
    await waitFor(() => expect(sent).toEqual([{ displayName: 'Cô Lan' }]))
    expect(await screen.findByText('Đã lưu')).toBeInTheDocument()
    await waitFor(() => expect(save()).toHaveAttribute('aria-disabled', 'true'))
    expect(save()).toHaveFocus()
    expect(displayName()).toHaveValue('Cô Lan')
    // The shell shows the new display name (the session cache was replaced).
    expect(screen.getByRole('button', { name: 'Cô Lan' })).toBeInTheDocument()

    // The time zone through the keyboard; only it is sent.
    await userEvent.click(timeZone())
    await userEvent.keyboard('{Control>}a{/Control}bangkok{ArrowDown}{Enter}')
    expect(timeZone()).toHaveValue('Asia/Bangkok')
    await userEvent.click(save())
    await waitFor(() => expect(sent).toEqual([{ displayName: 'Cô Lan' }, { timeZone: 'Asia/Bangkok' }]))

    // Emptying the display name clears it (null); the shell shows the username again.
    await userEvent.clear(displayName())
    await userEvent.click(save())
    await waitFor(() => expect(sent.at(-1)).toEqual({ displayName: null }))
    expect(await screen.findByRole('button', { name: 'co-lan' })).toBeInTheDocument()
  })

  it('a click on the disabled Save, or Enter, sends nothing; a second click while saving sends nothing more', async () => {
    const sent = tutorAccount()
    await openPage()
    await userEvent.click(save())
    await userEvent.type(displayName(), '{Enter}')
    expect(sent).toEqual([])
    let release!: () => void
    server.use(
      http.patch('*/api/v1/auth/preferences', async ({ request }) => {
        sent.push((await request.json()) as Record<string, unknown>)
        await new Promise<void>((resolve) => (release = resolve))
        return HttpResponse.json({ ...sessionBody('TUTOR'), displayName: 'Lan' })
      }),
    )
    await userEvent.type(displayName(), 'Lan')
    await userEvent.click(save())
    await waitFor(() => expect(save()).toHaveTextContent('Đang lưu…'))
    await userEvent.click(save())
    release()
    await screen.findByText('Đã lưu')
    expect(sent).toEqual([{ displayName: 'Lan' }])
  })

  it('a client error (121 characters) shows the summary with focus, and the field error; nothing is sent', async () => {
    const sent = tutorAccount()
    await openPage()
    await userEvent.click(displayName())
    await userEvent.paste('a'.repeat(121))
    await userEvent.click(save())
    const summary = await screen.findByRole('alert', { name: 'Chưa lưu được cài đặt' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(within(summary).getByRole('link', { name: 'Tên hiển thị tối đa 120 ký tự.' })).toHaveAttribute(
      'href',
      '#account-display-name',
    )
    expect(displayName()).toHaveAttribute('aria-invalid', 'true')
    expect(sent).toEqual([])
  })

  it('a 422 shows every field problem in the summary (focused) and on the fields', async () => {
    tutorAccount()
    server.use(
      http.patch('*/api/v1/auth/preferences', () =>
        problem(422, 'VALIDATION_FAILED', 'req-1', {
          errors: [
            { field: 'displayName', code: 'INVALID_FORMAT' },
            { field: 'timeZone', code: 'INVALID_VALUE' },
          ],
        }),
      ),
    )
    const { container } = await openPage()
    await userEvent.type(displayName(), 'Lan')
    await userEvent.click(save())
    const summary = await screen.findByRole('alert', { name: 'Chưa lưu được cài đặt' })
    await waitFor(() => expect(summary).toHaveFocus())
    expect(
      within(summary)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Hãy xoá các ký tự điều khiển khỏi tên hiển thị.', 'Hãy chọn một múi giờ trong danh sách.'])
    expect(timeZone()).toHaveAttribute('aria-invalid', 'true')
    await expectNoAxeViolations(container)
  })

  it.each([
    [500, 'Chưa lưu được cài đặt. Hãy thử lại.'],
    [0, 'Chưa lưu được: có vẻ bạn đang ngoại tuyến. Hãy thử lại khi có mạng.'],
  ])('a failed save (%i) shows an InlineAlert with Try again, never a toast; Try again saves', async (status, text) => {
    const sent = tutorAccount()
    server.use(
      http.patch(
        '*/api/v1/auth/preferences',
        () => (status ? problem(status, 'INTERNAL_ERROR') : HttpResponse.error()),
        { once: true },
      ),
    )
    await openPage()
    await userEvent.type(displayName(), 'Lan')
    await userEvent.click(save())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(text)
    expect(screen.queryByText('Đã lưu')).not.toBeInTheDocument()
    await userEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }))
    await screen.findByText('Đã lưu')
    expect(sent).toEqual([{ displayName: 'Lan' }])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  // AC11 (b) (G3 QA-2): what is typed while the save is pending is kept, still unsaved, and the guard protects it.
  it('text typed while saving stays after the answer, Save stays enabled, and leaving asks first', async () => {
    const sent = tutorAccount()
    let release!: () => void
    server.use(
      http.patch('*/api/v1/auth/preferences', async ({ request }) => {
        sent.push((await request.json()) as Record<string, unknown>)
        await new Promise<void>((resolve) => (release = resolve))
        return HttpResponse.json({ ...sessionBody('TUTOR'), displayName: 'Lan' })
      }),
    )
    const { router } = await openPage()
    await userEvent.type(displayName(), 'Lan')
    await userEvent.click(save())
    await waitFor(() => expect(save()).toHaveTextContent('Đang lưu…'))
    await userEvent.type(displayName(), ' Anh')
    release()
    await screen.findByText('Đã lưu')
    expect(sent).toEqual([{ displayName: 'Lan' }])
    expect(displayName()).toHaveValue('Lan Anh')
    await waitFor(() => expect(save()).toHaveTextContent(/^Lưu$/))
    expect(save()).not.toHaveAttribute('aria-disabled')
    void router.navigate('/tutor/today')
    expect(await screen.findByRole('alertdialog', { name: 'Bỏ các thay đổi?' })).toBeInTheDocument()
  })

  // AC11 (c) (G3 QA-3): offline, the save is sent at once (fails: the network alert) and is never replayed later.
  it('offline: Save shows the network alert at once, and nothing is sent again when the connection returns', async () => {
    const sent = tutorAccount()
    let tried = 0
    server.use(
      http.patch(
        '*/api/v1/auth/preferences',
        () => {
          tried++
          return HttpResponse.error()
        },
        { once: true },
      ),
    )
    const { queryClient } = await openPage()
    await userEvent.type(displayName(), 'Lan')
    onlineManager.setOnline(false)
    try {
      await userEvent.click(save())
      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Chưa lưu được: có vẻ bạn đang ngoại tuyến. Hãy thử lại khi có mạng.')
      expect(tried).toBe(1)
      expect(save()).toHaveTextContent(/^Lưu$/)
      // Nothing waits for the connection (a paused mutation would replay when it returns).
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
    expect(screen.queryByText('Đã lưu')).not.toBeInTheDocument()
  })

  // AC11 (d) (G3 UX-1): the time-zone button and list are named in Vietnamese.
  it('the time-zone button and list have Vietnamese names', async () => {
    tutorAccount()
    await openPage()
    const button = screen.getByRole('button', { name: /^Hiện các múi giờ/ })
    expect(button).toHaveAttribute('aria-label', 'Hiện các múi giờ')
    await userEvent.click(button)
    expect(await screen.findByRole('listbox', { name: /Các múi giờ/ })).toHaveAttribute('aria-label', 'Các múi giờ')
  })

  it('a failed read of the session keeps the cached values under a warning with Try again', async () => {
    tutorAccount({ displayName: 'Cô Lan' })
    const { router } = renderRoute('/tutor/today')
    await h1('Hôm nay')
    server.use(http.get('*/api/v1/auth/session', () => problem(500, 'INTERNAL_ERROR'), { once: true }))
    await router.navigate('/tutor/settings/account')
    expect(await screen.findByText(/Chưa tải được cài đặt tài khoản mới nhất/)).toBeInTheDocument()
    expect(displayName()).toHaveValue('Cô Lan')
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(screen.queryByText(/Chưa tải được/)).not.toBeInTheDocument())
  })

  it("another tab's save, read again on window focus, updates only the fields not being edited", async () => {
    tutorAccount({ timeZone: 'Asia/Bangkok' })
    await openPage()
    await userEvent.type(displayName(), 'Lan đang sửa')
    server.use(
      http.get('*/api/v1/auth/session', () =>
        HttpResponse.json({ ...sessionBody('TUTOR'), displayName: 'Tên khác', timeZone: 'Asia/Tokyo' }),
      ),
    )
    focusManager.setFocused(false)
    focusManager.setFocused(true)
    await waitFor(() => expect(timeZone()).toHaveValue('Asia/Tokyo'))
    expect(displayName()).toHaveValue('Lan đang sửa')
    focusManager.setFocused(undefined)
  })

  it('leaving with changes asks first (the unsaved-changes guard)', async () => {
    tutorAccount()
    const { router } = await openPage()
    await userEvent.type(displayName(), 'Lan')
    void router.navigate('/tutor/today')
    const dialog = await screen.findByRole('alertdialog', { name: 'Bỏ các thay đổi?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tiếp tục sửa' }))
    expect(router.state.location.pathname).toBe('/tutor/settings/account')
    expect(displayName()).toHaveValue('Lan')
  })

  it('in English', async () => {
    localStorage.setItem('englms.locale', 'en')
    const { i18n } = await import('../../../lib/i18n')
    await i18n.changeLanguage('en')
    tutorAccount()
    renderRoute('/tutor/settings/account')
    await h1('Settings')
    expect(await screen.findByRole('textbox', { name: 'Display name' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Time zone' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('navigation', { name: 'Settings sections' })).toHaveTextContent('Account')
  })
})

describe('a student never reaches the tutor settings', () => {
  it('/tutor/settings as a student goes to /forbidden', async () => {
    server.use(sessionAs('STUDENT'), preferencesAs('STUDENT'))
    const { router } = renderRoute('/tutor/settings')
    await waitFor(() => expect(router.state.location.pathname).toBe('/forbidden'))
  })
})
