import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { i18n, LOCALE_STORAGE_KEY } from '../lib/i18n'
import { expectNoAxeViolations } from '../test/axe'
import { renderRoute } from '../test/render'
import { META, problem, server } from '../test/server'

describe('routes and shells', () => {
  it('starts in Vietnamese on the landing page with links to both shells', async () => {
    const { container } = renderRoute('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Không gian dạy học' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Khu vực gia sư' })).toHaveAttribute('href', '/tutor')
    expect(screen.getByRole('link', { name: 'Khu vực học viên' })).toHaveAttribute('href', '/student')
    expect(document.documentElement.lang).toBe('vi')
    await expectNoAxeViolations(container)
  })

  it.each([
    ['/tutor', 'Không gian gia sư'],
    ['/student', 'Trang của học viên'],
  ])('%s renders its shell with the workspace name from /api/v1/meta', async (path, title) => {
    const { container } = renderRoute(path)
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Đang tải thông tin không gian dạy học' })).toBeInTheDocument()
    expect(await screen.findByText(META.displayName)).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('shows an error alert with retry when /meta fails with Problem Details', async () => {
    server.use(http.get('*/api/v1/meta', () => problem(500, 'INTERNAL_ERROR')))
    const { container } = renderRoute('/tutor')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Không tải được thông tin không gian dạy học')
    server.resetHandlers()
    await userEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText(META.displayName)).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('renders a 404 page for unknown paths', async () => {
    const { container } = renderRoute('/khong-co')
    expect(await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy trang' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về trang đầu' })).toHaveAttribute('href', '/')
    await expectNoAxeViolations(container)
  })

  it('switches every visible string and <html lang> to English, and remembers the choice', async () => {
    renderRoute('/tutor')
    await screen.findByText(META.displayName)
    const english = screen.getByRole('button', { name: 'English' })
    expect(english).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(english)
    expect(await screen.findByRole('heading', { level: 1, name: 'Tutor workspace' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Nothing here yet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    expect(i18n.language).toBe('en')
  })

  it('offers a skip link to the main landmark', async () => {
    renderRoute('/student')
    await screen.findByRole('heading', { level: 1 })
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Bỏ qua, đến nội dung chính' })).toHaveFocus()
    await waitFor(() => expect(screen.getByRole('main')).toHaveAttribute('id', 'main'))
  })
})
