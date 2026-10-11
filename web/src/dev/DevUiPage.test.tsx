import { screen, waitFor, within } from '@testing-library/react'
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
})
