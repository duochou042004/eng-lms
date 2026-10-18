import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { ToastRegion } from './Toast'
import { TOAST_STACK_VAR, TOAST_TIMEOUT_MS, toast } from './toastQueue'

// T-M2.14 AC9 (scope 9): polite announcements, 5 s timeout paused on hover and focus, persistent action toasts, Close,
// at most 3 visible with the newest last, the queue cleared on unmount, the stack size published on :root.

const region = () => screen.queryByRole('region', { name: 'Thông báo' })
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))

function renderRegion() {
  return render(<ToastRegion label="Thông báo" dismissLabel="Đóng thông báo" />)
}

describe('Toast (axe)', () => {
  it('a visible toast with an action is axe clean', async () => {
    renderRegion()
    act(() => void toast.success('Đã lưu trữ An.', { action: { label: 'Hoàn tác', onAction: () => {} } }))
    await expectNoAxeViolations(document.body)
    act(() => toast.clear())
  })
})

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    act(() => toast.clear())
    vi.useRealTimers()
  })

  it('announces a success politely in the named region, with an icon and Close; it closes after 5 s', () => {
    renderRegion()
    expect(region()).not.toBeInTheDocument()
    act(() => void toast.success('Đã lưu hồ sơ'))
    const live = within(region()!).getByRole('status')
    expect(live).toHaveAttribute('aria-live', 'polite')
    expect(live).toHaveTextContent('Đã lưu hồ sơ')
    expect(within(region()!).getByRole('alertdialog', { name: 'Đã lưu hồ sơ' }).querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    expect(within(region()!).getByRole('button', { name: 'Đóng thông báo' })).toBeInTheDocument()
    advance(TOAST_TIMEOUT_MS - 1)
    expect(region()).toBeInTheDocument()
    advance(1)
    expect(region()).not.toBeInTheDocument()
  })

  it('pauses the timer while the pointer is over the region or focus is inside it', () => {
    renderRegion()
    act(() => void toast.success('Đã lưu hồ sơ'))
    advance(2000)
    fireEvent.pointerEnter(region()!, { pointerType: 'mouse' })
    advance(10_000)
    expect(region()).toBeInTheDocument()
    fireEvent.pointerLeave(region()!, { pointerType: 'mouse' })
    advance(TOAST_TIMEOUT_MS - 2000 - 1)
    expect(region()).toBeInTheDocument()
    act(() => screen.getByRole('alertdialog').focus())
    advance(10_000)
    expect(region()).toBeInTheDocument()
    act(() => screen.getByRole('alertdialog').blur())
    advance(1)
    expect(region()).not.toBeInTheDocument()
  })

  it('keeps a toast with an action until it is closed; the action runs; the caller closes it by its key', () => {
    renderRegion()
    const onAction = vi.fn()
    let key = ''
    act(() => void (key = toast.success('Đã lưu trữ An.', { action: { label: 'Hoàn tác', onAction } })))
    advance(60_000)
    const undo = within(region()!).getByRole('button', { name: 'Hoàn tác' })
    fireEvent.click(undo)
    expect(onAction).toHaveBeenCalledTimes(1)
    act(() => toast.close(key))
    expect(region()).not.toBeInTheDocument()
  })

  it('Close dismisses a toast', () => {
    renderRegion()
    act(() => void toast.success('Đã lưu trữ An.', { action: { label: 'Hoàn tác', onAction: () => {} } }))
    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }))
    expect(region()).not.toBeInTheDocument()
  })

  it('shows at most 3, the newest last; a hidden one shows when one closes', () => {
    renderRegion()
    const keys: string[] = []
    act(() => {
      for (const n of [1, 2, 3, 4])
        keys.push(toast.success(`Toast ${n}`, { action: { label: 'OK', onAction: () => {} } }))
    })
    const texts = () =>
      within(region()!)
        .getAllByRole('status')
        .map((s) => s.textContent)
    expect(texts()).toEqual(['Toast 2', 'Toast 3', 'Toast 4'])
    act(() => toast.close(keys[3]!))
    expect(texts()).toEqual(['Toast 1', 'Toast 2', 'Toast 3'])
  })

  it('publishes its height on :root while it holds a toast, and clears the queue when it unmounts', () => {
    const { unmount } = renderRegion()
    const root = document.documentElement
    expect(root.style.getPropertyValue(TOAST_STACK_VAR)).toBe('')
    act(() => void toast.success('Đã lưu trữ An.', { action: { label: 'Hoàn tác', onAction: () => {} } }))
    expect(root.style.getPropertyValue(TOAST_STACK_VAR)).toMatch(/^\d+(\.\d+)?px$/)
    expect(root).toHaveAttribute('data-toasts')
    unmount()
    expect(root.style.getPropertyValue(TOAST_STACK_VAR)).toBe('')
    expect(root).not.toHaveAttribute('data-toasts')
    // Nothing is left for the next shell.
    renderRegion()
    expect(region()).not.toBeInTheDocument()
  })
})
