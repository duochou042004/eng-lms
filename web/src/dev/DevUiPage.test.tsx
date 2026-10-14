import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { i18n } from '../lib/i18n'
import { expectNoAxeViolations } from '../test/axe'
import { renderRoute } from '../test/render'

describe('/dev/ui (development builds only)', () => {
  it('registers the dev namespace when its module loads and shows the translated gallery with the SegmentedControl', async () => {
    expect(i18n.hasResourceBundle('vi', 'dev')).toBe(false)
    const { container } = renderRoute('/dev/ui')
    expect(await screen.findByRole('heading', { level: 1, name: 'Thư viện thành phần' })).toBeInTheDocument()
    expect(i18n.hasResourceBundle('en', 'dev')).toBe(true)
    await waitFor(() => expect(document.title).toBe('Thư viện thành phần · Eng-LMS'))
    const view = screen.getByRole('radiogroup', { name: 'Chế độ xem' })
    expect(within(view).getByRole('radio', { name: 'Danh sách' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radiogroup', { name: 'Chế độ xem (không khả dụng)' })).toBeInTheDocument()
    expect(screen.getByText('Hãy nhập tên đăng nhập.')).toBeInTheDocument()
    // T-M2.4: PasswordField, Checkbox and ErrorSummary, each in its states.
    expect(screen.getAllByRole('button', { name: 'Hiện mật khẩu' })).toHaveLength(3)
    expect(screen.getByLabelText('Mật khẩu mới')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Mật khẩu (không khả dụng)')).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Nhận nhắc nhở' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Tôi đã đọc hướng dẫn' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('checkbox', { name: 'Tuỳ chọn không khả dụng' })).toBeDisabled()
    const summary = screen.getByRole('alert', { name: 'Mật khẩu chưa được đổi' })
    expect(within(summary).getByRole('link', { name: 'Hãy nhập mật khẩu hiện tại.' })).toHaveAttribute(
      'href',
      '#dev-summary-field',
    )
    await expectNoAxeViolations(container)
  })

  it('shows the T-M2.11 components: ButtonLink, NavList (vertical, horizontal), BottomTabs, Sheet and Popover', async () => {
    const { container } = renderRoute('/dev/ui')
    await screen.findByRole('heading', { level: 1, name: 'Thư viện thành phần' })
    expect(screen.getByRole('link', { name: 'Đổi mật khẩu' })).toHaveClass('button')
    const nav = screen.getByRole('navigation', { name: 'Điều hướng mẫu' })
    expect(within(nav).getByRole('link', { name: 'Hôm nay' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('navigation', { name: 'Điều hướng mẫu (ngang)' })).toBeInTheDocument()
    const tabs = screen.getByRole('navigation', { name: 'Thanh tab mẫu' })
    await userEvent.click(within(tabs).getByRole('button', { name: 'Thêm' }))
    expect(within(tabs).getByRole('button', { name: 'Thêm' })).toHaveAttribute('aria-expanded', 'true')
    await expectNoAxeViolations(container)

    await userEvent.click(screen.getByRole('button', { name: 'Mở sheet dưới' }))
    expect(await screen.findByRole('dialog', { name: 'Thêm' })).toBeInTheDocument()
    await expectNoAxeViolations(document.body)
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Mở ngăn điều hướng' }))
    expect(await screen.findByRole('dialog', { name: 'Điều hướng' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const long = screen.getByRole('button', { name: 'Nguyễn Thị Phương Lan Anh (tên rất dài)' })
    await userEvent.click(screen.getByRole('button', { name: 'Cô Lan' }))
    expect(await screen.findByRole('dialog', { name: 'Tài khoản mẫu' })).toBeInTheDocument()
    await expectNoAxeViolations(document.body)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(long).toBeInTheDocument()
  })

  it('shows the ProgressLine (T-M2.12) on demand: decorative, axe clean', async () => {
    const { container } = renderRoute('/dev/ui')
    await screen.findByRole('heading', { level: 1, name: 'Thư viện thành phần' })
    expect(screen.queryByTestId('progress-line')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Hiện đường tiến trình' }))
    expect(screen.getByTestId('progress-line')).toHaveAttribute('aria-hidden', 'true')
    await expectNoAxeViolations(container)
    await userEvent.click(screen.getByRole('button', { name: 'Ẩn đường tiến trình' }))
    expect(screen.queryByTestId('progress-line')).not.toBeInTheDocument()
  })
})
