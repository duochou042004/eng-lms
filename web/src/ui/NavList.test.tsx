import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CalendarCheck, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { NavList } from './NavList'

const ITEMS = [
  { id: 'today', label: 'Hôm nay', icon: <CalendarCheck />, to: '/tutor/today' },
  { id: 'students', label: 'Học viên', icon: <Users />, to: '/tutor/students' },
]

function renderAt(path: string, ui: ReactNode) {
  const router = createMemoryRouter([{ path: '*', element: ui }], { initialEntries: [path] })
  return { router, ...render(<RouterProvider router={router} />) }
}

describe('NavList', () => {
  it('is a labelled nav landmark with a list of links; the current route (or below it) has aria-current="page"', async () => {
    const { container } = renderAt('/tutor/students/42', <NavList label="Điều hướng gia sư" items={ITEMS} />)
    const nav = screen.getByRole('navigation', { name: 'Điều hướng gia sư' })
    expect(nav.querySelectorAll('li')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Học viên' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Hôm nay' })).not.toHaveAttribute('aria-current')
    // The icon is decorative; the label is visible text.
    expect(screen.getByRole('link', { name: 'Hôm nay' }).querySelector('[aria-hidden="true"] svg')).not.toBeNull()
    await expectNoAxeViolations(container)
  })

  it('navigates on activation (pointer and keyboard) and calls onNavigate', async () => {
    const onNavigate = vi.fn()
    const { router } = renderAt('/tutor/today', <NavList label="Nav" items={ITEMS} onNavigate={onNavigate} />)
    await userEvent.click(screen.getByRole('link', { name: 'Học viên' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/tutor/students'))
    expect(onNavigate).toHaveBeenCalledTimes(1)
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('link', { name: 'Hôm nay' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/tutor/today'))
    expect(screen.getByRole('link', { name: 'Hôm nay' })).toHaveAttribute('aria-current', 'page')
  })

  it('lays out horizontally on request', () => {
    renderAt('/tutor/today', <NavList label="Nav" items={ITEMS} orientation="horizontal" />)
    expect(screen.getByRole('list')).toHaveClass('horizontal')
  })
})
