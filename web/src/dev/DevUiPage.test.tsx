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
    await expectNoAxeViolations(container)
  })
})
