import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CircleAlert } from 'lucide-react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { Toggletip } from './Toggletip'

const MESSAGE = 'Không tải được tên không gian dạy học'

function Harness({ onTriggerHidden }: { onTriggerHidden?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Toggletip
        label="Xem lỗi"
        message={MESSAGE}
        icon={<CircleAlert />}
        tone="danger"
        isOpen={open}
        onOpenChange={setOpen}
        onTriggerHidden={onTriggerHidden}
      />
      <button type="button">Thử lại</button>
    </>
  )
}

/** jsdom has no ResizeObserver: a stand-in whose callbacks the test runs, as a layout change would. */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []
  targets: Element[] = []
  callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    FakeResizeObserver.instances.push(this)
  }
  observe(target: Element) {
    this.targets.push(target)
  }
  disconnect() {
    this.targets = []
  }
  unobserve() {}
}

describe('Toggletip (T-M2.13 scope 1)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    FakeResizeObserver.instances = []
  })

  it('is a named button with the message as title that opens a dialog named by the message; focus moves in', async () => {
    const { container } = render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Xem lỗi' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('title', MESSAGE)
    expect(trigger.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    await expectNoAxeViolations(container)
    await userEvent.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: MESSAGE })
    expect(dialog).toHaveTextContent(MESSAGE)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))
    await expectNoAxeViolations(document.body)
  })

  it('closes with Esc and returns focus to the trigger (keyboard: Enter opens)', async () => {
    render(<Harness />)
    await userEvent.tab()
    const trigger = screen.getByRole('button', { name: 'Xem lỗi' })
    expect(trigger).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('closes on a tap outside and returns focus to the trigger', async () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Xem lỗi' })
    await userEvent.click(trigger)
    await screen.findByRole('dialog')
    await userEvent.click(document.body)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('closes when its trigger renders no box while open and lets the owner move focus (G0 D-4)', async () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    const onTriggerHidden = vi.fn(() => screen.getByRole('button', { name: 'Thử lại' }).focus())
    render(<Harness onTriggerHidden={onTriggerHidden} />)
    const trigger = screen.getByRole('button', { name: 'Xem lỗi' })
    let width = 44
    Object.defineProperty(trigger, 'offsetWidth', { get: () => width })
    Object.defineProperty(trigger, 'offsetHeight', { get: () => width })
    const resize = () =>
      act(() => {
        for (const o of FakeResizeObserver.instances.filter((o) => o.targets.includes(trigger)))
          o.callback([], o as unknown as ResizeObserver)
      })

    resize() // a box while closed: nothing happens
    await userEvent.click(trigger)
    await screen.findByRole('dialog')
    resize() // still a box while open: stays open
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onTriggerHidden).not.toHaveBeenCalled()

    width = 0
    resize()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onTriggerHidden).toHaveBeenCalledTimes(1)
    // React Aria's own return (a frame later) leaves focus where the owner moved it.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    expect(screen.getByRole('button', { name: 'Thử lại' })).toHaveFocus()
    resize() // hidden while closed: no second call
    expect(onTriggerHidden).toHaveBeenCalledTimes(1)
  })

  it('an Esc close is not a hidden-trigger close', async () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    const onTriggerHidden = vi.fn()
    render(<Harness onTriggerHidden={onTriggerHidden} />)
    await userEvent.click(screen.getByRole('button', { name: 'Xem lỗi' }))
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onTriggerHidden).not.toHaveBeenCalled()
  })
})
