import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { changeLocale, i18n } from '../lib/i18n'
import { renderRoute } from '../test/render'
import { server, sessionAs } from '../test/server'
import { openAccountMenu } from '../test/shell'

// T-M1.9 AC1: focus moves to the new page's h1 after a client-side navigation, never on a first load (the helper renders
// under <StrictMode>, so the effect replay on mount is covered); document.title is "<page title> · Eng-LMS".
// T-M2.4: the anonymous start page is /login (no landing page); the shells need a session, so the client-side
// navigations start from a shell and use its header link to the password page (T-M2.11: in the account menu).

const h1 = (name: string) => screen.findByRole('heading', { level: 1, name })

describe('route focus and document titles', () => {
  it('keeps focus on body on a first load and sets the title', async () => {
    renderRoute('/')
    await h1('Đăng nhập')
    await waitFor(() => expect(document.title).toBe('Đăng nhập · Eng-LMS')) // the page's effects have run
    expect(document.activeElement).toBe(document.body)
  })

  it('moves focus to the h1 of a lazy route after a link navigation (tutor → change password)', async () => {
    server.use(sessionAs('TUTOR'))
    renderRoute('/tutor')
    await h1('Không gian gia sư')
    await openAccountMenu()
    await userEvent.click(screen.getByRole('link', { name: 'Đổi mật khẩu' }))
    const heading = await h1('Đổi mật khẩu')
    await waitFor(() => expect(heading).toHaveFocus())
    expect(heading).toHaveAttribute('tabindex', '-1')
    await waitFor(() => expect(document.title).toBe('Đổi mật khẩu · Eng-LMS'))
  })

  it('moves focus after student → change password, → 404 and browser back', async () => {
    server.use(sessionAs('STUDENT'))
    const { router } = renderRoute('/student')
    await h1('Trang của học viên')
    await openAccountMenu('STUDENT')
    await userEvent.click(screen.getByRole('link', { name: 'Đổi mật khẩu' }))
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Đổi mật khẩu' })).toHaveFocus())
    await waitFor(() => expect(document.title).toBe('Đổi mật khẩu · Eng-LMS'))

    await act(() => router.navigate('/khong-co'))
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Không tìm thấy trang' })).toHaveFocus())
    await waitFor(() => expect(document.title).toBe('Không tìm thấy trang · Eng-LMS'))

    await act(() => router.navigate(-1))
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Đổi mật khẩu' })).toHaveFocus())
    await act(() => router.navigate(-1))
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Trang của học viên' })).toHaveFocus())
    await waitFor(() => expect(document.title).toBe('Trang của học viên · Eng-LMS'))
  })

  it('keeps focus on body after a reload of a page first reached by client navigation; the skip link is the first Tab stop', async () => {
    // A reload starts a fresh app with the history stack kept (the current entry is /tutor, reached from /login).
    server.use(sessionAs('TUTOR'))
    renderRoute(['/login', '/tutor'], 1)
    await h1('Không gian gia sư')
    await waitFor(() => expect(document.title).toBe('Không gian gia sư · Eng-LMS'))
    expect(document.activeElement).toBe(document.body)
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Chuyển đến nội dung chính' })).toHaveFocus()
  })

  it('does not move focus on a hash-only change (the skip link target)', async () => {
    server.use(sessionAs('TUTOR'))
    const { router } = renderRoute('/tutor')
    await h1('Không gian gia sư')
    await act(() => router.navigate('/tutor/today#main')) // T-M2.11: /tutor is /tutor/today
    expect(document.activeElement).toBe(document.body)
  })

  it('updates the title on a language change without a navigation, and titles English pages', async () => {
    server.use(sessionAs('TUTOR'))
    renderRoute('/tutor')
    await h1('Không gian gia sư')
    await act(() => changeLocale('en'))
    await waitFor(() => expect(document.title).toBe('Tutor workspace · Eng-LMS'))
    expect(document.activeElement).toBe(document.body)
    expect(i18n.language).toBe('en')
  })

  it('titles the 404 page on a first load in English', async () => {
    await changeLocale('en')
    renderRoute('/does-not-exist')
    await h1('Page not found')
    await waitFor(() => expect(document.title).toBe('Page not found · Eng-LMS'))
    expect(document.activeElement).toBe(document.body)
  })
})
