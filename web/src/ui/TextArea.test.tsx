import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { TextArea } from './TextArea'
import { UiProvider } from './UiProvider'

function Counted({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <UiProvider locale="vi">
      <TextArea label="Ghi chú" hint="Chỉ bạn thấy." maxLength={2000} value={value} onChange={setValue} />
    </UiProvider>
  )
}

describe('TextArea', () => {
  it('is a labelled multi-line field; the hint and the counter (in the UI locale) describe it', async () => {
    const { container } = render(<Counted initial={'x'.repeat(1200)} />)
    const area = screen.getByRole('textbox', { name: 'Ghi chú' })
    expect(area.tagName).toBe('TEXTAREA')
    expect(area).toHaveAccessibleDescription('Chỉ bạn thấy.1.200 / 2.000')
    await expectNoAxeViolations(container)
  })

  it('counts code points as typed, keeps line breaks and marks the counter past the limit (typing is not blocked)', async () => {
    render(<Counted initial={'a'.repeat(1999)} />)
    const area = screen.getByRole('textbox', { name: 'Ghi chú' })
    await userEvent.type(area, '😀{Enter}b')
    expect(area).toHaveValue(`${'a'.repeat(1999)}😀\nb`)
    const counter = screen.getByText('2.002 / 2.000')
    expect(counter).toHaveAttribute('data-over', 'true')
  })

  it('shows the invalid and disabled states', async () => {
    const { container } = render(
      <>
        <TextArea label="Ghi chú" isInvalid errorMessage="Tối đa 2000 ký tự." />
        <TextArea label="Khoá" isDisabled />
      </>,
    )
    expect(screen.getByRole('textbox', { name: 'Ghi chú' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('textbox', { name: 'Ghi chú' })).toHaveAccessibleDescription('Tối đa 2000 ký tự.')
    expect(screen.getByRole('textbox', { name: 'Khoá' })).toBeDisabled()
    await expectNoAxeViolations(container)
  })
})
