import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { ConfirmDialog } from './ConfirmDialog'

function Harness({ onConfirm = () => {} }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Rời trang</button>
      <ConfirmDialog
        isOpen={open}
        title="Bỏ học viên này?"
        description="Những thông tin bạn đã nhập sẽ mất."
        confirmLabel="Bỏ"
        cancelLabel="Tiếp tục nhập"
        onConfirm={() => {
          onConfirm()
          setOpen(false)
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}

describe('ConfirmDialog', () => {
  it('is a named alert dialog with focus on the safe action; Cancel closes it and focus returns', async () => {
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Rời trang' })
    await userEvent.click(opener)
    const dialog = await screen.findByRole('alertdialog', { name: 'Bỏ học viên này?' })
    expect(dialog).toHaveTextContent('Những thông tin bạn đã nhập sẽ mất.')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tiếp tục nhập' })).toHaveFocus())
    await expectNoAxeViolations(document.body)
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục nhập' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await waitFor(() => expect(opener).toHaveFocus())
  })

  it('confirms with the danger action; Esc cancels; focus is contained', async () => {
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Rời trang' }))
    await screen.findByRole('alertdialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(onConfirm).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Rời trang' }))
    await screen.findByRole('alertdialog')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tiếp tục nhập' })).toHaveFocus())
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Bỏ' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Tiếp tục nhập' })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
