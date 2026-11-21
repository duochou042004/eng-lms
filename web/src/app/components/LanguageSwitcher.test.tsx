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
