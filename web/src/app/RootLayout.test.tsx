import { act, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { createMemoryRouter, Link, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { changeLocale } from '../lib/i18n'
import { expectNoAxeViolations } from '../test/axe'
import { PageHeader } from '../ui'
import { RootLayout } from './RootLayout'

// A route module that loads after `ms` (a slow lazy chunk).
const slowPage = (ms: number, title: string) => async () => {
  await new Promise((resolve) => setTimeout(resolve, ms))
  return {
    Component: () => (
      <main>
        <PageHeader title={title} />
      </main>
    ),
  }
}

function renderApp() {
  const router = createMemoryRouter(
    [
      {
        Component: RootLayout,
        children: [
          {
            index: true,
            element: (
              <main>
                <PageHeader title="Start" />
                <Link to="/slow">Slow</Link>
                <Link to="/fast">Fast</Link>
              </main>
            ),
          },
          { path: 'slow', lazy: slowPage(1500, 'Slow page') },
          { path: 'fast', lazy: slowPage(100, 'Fast page') },
          { path: 'never', lazy: () => new Promise<never>(() => {}) },
        ],
      },
    ],
    { initialEntries: ['/'] },
  )
  const result = render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
  return { ...result, router }
}

/** The root layout's polite status region (it has no name; the page's own regions are inside `main`). */
const navigationStatus = () => document.querySelector<HTMLElement>('body > div > output')!

describe('navigation feedback (T-M2.12 AC1, DEC-073)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('after 150 ms of a slow navigation: the progress line and "Đang tải trang"; the page stays; both go when it renders', async () => {
    const { router } = renderApp()
    expect(screen.getByRole('heading', { level: 1, name: 'Start' })).toBeInTheDocument()
    const status = navigationStatus()
    expect(status).toHaveTextContent('')
    expect(screen.queryByTestId('progress-line')).not.toBeInTheDocument()

    act(() => void router.navigate('/slow'))
    await act(() => vi.advanceTimersByTimeAsync(149))
    expect(screen.queryByTestId('progress-line')).not.toBeInTheDocument()
    expect(status).toHaveTextContent('')
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(screen.getByTestId('progress-line')).toHaveAttribute('aria-hidden', 'true')
    expect(status).toHaveTextContent('Đang tải trang')
    // The previous page stays, usable, and keeps focus where it was.
    expect(screen.getByRole('heading', { level: 1, name: 'Start' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Slow' })).toBeVisible()

    await act(() => vi.advanceTimersByTimeAsync(1400))
    expect(screen.getByRole('heading', { level: 1, name: 'Slow page' })).toHaveFocus()
    expect(screen.queryByTestId('progress-line')).not.toBeInTheDocument()
    expect(status).toHaveTextContent('')
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('shows nothing for a navigation that settles within 150 ms', async () => {
    const { router } = renderApp()
    const status = navigationStatus()
    const seen: boolean[] = []
    const observer = new MutationObserver(() => seen.push(!!screen.queryByTestId('progress-line')))
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    act(() => void router.navigate('/fast'))
    await act(() => vi.advanceTimersByTimeAsync(400))
    observer.disconnect()
    expect(screen.getByRole('heading', { level: 1, name: 'Fast page' })).toBeInTheDocument()
    expect(seen).not.toContain(true)
    expect(status).toHaveTextContent('')
  })

  it('says "Loading the page" in English', async () => {
    await changeLocale('en')
    const { router } = renderApp()
    act(() => void router.navigate('/slow'))
    await act(() => vi.advanceTimersByTimeAsync(200))
    expect(navigationStatus()).toHaveTextContent('Loading the page')
    await act(() => vi.advanceTimersByTimeAsync(1500))
  })
})

describe('navigation feedback: accessibility (T-M2.12 AC9)', () => {
  it('axe is clean while the progress line shows; the line is out of the tab order', async () => {
    const { router } = renderApp()
    act(() => void router.navigate('/never'))
    expect(await screen.findByTestId('progress-line')).toBeInTheDocument()
    await expectNoAxeViolations(document.body)
    const focusable = document.querySelectorAll('[data-testid="progress-line"] *, [data-testid="progress-line"]')
    for (const el of focusable) expect((el as HTMLElement).tabIndex).toBe(-1)
  })
})
