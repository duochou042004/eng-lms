import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { i18n, LOCALE_STORAGE_KEY } from '../lib/i18n'
import { expectNoAxeViolations } from '../test/axe'
import { renderRoute } from '../test/render'
import { META, problem, server, sessionAs } from '../test/server'
import { openAccountMenu } from '../test/shell'

describe('routes and shells', () => {
  it('starts in Vietnamese: an anonymous visit to / lands on the sign-in page (no landing page, T-M2.4)', async () => {
    const { container, router } = renderRoute('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(screen.getByRole('radiogroup', { name: 'Ngôn ngữ' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('vi')
    await expectNoAxeViolations(container)
  })

  it.each([
    ['TUTOR', '/tutor/today', 'Hôm nay'],
    ['STUDENT', '/student/home', 'Trang chủ'],
  ] as const)('/ sends a signed-in %s to the role home %s', async (role, home, title) => {
    server.use(sessionAs(role))
    const { router } = renderRoute('/')
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(home)
  })

  it.each([
    ['/tutor', 'TUTOR', 'Hôm nay'],
    ['/student', 'STUDENT', 'Trang chủ'],
  ] as const)('%s renders its shell with the workspace name from /api/v1/meta', async (path, role, title) => {
    server.use(sessionAs(role))
    const { container } = renderRoute(path)
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Đang tải thông tin không gian dạy học' })).toBeInTheDocument()
    expect(await screen.findByText(META.displayName)).toBeInTheDocument()
    await expectNoAxeViolations(container)
    // T-M2.4: the "Change password" link and "Log out" control; T-M2.11: in the account menu.
    const menu = await openAccountMenu(role)
    expect(within(menu).getByRole('link', { name: 'Đổi mật khẩu' })).toHaveAttribute('href', '/change-password')
    expect(within(menu).getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument()
    await expectNoAxeViolations(document.body)
  })

  it('shows an error alert with retry when /meta fails with Problem Details', async () => {
    server.use(
      sessionAs('TUTOR'),
      http.get('*/api/v1/meta', () => problem(500, 'INTERNAL_ERROR')),
    )
    const { container } = renderRoute('/tutor')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Không tải được tên không gian dạy học')
    server.resetHandlers()
    server.use(sessionAs('TUTOR'))
    await userEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText(META.displayName)).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('renders a 404 page for unknown paths', async () => {
    const { container } = renderRoute('/khong-co')
    expect(await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy trang' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về trang đầu' })).toHaveAttribute('href', '/')
    expect(screen.getAllByRole('heading', { name: 'Không tìm thấy trang' })).toHaveLength(1)
    await expectNoAxeViolations(container)
  })

  it('switches every visible string and <html lang> to English, and remembers the choice', async () => {
    server.use(sessionAs('TUTOR'))
    renderRoute('/tutor')
    await screen.findByText(META.displayName)
    await openAccountMenu() // T-M2.11: the shell's switcher is in the account section
    // A SegmentedControl: a radiogroup named "Ngôn ngữ" with radio segments (aria-checked), T-M1.9 AC3.
    const group = screen.getByRole('radiogroup', { name: 'Ngôn ngữ' })
    const english = within(group).getByRole('radio', { name: 'English' })
    expect(english).toHaveAttribute('aria-checked', 'false')
    expect(within(group).getByRole('radio', { name: 'Tiếng Việt' })).toHaveAttribute('aria-checked', 'true')
    expect(english).toHaveAttribute('lang', 'en')
    expect(within(group).getByRole('radio', { name: 'Tiếng Việt' })).toHaveAttribute('lang', 'vi')
    await userEvent.click(english)
    // The account popover stays open (modal: the page behind it is hidden from assistive technology meanwhile).
    expect(await screen.findByRole('link', { name: 'Change password' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
    const groupEn = screen.getByRole('radiogroup', { name: 'Language' })
    expect(within(groupEn).getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true')
    expect(within(groupEn).getByRole('radio', { name: 'Tiếng Việt' })).toHaveAttribute('aria-checked', 'false')
    await userEvent.keyboard('{Escape}')
    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Nothing here yet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    expect(i18n.language).toBe('en')
  })

  it('offers a skip link to the main landmark', async () => {
    server.use(sessionAs('STUDENT'))
    renderRoute('/student')
    await screen.findByRole('heading', { level: 1 })
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Chuyển đến nội dung chính' })).toHaveFocus()
    await waitFor(() => expect(screen.getByRole('main')).toHaveAttribute('id', 'main'))
  })
})
