import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { ErrorSummary } from './ErrorSummary'
import { TextField } from './TextField'

describe('ErrorSummary', () => {
  it('renders nothing without errors', () => {
    const { container } = render(<ErrorSummary title="Chưa lưu được" errors={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('is a named alert listing each error; field errors are links to their inputs', async () => {
    const { container } = render(
      <>
        <ErrorSummary
          title="Mật khẩu chưa được đổi"
          errors={[{ fieldId: 'new', message: 'Mật khẩu quá ngắn.' }, { message: 'Lỗi máy chủ.' }]}
        />
        <TextField id="new" label="Mật khẩu mới" />
      </>,
    )
    const summary = screen.getByRole('alert', { name: 'Mật khẩu chưa được đổi' })
    expect(summary).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('heading', { level: 2, name: 'Mật khẩu chưa được đổi' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mật khẩu quá ngắn.' })).toHaveAttribute('href', '#new')
    expect(screen.getByText('Lỗi máy chủ.').closest('a')).toBeNull()
    expect(summary.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    await expectNoAxeViolations(container)
  })

  it('renders its title as an h3 with headingLevel 3, with the same class as the default h2', () => {
    render(
      <>
        <ErrorSummary title="Mặc định" errors={[{ message: 'Lỗi.' }]} />
        <ErrorSummary headingLevel={3} title="Trong mục" errors={[{ message: 'Lỗi.' }]} />
      </>,
    )
    const h2 = screen.getByRole('heading', { level: 2, name: 'Mặc định' })
    const h3 = screen.getByRole('heading', { level: 3, name: 'Trong mục' })
    expect(h3.className).toBe(h2.className)
    expect(screen.getByRole('alert', { name: 'Trong mục' })).toContainElement(h3)
    expect(screen.queryByRole('heading', { level: 2, name: 'Trong mục' })).toBeNull()
  })

  it('takes focus through its ref, and a link moves focus to the field', async () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <>
        <ErrorSummary ref={ref} title="Chưa lưu" errors={[{ fieldId: 'name', message: 'Hãy nhập tên.' }]} />
        <TextField id="name" label="Tên" />
      </>,
    )
    ref.current!.focus()
    expect(screen.getByRole('alert')).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Hãy nhập tên.' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('textbox', { name: 'Tên' })).toHaveFocus()
    expect(window.location.hash).toBe('')
  })
})
