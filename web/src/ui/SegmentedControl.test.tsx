import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { SegmentedControl, type SegmentedOption } from './SegmentedControl'

type View = 'list' | 'week' | 'month'
const OPTIONS: SegmentedOption<View>[] = [
  { id: 'list', label: 'Danh sách' },
  { id: 'week', label: 'Tuần' },
  { id: 'month', label: 'Tháng', lang: 'vi' },
]

function Controlled({ onChange, initial = 'list' }: { onChange?: (v: View) => void; initial?: View }) {
  const [view, setView] = useState<View>(initial)
  return (
    <SegmentedControl
      label="Chế độ xem"
      options={OPTIONS}
      selected={view}
      onChange={(v) => {
        setView(v)
        onChange?.(v)
      }}
    />
  )
}

const radio = (name: string) => screen.getByRole('radio', { name })

describe('SegmentedControl', () => {
  it('is a named radiogroup of radio segments; the selected one is checked and shows a decorative check icon', async () => {
    const { container } = render(<Controlled />)
    const group = screen.getByRole('radiogroup', { name: 'Chế độ xem' })
    expect(within(group).getAllByRole('radio')).toHaveLength(3)
    expect(radio('Danh sách')).toHaveAttribute('aria-checked', 'true')
    expect(radio('Danh sách')).toHaveAttribute('data-selected')
    expect(radio('Tuần')).toHaveAttribute('aria-checked', 'false')
    expect(radio('Danh sách').querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    expect(radio('Tuần').querySelector('svg')).toBeNull()
    expect(radio('Danh sách')).not.toHaveAttribute('aria-pressed')
    expect(radio('Tháng')).toHaveAttribute('lang', 'vi')
    await expectNoAxeViolations(container)
  })

  it('selects with a pointer and moves the check icon; pressing the selected segment keeps it selected', async () => {
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)
    await userEvent.click(radio('Tuần'))
    expect(onChange).toHaveBeenLastCalledWith('week')
    expect(radio('Tuần')).toHaveAttribute('aria-checked', 'true')
    expect(radio('Tuần').querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    expect(radio('Danh sách')).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(radio('Tuần'))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(radio('Tuần')).toHaveAttribute('aria-checked', 'true')
  })

  it('supports the keyboard: Tab into the group, arrow keys between segments, Space and Enter to select', async () => {
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)
    await userEvent.tab()
    expect(radio('Danh sách')).toHaveFocus()
    expect(radio('Danh sách')).toHaveAttribute('data-focus-visible')
    await userEvent.keyboard('{ArrowRight}')
    expect(radio('Tuần')).toHaveFocus()
    expect(onChange).not.toHaveBeenCalled()
    await userEvent.keyboard(' ')
    expect(onChange).toHaveBeenLastCalledWith('week')
    await userEvent.keyboard('{ArrowRight}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('month')
    expect(radio('Tháng')).toHaveAttribute('aria-checked', 'true')
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(radio('Danh sách')).toHaveFocus()
  })

  it('does not select a disabled segment, and disables every segment when the group is disabled', async () => {
    const onChange = vi.fn()
    const { container, rerender } = render(
      <SegmentedControl
        label="Chế độ xem"
        options={OPTIONS.map((o) => ({ ...o, isDisabled: o.id === 'month' }))}
        selected="list"
        onChange={onChange}
      />,
    )
    expect(radio('Tháng')).toBeDisabled()
    await userEvent.click(radio('Tháng'))
    expect(onChange).not.toHaveBeenCalled()
    await expectNoAxeViolations(container)

    rerender(<SegmentedControl label="Chế độ xem" options={OPTIONS} selected="list" onChange={onChange} isDisabled />)
    for (const r of screen.getAllByRole('radio')) expect(r).toBeDisabled()
    await userEvent.click(radio('Tuần'))
    expect(onChange).not.toHaveBeenCalled()
    expect(radio('Danh sách')).toHaveAttribute('aria-checked', 'true')
    await expectNoAxeViolations(container)
  })

  it('shows hover and pressed states', async () => {
    render(<Controlled />)
    await userEvent.hover(radio('Tuần'))
    expect(radio('Tuần')).toHaveAttribute('data-hovered')
    const user = userEvent.setup()
    await user.pointer({ keys: '[MouseLeft>]', target: radio('Tháng') })
    expect(radio('Tháng')).toHaveAttribute('data-pressed')
    await user.pointer({ keys: '[/MouseLeft]', target: radio('Tháng') })
  })
})
