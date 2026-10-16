import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { SearchField } from './SearchField'

function Harness() {
  const [value, setValue] = useState('')
  return (
    <SearchField
      label="Tìm kiếm"
      hint="Tên hoặc email"
      clearLabel="Xoá nội dung tìm kiếm"
      value={value}
      onChange={setValue}
    />
  )
}

describe('SearchField', () => {
  it('is a labelled searchbox with a hint; the clear button appears with text and clears it', async () => {
    const { container } = render(<Harness />)
    const box = screen.getByRole('searchbox', { name: 'Tìm kiếm' })
    expect(box).toHaveAccessibleDescription('Tên hoặc email')
    expect(screen.queryByRole('button', { name: 'Xoá nội dung tìm kiếm' })).not.toBeInTheDocument()
    await expectNoAxeViolations(container)
    await userEvent.type(box, 'nguyen')
    expect(box).toHaveValue('nguyen')
    await expectNoAxeViolations(container)
    await userEvent.click(screen.getByRole('button', { name: 'Xoá nội dung tìm kiếm' }))
    expect(box).toHaveValue('')
  })

  it('clears with Esc from the keyboard', async () => {
    render(<Harness />)
    await userEvent.tab()
    const box = screen.getByRole('searchbox', { name: 'Tìm kiếm' })
    expect(box).toHaveFocus()
    await userEvent.keyboard('an{Escape}')
    expect(box).toHaveValue('')
  })

  it('can be disabled', () => {
    render(<SearchField label="Tìm kiếm" clearLabel="Xoá" isDisabled />)
    expect(screen.getByRole('searchbox', { name: 'Tìm kiếm' })).toBeDisabled()
  })
})
