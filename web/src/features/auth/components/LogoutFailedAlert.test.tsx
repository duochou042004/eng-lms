import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { renderRoute } from '../../../test/render'
import { problem, server, sessionAs, setXsrfCookie } from '../../../test/server'

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
})
