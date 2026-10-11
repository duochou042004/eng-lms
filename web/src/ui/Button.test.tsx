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
