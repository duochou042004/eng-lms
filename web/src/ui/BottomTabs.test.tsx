import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Ellipsis, House } from 'lucide-react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { BottomTabs } from './BottomTabs'

function renderTabs(onPress = vi.fn(), isExpanded = false) {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <BottomTabs
            label="Điều hướng học viên"
            items={[{ id: 'home', label: 'Trang chủ', icon: <House />, to: '/student/home' }]}
            action={{ label: 'Thêm', icon: <Ellipsis />, onPress, isExpanded }}
          />
        ),
      },
    ],
    { initialEntries: ['/student/home'] },
  )
  return { router, onPress, ...render(<RouterProvider router={router} />) }
}

describe('BottomTabs', () => {
  it('is a labelled nav with link tabs and an action tab, labels always visible; the current tab is marked', async () => {
    const { container } = renderTabs()
    const nav = screen.getByRole('navigation', { name: 'Điều hướng học viên' })
    expect(nav).toHaveAttribute('data-bottom-tabs')
    const home = screen.getByRole('link', { name: 'Trang chủ' })
    expect(home).toHaveAttribute('aria-current', 'page')
    expect(home).toHaveTextContent('Trang chủ')
    const more = screen.getByRole('button', { name: 'Thêm' })
    expect(more).toHaveTextContent('Thêm')
    expect(more).toHaveAttribute('aria-haspopup', 'dialog')
    expect(more).toHaveAttribute('aria-expanded', 'false')
    await expectNoAxeViolations(container)
  })

  it('runs the action on press (pointer and keyboard) and reflects its dialog state', async () => {
    const { onPress } = renderTabs()
    await userEvent.click(screen.getByRole('button', { name: 'Thêm' }))
    expect(onPress).toHaveBeenCalledTimes(1)
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('link', { name: 'Trang chủ' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Thêm' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onPress).toHaveBeenCalledTimes(2)
  })

  it('shows the expanded state of the action', () => {
    renderTabs(vi.fn(), true)
    expect(screen.getByRole('button', { name: 'Thêm' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('navigates from a link tab', async () => {
    const { router } = renderTabs()
    await router.navigate('/student/other')
    await waitFor(() => expect(screen.getByRole('link', { name: 'Trang chủ' })).not.toHaveAttribute('aria-current'))
    await userEvent.click(screen.getByRole('link', { name: 'Trang chủ' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/student/home'))
  })
})
