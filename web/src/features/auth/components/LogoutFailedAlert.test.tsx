import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { renderRoute, renderWithProviders } from '../../../test/render'
import { problem, server, sessionAs, setXsrfCookie } from '../../../test/server'
import { LogoutFailedAlert } from './LogoutFailedAlert'

// T-M2.29 (h2), DEC-172 UX-2: on the forced change-password page at 360×740 the alert rendered below the fold. It
// scrolls itself into view on mount (`nearest`: no scroll where it is already visible) and never takes focus.
describe('LogoutFailedAlert', () => {
  it('scrolls itself into view ({ block: "nearest" }) on mount; focus stays on Log out', async () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    try {
      setXsrfCookie()
      server.use(
        sessionAs('STUDENT', true),
        http.post('*/api/v1/auth/logout', () => problem(500, 'INTERNAL_ERROR')),
      )
      renderRoute('/change-password')
      await screen.findByRole('heading', { level: 1, name: 'Đổi mật khẩu' })
      const logout = screen.getByRole('button', { name: 'Đăng xuất' })
      await userEvent.click(logout)
      const alert = await screen.findByRole('alert')
      expect(scroll).toHaveBeenCalledWith({ block: 'nearest' })
      const scrolled = scroll.mock.contexts as Element[]
      expect(scrolled.some((el) => el.contains(alert))).toBe(true)
      expect(logout).toHaveFocus()
    } finally {
      delete (Element.prototype as Partial<Element>).scrollIntoView
    }
  })

  // T-M2.31 (c), DEC-182: Chromium 158's scrollIntoView returns a Promise. An effect arrow that returns it hands React a
  // cleanup that is not a function, which throws on unmount (the route error page). StrictMode (renderWithProviders) replays
  // the effect on mount, so the mount already unmounts it once.
  it('survives a scrollIntoView that returns a Promise (Chromium 158): mount and unmount without an error', () => {
    const scroll = vi.fn(() => Promise.resolve())
    Element.prototype.scrollIntoView = scroll as unknown as Element['scrollIntoView']
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { unmount } = renderWithProviders(<LogoutFailedAlert />)
      expect(screen.getByRole('alert')).toHaveTextContent('Chưa đăng xuất được')
      expect(scroll).toHaveBeenCalledWith({ block: 'nearest' })
      expect(() => unmount()).not.toThrow()
      expect(consoleError).not.toHaveBeenCalled()
    } finally {
      consoleError.mockRestore()
      delete (Element.prototype as Partial<Element>).scrollIntoView
    }
  })
})
