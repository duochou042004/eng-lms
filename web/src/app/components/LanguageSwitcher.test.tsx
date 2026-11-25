import { onlineManager } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { i18n, LOCALE_STORAGE_KEY } from '../../lib/i18n'
import { renderRoute } from '../../test/render'
import { problem, server, sessionAs, sessionBody, setXsrfCookie } from '../../test/server'
import { openAccountMenu } from '../../test/shell'

function recordPreferences(answer: () => Response | Promise<Response> = () => HttpResponse.json(sessionBody('TUTOR'))) {
  const sent: unknown[] = []
  server.use(
    http.patch('*/api/v1/auth/preferences', async ({ request }) => {
      sent.push(await request.json())
      return answer()
    }),
  )
  return sent
}

const english = (scope: HTMLElement) => within(scope).getByRole('radio', { name: 'English' })

/**
 * Holds each PATCH on arrival (in arrival order) until `release(i)`; then the server stores its locale, as the real one
 * does, or answers 500 (`'fail'`).
 */
function heldPreferences() {
  const sent: Record<string, unknown>[] = []
  const releases: Array<(outcome: 'ok' | 'fail') => void> = []
  let stored: unknown = 'vi'
  server.use(
    http.patch('*/api/v1/auth/preferences', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      sent.push(body)
      const outcome = await new Promise<'ok' | 'fail'>((resolve) => releases.push(resolve))
      if (outcome === 'fail') return problem(500, 'INTERNAL_ERROR')
      if (body.locale) stored = body.locale
      return HttpResponse.json({ ...sessionBody('TUTOR'), ...body })
    }),
  )
  return {
    sent,
    stored: () => stored,
    release: async (i: number, outcome: 'ok' | 'fail' = 'ok') => {
      await waitFor(() => expect(releases[i]).toBeDefined())
      releases[i]!(outcome)
    },
  }
}

/** Nothing more is sent for a while (the queue holds the next PATCH). */
async function expectStillSent(sent: unknown[], count: number) {
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(sent).toHaveLength(count)
}

const vietnamese = (scope: HTMLElement) => within(scope).getByRole('radio', { name: 'Tiếng Việt' })

// T-M2.6 scope 7, AC8, DEC-190 (3): the device choice is the UI's source; a signed-in switch also saves the account's.
describe('LanguageSwitcher and the account locale', () => {
  it('signed in: a switch changes the device language and sends PATCH {locale}', async () => {
    server.use(sessionAs('TUTOR'))
    const sent = recordPreferences(() => HttpResponse.json({ ...sessionBody('TUTOR'), locale: 'en' }))
    renderRoute('/tutor/today')
    await screen.findByRole('heading', { level: 1, name: 'Hôm nay' })
    await userEvent.click(english(await openAccountMenu()))
    // The popover is modal: the page under it is hidden from the accessibility tree.
    await screen.findByRole('heading', { level: 1, name: 'Today', hidden: true })
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    await waitFor(() => expect(sent).toEqual([{ locale: 'en' }]))
  })

  it('a failed save keeps the device language and shows nothing (never console.error)', async () => {
    const consoleError = vi.spyOn(console, 'error')
    server.use(sessionAs('TUTOR'))
    const sent = recordPreferences(() => problem(500, 'INTERNAL_ERROR'))
    renderRoute('/tutor/today')
    await screen.findByRole('heading', { level: 1, name: 'Hôm nay' })
    await userEvent.click(english(await openAccountMenu()))
    await waitFor(() => expect(sent).toHaveLength(1))
    await screen.findByRole('heading', { level: 1, name: 'Today', hidden: true })
    expect(i18n.language).toBe('en')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(consoleError).not.toHaveBeenCalled()
  })

  // AC11 (c): offline the save is tried at once and fails quietly; it is never replayed when the connection returns.
  it('offline: the switch tries the save once, shows nothing, and does not send it again once online', async () => {
    const consoleError = vi.spyOn(console, 'error')
    server.use(sessionAs('TUTOR'))
    const sent = recordPreferences(() => HttpResponse.error())
    const { queryClient } = renderRoute('/tutor/today')
    await screen.findByRole('heading', { level: 1, name: 'Hôm nay' })
    const menu = await openAccountMenu()
    onlineManager.setOnline(false)
    try {
      await userEvent.click(english(menu))
      await waitFor(() => expect(sent).toHaveLength(1))
      // Nothing waits for the connection (a paused mutation would replay when it returns).
      await waitFor(() =>
        expect(
          queryClient
            .getMutationCache()
            .getAll()
            .filter((m) => m.state.status === 'pending'),
        ).toEqual([]),
      )
      expect(
        queryClient
          .getMutationCache()
          .getAll()
          .filter((m) => m.state.isPaused),
      ).toEqual([])
    } finally {
      onlineManager.setOnline(true)
    }
    await screen.findByRole('heading', { level: 1, name: 'Today', hidden: true })
    expect(sent).toHaveLength(1)
    expect(i18n.language).toBe('en')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('on the forced change-password page (must change) it sends nothing; anonymous on /login neither', async () => {
    server.use(sessionAs('TUTOR', true))
    const sent = recordPreferences()
    const first = renderRoute('/change-password')
    await screen.findByRole('heading', { level: 1, name: 'Đổi mật khẩu' })
    await userEvent.click(english(document.body))
    await screen.findByRole('heading', { level: 1, name: 'Change password' })
    first.unmount()
    server.use(sessionAs(null))
    renderRoute('/login')
    await screen.findByRole('heading', { level: 1 })
    await userEvent.click(within(document.body).getByRole('radio', { name: 'Tiếng Việt' }))
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })
    expect(sent).toEqual([])
  })

  it('a device without a stored choice takes the session locale (and stores it)', async () => {
    server.use(
      http.get('*/api/v1/auth/session', () => {
        setXsrfCookie()
        return HttpResponse.json({ ...sessionBody('STUDENT'), locale: 'en' })
      }),
    )
    renderRoute('/student/home')
    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
  })

  it('a stored choice is never overridden by the session', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'vi')
    server.use(
      http.get('*/api/v1/auth/session', () => {
        setXsrfCookie()
        return HttpResponse.json({ ...sessionBody('STUDENT'), locale: 'en' })
      }),
    )
    renderRoute('/student/home')
    expect(await screen.findByRole('heading', { level: 1, name: 'Trang chủ' })).toBeInTheDocument()
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('vi')
  })
})

// T-M2.32 (e), AC4, Domain rules: the switcher's locale PATCHes run one at a time in click order (mutation scope
// `account-locale`), across every mounted switcher; a failure does not stop the next one; the display-name save is not queued.
describe('LanguageSwitcher: locale saves in click order', () => {
  it('two switches with the first answer late: the second is sent after the first settles; the last choice is stored', async () => {
    server.use(sessionAs('TUTOR'))
    const held = heldPreferences()
    renderRoute('/tutor/today')
    await screen.findByRole('heading', { level: 1, name: 'Hôm nay' })
    const menu = await openAccountMenu()
    await userEvent.click(english(menu))
    await waitFor(() => expect(held.sent).toEqual([{ locale: 'en' }]))
    await userEvent.click(vietnamese(menu))
    expect(i18n.language).toBe('vi')
    await expectStillSent(held.sent, 1)
    await held.release(0)
    await waitFor(() => expect(held.sent).toEqual([{ locale: 'en' }, { locale: 'vi' }]))
    await held.release(1)
    await waitFor(() => expect(held.stored()).toBe('vi'))
    expect(i18n.language).toBe('vi')
  })

  it('the same across the two switchers of Settings › Account', async () => {
    server.use(sessionAs('TUTOR'))
    const held = heldPreferences()
    renderRoute('/tutor/settings/account')
    await screen.findByRole('textbox', { name: 'Tên hiển thị' })
    await userEvent.click(english(document.body))
    await waitFor(() => expect(held.sent).toEqual([{ locale: 'en' }]))
    await userEvent.click(vietnamese(await openAccountMenu()))
    await expectStillSent(held.sent, 1)
    await held.release(0)
    await waitFor(() => expect(held.sent).toEqual([{ locale: 'en' }, { locale: 'vi' }]))
    await held.release(1)
    await waitFor(() => expect(held.stored()).toBe('vi'))
  })

  it('a failed first PATCH does not stop the second', async () => {
    const consoleError = vi.spyOn(console, 'error')
    server.use(sessionAs('TUTOR'))
    const held = heldPreferences()
    renderRoute('/tutor/today')
    await screen.findByRole('heading', { level: 1, name: 'Hôm nay' })
    const menu = await openAccountMenu()
    await userEvent.click(english(menu))
    await userEvent.click(vietnamese(menu))
    await expectStillSent(held.sent, 1)
    await held.release(0, 'fail')
    await waitFor(() => expect(held.sent).toEqual([{ locale: 'en' }, { locale: 'vi' }]))
    await held.release(1)
    await waitFor(() => expect(held.stored()).toBe('vi'))
    expect(i18n.language).toBe('vi')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('a display-name save is not queued behind a pending locale save', async () => {
    server.use(sessionAs('TUTOR'))
    const held = heldPreferences()
    renderRoute('/tutor/settings/account')
    const name = await screen.findByRole('textbox', { name: 'Tên hiển thị' })
    await userEvent.click(english(document.body))
    await waitFor(() => expect(held.sent).toEqual([{ locale: 'en' }]))
    await userEvent.type(name, 'Lan')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(held.sent).toEqual([{ locale: 'en' }, { displayName: 'Lan' }]))
    await held.release(1)
    await held.release(0)
    await waitFor(() => expect(held.stored()).toBe('en'))
  })
})
