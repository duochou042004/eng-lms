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

// T-M2.14 scope 9: the primary variant, the pending state (not dismissible) and the content slot.
describe('ConfirmDialog variants', () => {
  function Variant({ isPending = false, onCancel = () => {} }: { isPending?: boolean; onCancel?: () => void }) {
    return (
      <ConfirmDialog
        isOpen
        title="Đã có thay đổi ở nơi khác"
        description="Tải lại để xem bản mới nhất."
        confirmLabel="Tải lại"
        confirmVariant="primary"
        cancelLabel="Huỷ"
        isPending={isPending}
        pendingLabel="Đang tải lại…"
        onConfirm={() => {}}
        onCancel={onCancel}
      >
        <button>Sao chép ghi chú của tôi</button>
      </ConfirmDialog>
    )
  }

  it('a primary confirm and a content slot under the description', async () => {
    render(<Variant />)
    const dialog = await screen.findByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })
    expect(screen.getByRole('button', { name: 'Tải lại' })).toHaveClass('primary')
    const slot = screen.getByRole('button', { name: 'Sao chép ghi chú của tôi' })
    expect(dialog.querySelector('p')!.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await expectNoAxeViolations(document.body)
  })

  it('while pending: the pending label, and Esc and Cancel do nothing', async () => {
    const onCancel = vi.fn()
    render(<Variant isPending onCancel={onCancel} />)
    await screen.findByRole('alertdialog')
    const confirm = screen.getByRole('button', { name: 'Đang tải lại…' })
    expect(confirm).toHaveAttribute('aria-disabled', 'true')
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))
    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('confirms with the danger variant by default', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Rời trang' }))
    expect(await screen.findByRole('button', { name: 'Bỏ' })).toHaveClass('danger')
  })
})
