import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { Button, ButtonLink } from './Button'

describe('ButtonLink', () => {
  it('is a link (navigates, keyboard Enter) in the same visual kind as a Button of its variant', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '*',
          element: (
            <>
              <ButtonLink variant="secondary" to="/change-password">
                Đổi mật khẩu
              </ButtonLink>
              <Button variant="secondary">Đăng xuất</Button>
            </>
          ),
        },
      ],
      { initialEntries: ['/tutor/today'] },
    )
    const { container } = render(<RouterProvider router={router} />)
    const link = screen.getByRole('link', { name: 'Đổi mật khẩu' })
    const button = screen.getByRole('button', { name: 'Đăng xuất' })
    expect(link).toHaveAttribute('href', '/change-password')
    // Same classes for the box and the variant: the same look (hover, active and focus-visible via CSS on the link).
    for (const name of ['button', 'secondary', 'md']) {
      expect(link).toHaveClass(name)
      expect(button).toHaveClass(name)
    }
    expect(link).toHaveClass('link')
    await expectNoAxeViolations(container)
    await userEvent.tab()
    expect(link).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/change-password'))
  })
})
