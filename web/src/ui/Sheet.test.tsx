import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { Button } from './Button'
import { Sheet } from './Sheet'

function Harness({ placement }: { placement: 'start' | 'bottom' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onPress={() => setOpen(true)}>Mở</Button>
      <Sheet
        placement={placement}
        isOpen={open}
        onOpenChange={setOpen}
        title="Điều hướng"
        closeLabel="Đóng"
        footer={<Button variant="secondary">Đăng xuất</Button>}
      >
        <a href="#a">Hôm nay</a>
      </Sheet>
    </>
  )
}

describe('Sheet', () => {
  it.each(['start', 'bottom'] as const)(
    '(%s) is a modal dialog named by its title: focus moves in, Tab is contained, Esc closes and focus returns',
    async (placement) => {
      render(<Harness placement={placement} />)
      const trigger = screen.getByRole('button', { name: 'Mở' })
      await userEvent.click(trigger)
      const dialog = await screen.findByRole('dialog', { name: 'Điều hướng' })
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
      expect(document.querySelector(`[data-placement="${placement}"]`)).not.toBeNull()
      await expectNoAxeViolations(document.body)
      // Tab cycles inside: heading → link → Close → footer button → back in.
      for (let i = 0; i < 6; i++) {
        await userEvent.tab()
        expect(dialog).toContainElement(document.activeElement as HTMLElement)
      }
      await userEvent.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(trigger).toHaveFocus())
    },
  )

  it('closes with its visible Close button and returns focus to the trigger', async () => {
    render(<Harness placement="start" />)
    const trigger = screen.getByRole('button', { name: 'Mở' })
    await userEvent.click(trigger)
    await userEvent.click(await screen.findByRole('button', { name: 'Đóng' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('shows a decorative drag handle on a bottom sheet only, and the footer below the body', async () => {
    const { unmount } = render(<Harness placement="bottom" />)
    await userEvent.click(screen.getByRole('button', { name: 'Mở' }))
    const dialog = await screen.findByRole('dialog')
    const handle = dialog.querySelector('.handle')
    expect(handle).toHaveAttribute('aria-hidden', 'true')
    unmount()
    render(<Harness placement="start" />)
    await userEvent.click(screen.getByRole('button', { name: 'Mở' }))
    const drawer = await screen.findByRole('dialog')
    expect(drawer.querySelector('.handle')).toBeNull()
    const footer = drawer.querySelector('.footer')!
    expect(footer).toContainElement(screen.getByRole('button', { name: 'Đăng xuất' }))
    expect(
      drawer.querySelector('.body')!.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
