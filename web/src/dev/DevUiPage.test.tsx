import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { i18n } from '../lib/i18n'
import { expectNoAxeViolations } from '../test/axe'
import { renderRoute } from '../test/render'

// The gallery grows with every ui/ component (T-M2.5 added eight): axe over the whole page takes seconds on a busy runner.
describe('/dev/ui (development builds only)', { timeout: 20_000 }, () => {
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

  it('shows the T-M2.5 components in their states: StatusBadge, SearchField, DataList, Disclosure, TextArea, CopyButton, ConfirmDialog, DescriptionList', async () => {
    const { container } = renderRoute('/dev/ui')
    await screen.findByRole('heading', { level: 1, name: 'Thư viện thành phần' })
    for (const label of ['Đang học', 'Tạm nghỉ', 'Đã lưu trữ'])
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    expect(screen.getByRole('searchbox', { name: 'Tìm kiếm' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Học viên mẫu' })).toBeInTheDocument()
    const trigger = screen.getByRole('button', { name: 'Liên hệ (không bắt buộc)' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('textbox', { name: 'Ghi chú (quá dài)' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('textbox', { name: 'Ghi chú (không khả dụng)' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sao chép tin nhắn' })).toBeInTheDocument()
    expect(screen.getByText('Chưa có')).toBeInTheDocument()
    await expectNoAxeViolations(container)
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Rời biểu mẫu' }))
    expect(await screen.findByRole('alertdialog', { name: 'Bỏ học viên này?' })).toBeInTheDocument()
    await expectNoAxeViolations(document.body)
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục nhập' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('shows the T-M2.14 components: Toast (with and without Undo), UnsavedChangesGuard and the ConfirmDialog variants', async () => {
    const { router } = renderRoute('/dev/ui')
    await screen.findByRole('heading', { level: 1, name: 'Thư viện thành phần' })
    await userEvent.click(screen.getByRole('button', { name: 'Hiện thông báo thành công' }))
    const region = await screen.findByRole('region', { name: 'Thông báo' })
    expect(within(region).getByRole('status')).toHaveTextContent('Đã lưu hồ sơ')
    await userEvent.click(screen.getByRole('button', { name: 'Hiện thông báo có Hoàn tác' }))
    await userEvent.click(within(region).getByRole('button', { name: 'Hoàn tác' }))
    await waitFor(() =>
      expect(
        within(region)
          .getAllByRole('status')
          .map((s) => s.textContent),
      ).toContain('Đã hoàn tác lưu trữ'),
    )
    await expectNoAxeViolations(document.body)

    await userEvent.click(screen.getByRole('button', { name: 'Mở hộp thoại xung đột (chính)' }))
    const conflict = await screen.findByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })
    expect(within(conflict).getByRole('button', { name: 'Tải lại' })).toHaveClass('primary')
    expect(within(conflict).getByRole('button', { name: 'Sao chép ghi chú của tôi' })).toBeInTheDocument()
    await userEvent.click(within(conflict).getByRole('button', { name: 'Huỷ' }))
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog', { name: /Đặt lại|Đã có thay đổi|Bỏ các/ })).not.toBeInTheDocument(),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Mở hộp thoại đang xử lý' }))
    const pending = await screen.findByRole('alertdialog', { name: 'Đặt lại mật khẩu cho Nguyễn Văn An?' })
    expect(within(pending).getByRole('button', { name: 'Đang đặt lại…' })).toHaveAttribute('aria-disabled', 'true')
    await userEvent.keyboard('{Escape}')
    expect(pending).toBeInTheDocument()
    await waitFor(
      () =>
        expect(screen.queryByRole('alertdialog', { name: /Đặt lại|Đã có thay đổi|Bỏ các/ })).not.toBeInTheDocument(),
      { timeout: 6000 },
    )
    await userEvent.click(screen.getByRole('button', { name: 'Mở hộp thoại có nội dung' }))
    expect(
      within(await screen.findByRole('alertdialog', { name: 'Đặt lại mật khẩu cho Nguyễn Văn An?' })).getByRole(
        'alert',
      ),
    ).toHaveTextContent('Không đặt lại được mật khẩu. Hãy thử lại.')
    await expectNoAxeViolations(document.body)
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog', { name: /Đặt lại|Đã có thay đổi|Bỏ các/ })).not.toBeInTheDocument(),
    )

    await userEvent.click(screen.getByText('Biểu mẫu mẫu này có thay đổi chưa lưu'))
    await userEvent.click(screen.getByRole('link', { name: 'Rời thư viện (về trang đầu)' }))
    const guard = await screen.findByRole('alertdialog', { name: 'Bỏ các thay đổi?' })
    await userEvent.click(within(guard).getByRole('button', { name: 'Tiếp tục sửa' }))
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog', { name: /Đặt lại|Đã có thay đổi|Bỏ các/ })).not.toBeInTheDocument(),
    )
    expect(router.state.location.pathname).toBe('/dev/ui')
  })

  it('shows the T-M2.17 TagInput (add, remove, its states) and TagList', async () => {
    const { container } = renderRoute('/dev/ui')
    await screen.findByRole('heading', { level: 1, name: 'Thư viện thành phần' })
    const tags = screen.getByRole('group', { name: 'Điểm mạnh' })
    const input = within(tags).getByRole('textbox', { name: 'Điểm mạnh' })
    await userEvent.type(input, 'Nói{Enter}')
    expect(within(tags).getByRole('button', { name: 'Xoá Nói' })).toBeInTheDocument()
    await userEvent.click(within(tags).getByRole('button', { name: 'Xoá Nghe' }))
    expect(within(tags).getByRole('button', { name: 'Xoá Phát âm' })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Điểm yếu' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('textbox', { name: 'Thẻ (không khả dụng)' })).toBeDisabled()
    await expectNoAxeViolations(container)
  })
})
