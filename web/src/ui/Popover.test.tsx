import { readFileSync } from 'node:fs'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CircleUser } from 'lucide-react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { Button } from './Button'
import { Popover } from './Popover'

function Harness({ name = 'Cô Lan' }: { name?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Popover triggerLabel={name} triggerIcon={<CircleUser />} label="Tài khoản" isOpen={open} onOpenChange={setOpen}>
        <Button variant="secondary">Đổi mật khẩu</Button>
        <Button variant="secondary" onPress={() => setOpen(false)}>
          Đăng xuất
        </Button>
      </Popover>
      <button type="button">Bên ngoài</button>
    </>
  )
}

describe('Popover', () => {
  it('is a button named by its label that opens a dialog (not a menu); focus moves in and is contained', async () => {
    const { container } = render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Cô Lan' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    await expectNoAxeViolations(container)
    await userEvent.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Tài khoản' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    for (let i = 0; i < 4; i++) {
      await userEvent.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
    await expectNoAxeViolations(document.body)
  })

  it('closes with Esc and returns focus to the trigger (keyboard: Enter opens)', async () => {
    render(<Harness />)
    await userEvent.tab()
    const trigger = screen.getByRole('button', { name: 'Cô Lan' })
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('data-focus-visible')
    await userEvent.keyboard('{Enter}')
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('closes on a click outside and when its owner closes it', async () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Cô Lan' })
    await userEvent.click(trigger)
    await userEvent.click(await screen.findByRole('button', { name: 'Đăng xuất' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await userEvent.click(trigger)
    await screen.findByRole('dialog')
    await userEvent.click(document.body)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('truncates a long trigger label and keeps the full text as its title (responsive-standards §3 item 8)', () => {
    const long = 'Nguyễn Thị Phương Lan Anh Nguyễn Thị Phương Lan Anh Nguyễn Thị'
    render(<Harness name={long} />)
    const trigger = screen.getByRole('button', { name: long })
    expect(trigger.querySelector('.triggerText')).toHaveAttribute('title', long)
  })

  it('shows the hover and pressed states', async () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Cô Lan' })
    await userEvent.hover(trigger)
    expect(trigger).toHaveAttribute('data-hovered')
    const user = userEvent.setup()
    await user.pointer({ keys: '[MouseLeft>]', target: trigger })
    expect(trigger).toHaveAttribute('data-pressed')
    await user.pointer({ keys: '[/MouseLeft]', target: trigger })
  })

  // T-M2.31 (a), DEC-178 QA-1: at 800×360 a failed logout's content ran past React Aria's inline max-height while the page
  // was scroll-locked. Content taller than the cap scrolls inside the popover; the gutter keeps the fixed width when a
  // classic scrollbar appears; the scroll padding keeps an inner control's outward ring clear of the edge. Vitest stubs CSS,
  // so the rule is read from disk (cwd: web/); the layout proof is the E2E (shells.spec).
  it('scrolls content taller than its cap inside itself, with a stable gutter and room for a focus ring', () => {
    const css = readFileSync('src/ui/Popover.module.css', 'utf8')
    const rule = (selector: string) => new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? ''
    expect(rule('.popover')).toMatch(/overflow-y:\s*auto;/)
    expect(rule('.popover')).toMatch(/scrollbar-gutter:\s*stable;/)
    expect(rule('.popover')).toMatch(
      /scroll-padding-block:\s*calc\(var\(--focus-ring-width\) \+ var\(--focus-ring-offset\)\);/,
    )
    expect(rule('.popover')).toMatch(/inline-size:\s*var\(--size-popover\);/)
  })
})
