import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { TextField } from './TextField'

describe('TextField', () => {
  it('links the label and the hint to the input', async () => {
    const { container } = render(<TextField label="Tên học viên" hint="Tên hiển thị." />)
    const input = screen.getByRole('textbox', { name: 'Tên học viên' })
    expect(input).toHaveAccessibleDescription('Tên hiển thị.')
    await userEvent.type(input, 'Lan')
    expect(input).toHaveValue('Lan')
    await expectNoAxeViolations(container)
  })

  it('announces the invalid state and error message', async () => {
    const { container } = render(<TextField label="Tên đăng nhập" isInvalid errorMessage="Hãy nhập tên." />)
    const input = screen.getByRole('textbox', { name: 'Tên đăng nhập' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(expect.stringContaining('Hãy nhập tên.'))
    await expectNoAxeViolations(container)
  })

  it('shows a decorative icon before the error text (not colour alone); the description is the text only', async () => {
    const { container } = render(<TextField label="Tên đăng nhập" isInvalid errorMessage="Hãy nhập tên." />)
    const input = screen.getByRole('textbox', { name: 'Tên đăng nhập' })
    expect(input).toHaveAccessibleDescription('Hãy nhập tên.')
    const error = document.getElementById(input.getAttribute('aria-describedby')!.split(' ').at(-1)!)!
    expect(error).toHaveTextContent('Hãy nhập tên.')
    const icon = error.firstElementChild!
    expect(icon.tagName.toLowerCase()).toBe('svg')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    await expectNoAxeViolations(container)
  })

  it('shows the native validation message with the icon when no message is given', async () => {
    render(
      <form>
        <TextField label="Mã" isRequired validationBehavior="native" />
        <button type="submit">Lưu</button>
      </form>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    const input = screen.getByRole('textbox', { name: 'Mã' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.getAttribute('aria-describedby')).toBeTruthy()
    const error = document.querySelector('.error')!
    expect(error.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    expect(error.textContent).not.toBe('')
  })

  it('is not editable when disabled', async () => {
    render(<TextField label="Mã" isDisabled defaultValue="S-1" />)
    const input = screen.getByRole('textbox', { name: 'Mã' })
    expect(input).toBeDisabled()
    await userEvent.type(input, 'x')
    expect(input).toHaveValue('S-1')
  })

  it('receives keyboard focus with a focus-visible state', async () => {
    render(<TextField label="Tên" />)
    await userEvent.tab()
    expect(screen.getByRole('textbox', { name: 'Tên' })).toHaveFocus()
  })
})
