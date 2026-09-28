import { act, screen } from '@testing-library/react'
import { http } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'
import { server } from '../../test/server'
import { WorkspaceName } from './WorkspaceName'

describe('WorkspaceName loading (T-M1.9 AC4)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('is busy and labelled from 0 ms and shows its skeleton only after 150 ms', async () => {
    server.use(http.get('*/api/v1/meta', () => new Promise<never>(() => {})))
    renderWithProviders(<WorkspaceName />)
    const region = screen.getByRole('status', { name: 'Đang tải thông tin không gian dạy học' })
    expect(region).toHaveAttribute('aria-busy', 'true')
    const skeleton = screen.getByTestId('skeleton')
    await act(() => vi.advanceTimersByTimeAsync(149))
    expect(skeleton).not.toBeVisible()
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(skeleton).toBeVisible()
  })
})
