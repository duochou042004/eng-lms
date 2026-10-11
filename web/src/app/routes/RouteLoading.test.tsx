import { act, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../../test/axe'
import { RouteLoading } from './RouteLoading'

function renderLoading(path: string) {
  const router = createMemoryRouter([{ path: '*', element: <RouteLoading /> }], { initialEntries: [path] })
  return render(<RouterProvider router={router} />)
}

describe('RouteLoading (T-M1.9 AC4, AC6 N3)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('is a busy, labelled region from 0 ms; its skeletons appear at 150 ms, not at 149 ms', async () => {
    const { container } = renderLoading('/tutor')
    const region = screen.getByRole('status', { name: 'Đang tải trang' })
    expect(region).toHaveAttribute('aria-busy', 'true')
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
    await act(() => vi.advanceTimersByTimeAsync(149))
    for (const s of skeletons) expect(s).not.toBeVisible()
    await act(() => vi.advanceTimersByTimeAsync(1))
    for (const s of skeletons) expect(s).toBeVisible()
    vi.useRealTimers() // axe-core schedules its work with timers
    await expectNoAxeViolations(container)
  })

  it.each(['/tutor', '/student/x'])('shows the header-shaped skeleton on the shell path %s', (path) => {
    renderLoading(path)
    expect(screen.getByTestId('route-loading-topbar')).toBeInTheDocument()
  })

  it.each(['/', '/khong-co', '/tutorial'])('shows the page-only skeleton on %s', (path) => {
    renderLoading(path)
    expect(screen.queryByTestId('route-loading-topbar')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  it.each(['/login', '/change-password', '/forbidden', '/'])(
    'starts the public-page skeleton on %s with the 44 px, end-aligned language-switcher row (T-M1.13 AC3, T-M2.4)',
    (path) => {
      renderLoading(path)
      const toolbar = screen.getByTestId('route-loading-toolbar')
      expect(toolbar).toHaveClass('toolbar')
      const [switcher] = within(toolbar).getAllByTestId('skeleton')
      expect(switcher).toHaveStyle({ blockSize: 'var(--size-control-md)' })
      // It comes before the title line (document order = block order in the Stack).
      const title = screen.getByRole('status').querySelector('.headerSkeleton')
      expect(toolbar.compareDocumentPosition(title!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      // The title and content sit in the pages' 400 px column.
      expect(title!.parentElement!.closest('.narrow')).not.toBeNull()
    },
  )

  it.each(['/tutor', '/student/x'])(
    'puts the header controls before the switcher on %s, sized from their own labels (T-M2.4)',
    (path) => {
      renderLoading(path)
      const topBar = screen.getByTestId('route-loading-topbar')
      const actions = topBar.querySelector('.actions')!
      expect(actions.lastElementChild).toBe(screen.getByTestId('route-loading-switcher'))
      const sizers = [...actions.querySelectorAll('.labelSizer')]
      expect(sizers.map((s) => s.textContent)).toEqual(['Đổi mật khẩu', 'Đăng xuất'])
      expect(sizers[0]).toHaveClass('linkSizer')
      expect(sizers[1]).toHaveClass('buttonSizer')
      for (const sizer of sizers) expect(sizer).toHaveAttribute('aria-hidden', 'true')
    },
  )

  it.each(['/login', '/tutor'])(
    'sizes the switcher block on %s from the switcher’s own row: both endonyms, hidden (T-M1.16 AC1)',
    (path) => {
      renderLoading(path)
      const switcher = screen.getByTestId('route-loading-switcher')
      const sizer = switcher.querySelector('.switcherSizer')!
      expect(sizer).toHaveAttribute('aria-hidden', 'true')
      expect([...sizer.children].map((c) => c.textContent)).toEqual(['Tiếng Việt', 'English'])
      const [block] = within(switcher).getAllByTestId('skeleton')
      expect(block).toHaveStyle({ inlineSize: '100%', blockSize: 'var(--size-control-md)' })
    },
  )

  it.each(['/khong-co', '/tutorial', '/tutor', '/student/x'])('has no landing toolbar row on %s', (path) => {
    renderLoading(path)
    expect(screen.queryByTestId('route-loading-toolbar')).not.toBeInTheDocument()
  })

  it('is block-level (the page padding applies)', () => {
    renderLoading('/login')
    expect(screen.getByRole('status')).toHaveClass('loading')
  })
})
