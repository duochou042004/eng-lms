import { act, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../../test/axe'
import { setViewportWidth } from '../../test/viewport'
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
      // T-M2.11: a name-shaped line first (the workspace name), then the switcher block, last in the row.
      const name = screen.getByTestId('route-loading-name')
      expect(name).toHaveClass('toolbarName')
      expect(toolbar.firstElementChild).toBe(name)
      expect(toolbar.lastElementChild).toBe(screen.getByTestId('route-loading-switcher'))
      const [switcher] = within(screen.getByTestId('route-loading-switcher')).getAllByTestId('skeleton')
      expect(switcher).toHaveStyle({ blockSize: 'var(--size-control-md)' })
      // It comes before the title line (document order = block order in the Stack).
      const title = screen.getByRole('status').querySelector('.headerSkeleton')
      expect(toolbar.compareDocumentPosition(title!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      // The title and content sit in the pages' 400 px column.
      expect(title!.parentElement!.closest('.narrow')).not.toBeNull()
    },
  )

  // T-M2.11 scope 9: the shell skeleton follows the new frame per breakpoint (no header controls of T-M2.4 any more).
  it.each([
    [360, '/tutor', { menu: true, account: false, sidebar: false, tabs: false }],
    [768, '/tutor/today', { menu: true, account: false, sidebar: false, tabs: false }],
    [1024, '/tutor/x', { menu: false, account: true, sidebar: true, tabs: false }],
    [1280, '/tutor', { menu: false, account: true, sidebar: true, tabs: false }],
    [360, '/student', { menu: false, account: false, sidebar: false, tabs: true }],
    [767, '/student/x', { menu: false, account: false, sidebar: false, tabs: true }],
    [768, '/student/home', { menu: false, account: true, sidebar: false, tabs: false }],
    [1280, '/student', { menu: false, account: true, sidebar: false, tabs: false }],
  ])('at %i px on %s draws the shell frame %o', (width, path, frame) => {
    setViewportWidth(width)
    renderLoading(path)
    const topBar = screen.getByTestId('route-loading-topbar')
    expect(topBar).toHaveClass('topBar')
    expect(screen.queryByTestId('route-loading-menu') !== null).toBe(frame.menu)
    expect(screen.queryByTestId('route-loading-account') !== null).toBe(frame.account)
    expect(screen.queryByTestId('route-loading-sidebar') !== null).toBe(frame.sidebar)
    expect(screen.queryByTestId('route-loading-tabs') !== null).toBe(frame.tabs)
    expect(topBar.querySelector('.identity')).not.toBeNull()
    expect(screen.queryByTestId('route-loading-switcher')).not.toBeInTheDocument()
    if (frame.menu) expect(topBar.firstElementChild).toBe(screen.getByTestId('route-loading-menu'))
    if (frame.account) {
      // The end control: as wide as the account menu button (a fixed token; T-M1.16 AC1 as changed by DEC-112 (5)).
      const account = screen.getByTestId('route-loading-account')
      expect(topBar.lastElementChild).toBe(account)
      expect(within(account).getByTestId('skeleton')).toHaveStyle({
        inlineSize: 'var(--size-account-button)',
        blockSize: 'var(--size-control-md)',
      })
    }
    // The page sits in the shell's main box, padded for the bottom tabs when they are there.
    const main = screen.getByRole('status').querySelector('.main')!
    expect(main.classList.contains('withTabs')).toBe(frame.tabs)
  })

  it.each(['/login', '/forbidden'])(
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
