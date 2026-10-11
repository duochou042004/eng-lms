import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { PasswordField } from './PasswordField'

const field = (props: Partial<Parameters<typeof PasswordField>[0]> = {}) => (
  <PasswordField label="Mật khẩu" revealLabel="Hiện mật khẩu" autoComplete="current-password" {...props} />
)

describe('PasswordField', () => {
  it('is a labelled password input with autocomplete and a named reveal toggle (not pressed)', async () => {
    const { container } = render(field({ hint: '10–128 ký tự.' }))
    const input = screen.getByLabelText('Mật khẩu')
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveAttribute('autocomplete', 'current-password')
    expect(input).toHaveAccessibleDescription('10–128 ký tự.')
    const toggle = screen.getByRole('button', { name: 'Hiện mật khẩu' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(toggle).toHaveAttribute('type', 'button')
    await expectNoAxeViolations(container)
  })

  it('reveals and hides the text with the toggle, keeping the value; the toggle never submits', async () => {
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    render(<form onSubmit={onSubmit}>{field()}</form>)
    const input = screen.getByLabelText('Mật khẩu')
    await userEvent.type(input, 'bí mật 123')
    const toggle = screen.getByRole('button', { name: 'Hiện mật khẩu' })
    await userEvent.click(toggle)
    expect(input).toHaveAttribute('type', 'text')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(input).toHaveValue('bí mật 123')
    await userEvent.click(toggle)
    expect(input).toHaveAttribute('type', 'password')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('is keyboard operable: Tab to the input, Tab to the toggle, Space toggles', async () => {
    render(field())
    await userEvent.tab()
    expect(screen.getByLabelText('Mật khẩu')).toHaveFocus()
    await userEvent.tab()
    const toggle = screen.getByRole('button', { name: 'Hiện mật khẩu' })
    expect(toggle).toHaveFocus()
    expect(toggle).toHaveAttribute('data-focus-visible')
    await userEvent.keyboard(' ')
    expect(screen.getByLabelText('Mật khẩu')).toHaveAttribute('type', 'text')
  })

  it('announces the invalid state and links the error message', async () => {
    const { container } = render(field({ isInvalid: true, errorMessage: 'Hãy nhập mật khẩu.' }))
    const input = screen.getByLabelText('Mật khẩu')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Hãy nhập mật khẩu.')
    await expectNoAxeViolations(container)
  })

  it('disables the input and the toggle', async () => {
    const { container } = render(field({ isDisabled: true }))
    expect(screen.getByLabelText('Mật khẩu')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Hiện mật khẩu' })).toBeDisabled()
    await expectNoAxeViolations(container)
  })

  it('passes the id to the input (error-summary links target it)', () => {
    render(field({ id: 'pw' }))
    expect(document.getElementById('pw')).toBe(screen.getByLabelText('Mật khẩu'))
  })
})
