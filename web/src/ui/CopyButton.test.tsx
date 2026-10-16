import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { CopyButton } from './CopyButton'

const props = {
  text: 'mật-khẩu-tạm',
  label: 'Sao chép',
  copiedMessage: 'Đã sao chép',
  failedMessage: 'Không sao chép được.',
}

describe('CopyButton', () => {
  it('writes the text to the clipboard and announces "Copied" politely', async () => {
    const user = userEvent.setup()
    const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    const { container } = render(<CopyButton {...props} accessibleLabel="Sao chép mật khẩu" />)
    const status = screen.getByRole('status')
    expect(status).toBeEmptyDOMElement()
    await user.click(screen.getByRole('button', { name: 'Sao chép mật khẩu' }))
    expect(write).toHaveBeenCalledWith('mật-khẩu-tạm')
    await waitFor(() => expect(status).toHaveTextContent('Đã sao chép'))
    await expectNoAxeViolations(container)
  })

  it('says how to copy by hand when the clipboard refuses', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    const { container } = render(<CopyButton {...props} />)
    await user.click(screen.getByRole('button', { name: 'Sao chép' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Không sao chép được.'))
    await expectNoAxeViolations(container)
  })

  it('says how to copy by hand where there is no clipboard (not a secure context)', async () => {
    const user = userEvent.setup()
    const original = Object.getOwnPropertyDescriptor(Navigator.prototype, 'clipboard')
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    try {
      render(<CopyButton {...props} />)
      await user.click(screen.getByRole('button', { name: 'Sao chép' }))
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Không sao chép được.'))
    } finally {
      delete (navigator as unknown as Record<string, unknown>).clipboard
      if (original) Object.defineProperty(Navigator.prototype, 'clipboard', original)
    }
  })

  it('works with the keyboard', async () => {
    const user = userEvent.setup()
    const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    render(<CopyButton {...props} />)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Sao chép' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(write).toHaveBeenCalledTimes(1)
  })
})
