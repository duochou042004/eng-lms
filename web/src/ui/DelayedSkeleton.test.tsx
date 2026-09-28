import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { DelayedSkeleton, SKELETON_DELAY_MS } from './DelayedSkeleton'
import { Skeleton } from './Skeleton'

describe('DelayedSkeleton (interaction-states §1)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('lays the skeleton out at once but shows it only after 150 ms; the region is busy from 0 ms', async () => {
    expect(SKELETON_DELAY_MS).toBe(150)
    const { container } = render(
      <output aria-busy="true" aria-label="Đang tải">
        <DelayedSkeleton>
          <Skeleton />
        </DelayedSkeleton>
      </output>,
    )
    expect(screen.getByRole('status', { name: 'Đang tải' })).toHaveAttribute('aria-busy', 'true')
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).not.toBeVisible()
    await act(() => vi.advanceTimersByTimeAsync(149))
    expect(skeleton).not.toBeVisible()
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(skeleton).toBeVisible()
    expect(skeleton.parentElement).toHaveAttribute('data-shown')
    vi.useRealTimers() // axe-core schedules its work with timers
    await expectNoAxeViolations(container)
  })

  it('accepts another delay and clears its timer on unmount', async () => {
    const { unmount } = render(
      <DelayedSkeleton delayMs={400}>
        <Skeleton />
      </DelayedSkeleton>,
    )
    await act(() => vi.advanceTimersByTimeAsync(399))
    expect(screen.getByTestId('skeleton')).not.toBeVisible()
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(screen.getByTestId('skeleton')).toBeVisible()
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
