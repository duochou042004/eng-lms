import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { ComboBox, type ComboBoxOption } from './ComboBox'

const ZONES: ComboBoxOption[] = [
  'Africa/Abidjan',
  'America/New_York',
  'Asia/Bangkok',
  'Asia/Ho_Chi_Minh',
  'Asia/Hong_Kong',
  'Europe/London',
  'Pacific/Honolulu',
].map((id) => ({ id, label: id }))

function Harness({
  options = ZONES,
  initial = 'Asia/Bangkok',
  onChange = () => {},
}: {
  options?: ComboBoxOption[]
  initial?: string
  onChange?: (id: string) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <ComboBox
        label="Múi giờ"
        description="Gõ tên thành phố để tìm."
        options={options}
        value={value}
        onChange={(id) => {
          setValue(id)
          onChange(id)
        }}
        emptyMessage="Không có múi giờ nào khớp."
      />
      <output data-testid="value">{value}</output>
    </>
  )
}

const box = () => screen.getByRole('combobox', { name: 'Múi giờ' })
const optionNames = () =>
  within(screen.getByRole('listbox'))
    .getAllByRole('option')
    .map((o) => o.textContent)

describe('ComboBox', () => {
  // jsdom has no layout: React Aria's virtualizer renders every row unless the sizes are defined on HTMLElement itself
  // (its own tests' convention): a 440 px list (client size) of rows measured at 44 px (scroll size).
  const sizes = { clientHeight: 440, clientWidth: 320, scrollHeight: 44, scrollWidth: 320 }
  beforeEach(() => {
    for (const [name, value] of Object.entries(sizes))
      Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get: () => value })
  })
  afterEach(() => {
    for (const name of Object.keys(sizes)) delete (HTMLElement.prototype as unknown as Record<string, unknown>)[name]
  })

  it('is a labelled combobox with a description showing the selected option; axe clean closed and open', async () => {
    const { container } = render(<Harness />)
    expect(box()).toHaveValue('Asia/Bangkok')
    expect(box()).toHaveAccessibleDescription('Gõ tên thành phố để tìm.')
    expect(box()).toHaveAttribute('aria-expanded', 'false')
    await expectNoAxeViolations(container)
    await userEvent.click(box())
    await userEvent.keyboard('ho')
    expect(box()).toHaveAttribute('aria-expanded', 'true')
    await expectNoAxeViolations(container)
    // The list is portalled to the body (React Aria's popover).
    await expectNoAxeViolations(screen.getByRole('listbox').closest('.popover')!)
  })

  it('keyboard: typing filters (contains, case- and accent-insensitive), arrows move, Enter selects', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.tab()
    expect(box()).toHaveFocus()
    await userEvent.keyboard('{Control>}a{/Control}HỒ')
    expect(optionNames()).toEqual(['Asia/Ho_Chi_Minh', 'Asia/Hong_Kong', 'Pacific/Honolulu'])
    await userEvent.keyboard('{ArrowDown}')
    expect(box().getAttribute('aria-activedescendant')).toBe(
      screen.getByRole('option', { name: 'Asia/Ho_Chi_Minh' }).id,
    )
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(box()).toHaveValue('Pacific/Honolulu')
    expect(onChange).toHaveBeenCalledWith('Pacific/Honolulu')
    expect(screen.getByTestId('value')).toHaveTextContent('Pacific/Honolulu')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    await userEvent.keyboard('{Control>}a{/Control}hồ chí')
    expect(optionNames()).toEqual(['Asia/Ho_Chi_Minh'])
  })

  it('Escape closes the list, keeps focus on the input and the selection; leaving restores the text', async () => {
    const onChange = vi.fn()
    render(
      <>
        <Harness onChange={onChange} />
        <button type="button">next</button>
      </>,
    )
    await userEvent.click(box())
    await userEvent.keyboard('{Control>}a{/Control}lon')
    expect(optionNames()).toEqual(['Europe/London'])
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(box()).toHaveFocus()
    expect(screen.getByTestId('value')).toHaveTextContent('Asia/Bangkok')
    await userEvent.keyboard('{Control>}a{/Control}xyz')
    await userEvent.tab()
    expect(box()).toHaveValue('Asia/Bangkok')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows the empty message when nothing matches', async () => {
    render(<Harness />)
    await userEvent.click(box())
    await userEvent.keyboard('{Control>}a{/Control}zzz')
    expect(screen.getByRole('listbox')).toHaveTextContent('Không có múi giờ nào khớp.')
  })

  it('renders only the rows in view of a long list (virtualised), the selected one marked', async () => {
    const many = Array.from({ length: 600 }, (_, i) => ({ id: `Zone/${i}`, label: `Zone/${i}` }))
    render(<Harness options={many} initial="Zone/3" />)
    await userEvent.click(screen.getByRole('button'))
    expect(optionNames().length).toBeGreaterThan(0)
    expect(optionNames().length).toBeLessThanOrEqual(50)
    expect(screen.getByRole('option', { name: 'Zone/3' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(box())
    await userEvent.keyboard('{Control>}a{/Control}zone/59')
    expect(optionNames()).toEqual(['Zone/59', ...Array.from({ length: 10 }, (_, i) => `Zone/${590 + i}`)])
  })

  it('shows its error and can be disabled', () => {
    const { rerender } = render(
      <ComboBox
        label="Múi giờ"
        options={ZONES}
        value="Asia/Bangkok"
        onChange={() => {}}
        isInvalid
        errorMessage="Hãy chọn một múi giờ."
        emptyMessage="-"
      />,
    )
    expect(box()).toHaveAttribute('aria-invalid', 'true')
    expect(box()).toHaveAccessibleDescription('Hãy chọn một múi giờ.')
    rerender(
      <ComboBox label="Múi giờ" options={ZONES} value="Asia/Bangkok" onChange={() => {}} isDisabled emptyMessage="-" />,
    )
    expect(box()).toBeDisabled()
  })
})
