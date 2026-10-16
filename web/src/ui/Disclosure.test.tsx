import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { Disclosure } from './Disclosure'
import { TextField } from './TextField'

describe('Disclosure', () => {
  it('is a heading with a collapsed trigger; the panel is hidden but keeps its fields', async () => {
    const { container } = render(
      <Disclosure title="Liên hệ (không bắt buộc)">
        <TextField label="Email" defaultValue="an@example.com" />
      </Disclosure>,
    )
    const trigger = screen.getByRole('button', { name: 'Liên hệ (không bắt buộc)' })
    expect(trigger.closest('h2')).not.toBeNull()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('textbox', { name: 'Email' })).not.toBeInTheDocument()
    await expectNoAxeViolations(container)
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('an@example.com')
    await expectNoAxeViolations(container)
  })

  it('toggles with the keyboard (Tab, Enter, Space) with a focus-visible state', async () => {
    render(<Disclosure title="Ghi chú">nội dung</Disclosure>)
    await userEvent.tab()
    const trigger = screen.getByRole('button', { name: 'Ghi chú' })
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('data-focus-visible')
    await userEvent.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard(' ')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('can be controlled (a form opens a section that holds an error)', async () => {
    function Controlled() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>mở</button>
          <Disclosure title="Mật khẩu" isExpanded={open} onExpandedChange={setOpen} headingLevel={3}>
            bên trong
          </Disclosure>
        </>
      )
    }
    render(<Controlled />)
    const trigger = screen.getByRole('button', { name: 'Mật khẩu' })
    expect(trigger.closest('h3')).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'mở' }))
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('bên trong')).toBeVisible()
  })
})
