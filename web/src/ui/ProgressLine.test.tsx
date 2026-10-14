import { readFileSync } from 'node:fs'
import { act, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { useDelayed } from './useDelayed'
import { ProgressLine } from './ProgressLine'

describe('ProgressLine (T-M2.12, design-system §3)', () => {
  it('is decorative: hidden from the accessibility tree, not focusable, no pointer target; axe clean', async () => {
    const { container } = render(
      <main>
        <h1>Page</h1>
        <ProgressLine />
      </main>,
    )
    const line = screen.getByTestId('progress-line')
    expect(line).toHaveAttribute('aria-hidden', 'true')
    expect(line).toHaveClass('line')
    expect(line.querySelectorAll('[tabindex], a, button, input')).toHaveLength(0)
    expect(line).not.toHaveAttribute('tabindex')
    await expectNoAxeViolations(container)
  })
})

describe('ProgressLine motion (AC11 (d))', () => {
  it('takes its animation duration from a motion token', () => {
    const css = readFileSync('src/ui/ProgressLine.module.css', 'utf8')
    const tokens = readFileSync('src/ui/tokens.css', 'utf8')
    expect(css).toMatch(/animation: travel var\(--motion-duration-progress\) /)
    expect(tokens).toMatch(/--motion-duration-progress: 1\.2s;/)
  })
})

describe('useDelayed (the shared 150 ms rule)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('turns true only after 150 ms of being active, and false at once when inactive', async () => {
    const { result, rerender, unmount } = renderHook(({ active }) => useDelayed(active), {
      initialProps: { active: false },
    })
    expect(result.current).toBe(false)
    rerender({ active: true })
    await act(() => vi.advanceTimersByTimeAsync(149))
    expect(result.current).toBe(false)
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(result.current).toBe(true)
    rerender({ active: false })
    expect(result.current).toBe(false)
    // Active again: the delay starts over.
    rerender({ active: true })
    expect(result.current).toBe(false)
    await act(() => vi.advanceTimersByTimeAsync(100))
    rerender({ active: false })
    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(result.current).toBe(false)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
