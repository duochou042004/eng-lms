import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('is a labelled checkbox with its hint as the description', async () => {
    const { container } = render(<Checkbox label="Ghi nhớ đăng nhập" hint="Không dùng trên máy chung." />)
    const box = screen.getByRole('checkbox', { name: 'Ghi nhớ đăng nhập' })
    expect(box).not.toBeChecked()
    expect(box).toHaveAccessibleDescription('Không dùng trên máy chung.')
    await expectNoAxeViolations(container)
  })

  it('toggles with a pointer on the label and shows a check icon when selected (not colour alone)', async () => {
    const onChange = vi.fn()
    const { container } = render(<Checkbox label="Ghi nhớ" onChange={onChange} />)
    const label = container.querySelector('label')!
    expect(label.querySelector('svg')).toBeNull()
    await userEvent.click(screen.getByText('Ghi nhớ'))
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(onChange).toHaveBeenLastCalledWith(true)
    expect(label).toHaveAttribute('data-selected')
    expect(label.querySelector('svg')).not.toBeNull()
  })

  it('toggles with the keyboard (Tab, Space) with a focus-visible state', async () => {
    render(<Checkbox label="Ghi nhớ" />)
    await userEvent.tab()
    const box = screen.getByRole('checkbox', { name: 'Ghi nhớ' })
    expect(box).toHaveFocus()
    expect(document.querySelector('label')).toHaveAttribute('data-focus-visible')
    await userEvent.keyboard(' ')
    expect(box).toBeChecked()
  })

  it('shows the invalid state with an error message', async () => {
    const { container } = render(<Checkbox label="Đồng ý" isInvalid errorMessage="Hãy đánh dấu ô này." />)
    const box = screen.getByRole('checkbox', { name: 'Đồng ý' })
    expect(box).toHaveAttribute('aria-invalid', 'true')
    expect(box).toHaveAccessibleDescription('Hãy đánh dấu ô này.')
    await expectNoAxeViolations(container)
  })

  it('cannot be toggled when disabled', async () => {
    const { container } = render(<Checkbox label="Ghi nhớ" isDisabled />)
    const box = screen.getByRole('checkbox', { name: 'Ghi nhớ' })
    expect(box).toBeDisabled()
    await userEvent.click(screen.getByText('Ghi nhớ'))
    expect(box).not.toBeChecked()
    await expectNoAxeViolations(container)
  })

  it('shows hover and pressed states', async () => {
    const { container } = render(<Checkbox label="Ghi nhớ" />)
    const label = container.querySelector('label')!
    await userEvent.hover(label)
    expect(label).toHaveAttribute('data-hovered')
    const user = userEvent.setup()
    await user.pointer({ keys: '[MouseLeft>]', target: label })
    expect(label).toHaveAttribute('data-pressed')
    await user.pointer({ keys: '[/MouseLeft]', target: label })
  })
})
