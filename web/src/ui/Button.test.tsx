import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { Button } from './Button'
import { IconButton } from './IconButton'

describe('Button', () => {
  it.each(['primary', 'secondary', 'quiet', 'danger'] as const)(
    'renders the %s variant accessibly',
    async (variant) => {
      const { container } = render(<Button variant={variant}>Lưu</Button>)
      expect(screen.getByRole('button', { name: 'Lưu' })).toHaveClass(variant)
      await expectNoAxeViolations(container)
    },
  )

  it('is operable by keyboard (Enter and Space)', async () => {
    const onPress = vi.fn()
    render(<Button onPress={onPress}>Lưu</Button>)
    await userEvent.tab()
    expect(screen.getByRole('button')).toHaveFocus()
    expect(screen.getByRole('button')).toHaveAttribute('data-focus-visible')
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    expect(onPress).toHaveBeenCalledTimes(2)
  })

  it('does not fire when disabled', async () => {
    const onPress = vi.fn()
    render(
      <Button isDisabled onPress={onPress}>
        Lưu
      </Button>,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onPress).not.toHaveBeenCalled()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows the pending state without losing its name', async () => {
    const onPress = vi.fn()
    const { container } = render(
      <Button isPending onPress={onPress}>
        Đang lưu
      </Button>,
    )
    const button = screen.getByRole('button', { name: /Đang lưu/ })
    expect(button).toHaveAttribute('data-pending')
    await userEvent.click(button)
    expect(onPress).not.toHaveBeenCalled()
    await expectNoAxeViolations(container)
  })

  it('drops its pending announcement when it unmounts, so the live region never points at a missing element', async () => {
    const { rerender, unmount } = render(<Button>Đăng nhập</Button>)
    await userEvent.tab()
    rerender(<Button isPending>Đăng nhập</Button>)
    const button = screen.getByRole('button')
    const entries = () =>
      [...document.querySelectorAll('[data-live-announcer] [aria-labelledby]')].filter(
        (e) => e.getAttribute('aria-labelledby')?.split(' ')[0] === button.id,
      )
    expect(entries().length).toBeGreaterThan(0)
    unmount()
    expect(entries()).toEqual([])
  })

  it('drops an announcement that arrives after it is gone (React Aria delays its first one) before another task sees it', async () => {
    const { unmount } = render(<Button id="late-save">Lưu</Button>)
    unmount()
    // React Aria's first announcement, added 100 ms after the button left: an entry pointing at the missing button.
    const announcer = document.createElement('div')
    announcer.setAttribute('data-live-announcer', 'true')
    const log = document.createElement('div')
    announcer.append(log)
    document.body.append(announcer)
    const late = document.createElement('div')
    late.setAttribute('role', 'img')
    late.setAttribute('aria-labelledby', 'late-save')
    const other = document.createElement('div')
    other.setAttribute('role', 'img')
    other.setAttribute('aria-labelledby', 'another-button')
    log.append(late, other)
    // The observer runs before the next task (a screen reader, axe) can look.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(late.isConnected).toBe(false)
    expect(other.isConnected).toBe(true)
    announcer.remove()
  })

  it('stops watching after the late-announcement window', async () => {
    vi.useFakeTimers()
    try {
      const { unmount } = render(<Button id="old-save">Lưu</Button>)
      unmount()
      vi.advanceTimersByTime(1000) // past the 500 ms window
      vi.useRealTimers()
      const announcer = document.createElement('div')
      announcer.setAttribute('data-live-announcer', 'true')
      const entry = document.createElement('div')
      entry.setAttribute('aria-labelledby', 'old-save')
      document.body.append(announcer)
      announcer.append(entry)
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(entry.isConnected).toBe(true)
      announcer.remove()
    } finally {
      vi.useRealTimers()
    }
  })

  it('supports the large size', () => {
    render(<Button size="lg">Bắt đầu</Button>)
    expect(screen.getByRole('button')).toHaveClass('lg')
  })
})

describe('IconButton', () => {
  it('uses the required label as its accessible name and hides the icon', async () => {
    const onPress = vi.fn()
    const { container } = render(<IconButton label="Thêm" icon={<svg />} onPress={onPress} />)
    const button = screen.getByRole('button', { name: 'Thêm' })
    expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull()
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    expect(onPress).toHaveBeenCalledOnce()
    await expectNoAxeViolations(container)
  })
})
