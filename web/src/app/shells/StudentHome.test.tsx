import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { changeLocale } from '../../lib/i18n'
import { expectNoAxeViolations } from '../../test/axe'
import { renderRoute } from '../../test/render'
import { problem, server, sessionAs, sessionBody, setXsrfCookie, STUDENT_ACCOUNT } from '../../test/server'
import { openAccountMenu } from '../../test/shell'
import { setViewportWidth } from '../../test/viewport'

// T-M2.7 Home v0 (AC3, AC4) and the account section's Account link (AC5).

const h1 = (name: string) => screen.findByRole('heading', { level: 1, name })
// 02:00 UTC: 09:00 in Ho Chi Minh City (the MSW session's zone), 18:00 the day before in Los Angeles.
const INSTANT = new Date('2026-11-26T02:00:00Z')

function studentIn(timeZone: string) {
  server.use(
    http.get('*/api/v1/auth/session', () => {
      setXsrfCookie()
      return HttpResponse.json({ ...sessionBody('STUDENT'), timeZone })
    }),
  )
}

afterEach(async () => {
  vi.useRealTimers()
  await changeLocale('vi')
})

describe('T-M2.7 AC3: the Home greeting', () => {
  it.each([
    ['Asia/Ho_Chi_Minh', 'Chào buổi sáng, Nguyễn Văn An'],
    ['America/Los_Angeles', 'Chào buổi tối, Nguyễn Văn An'],
  ])('in %s: the h1 stays Trang chủ and the greeting is a paragraph with the band of the zone', async (zone, text) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(INSTANT)
    studentIn(zone)
    const { container } = renderRoute('/student/home')
    await h1('Trang chủ')
    const greeting = await screen.findByText(text)
    expect(greeting.tagName).toBe('P')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Chưa có gì ở đây' })).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('in English: "Good afternoon, <name>"', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-26T08:00:00Z')) // 15:00 in Ho Chi Minh City
    await changeLocale('en')
    server.use(sessionAs('STUDENT'))
    renderRoute('/student/home')
    await h1('Home')
    expect(await screen.findByText(`Good afternoon, ${STUDENT_ACCOUNT.fullName}`)).toBeInTheDocument()
  })
})

describe('T-M2.7 AC4: the name is decorative', () => {
  it('while the account read is pending: the greeting without a name, no alert, the empty state', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(INSTANT)
    server.use(
      sessionAs('STUDENT'),
      http.get('*/api/v1/student/account', async () => {
        await delay('infinite')
        return HttpResponse.json(STUDENT_ACCOUNT)
      }),
    )
    renderRoute('/student/home')
    await h1('Trang chủ')
    expect(screen.getByText('Chào buổi sáng!')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Chưa có gì ở đây' })).toBeInTheDocument()
  })

  it('when the read fails: still the greeting without a name and no alert', async () => {
    let calls = 0
    server.use(
      sessionAs('STUDENT'),
      http.get('*/api/v1/student/account', () => {
        calls += 1
        return problem(500, 'INTERNAL')
      }),
    )
    renderRoute('/student/home')
    await h1('Trang chủ')
    await waitFor(() => expect(calls).toBeGreaterThan(0))
    expect(screen.getByText(/^Chào buổi (sáng|chiều|tối)!$/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Chưa có gì ở đây' })).toBeInTheDocument()
  })
})

describe('T-M2.7 AC5: the Account link in the account section', () => {
  it('a student, More sheet below 768 px: Account above Change password; it closes the sheet and focuses the h1', async () => {
    setViewportWidth(360)
    server.use(sessionAs('STUDENT'))
    const { router } = renderRoute('/student/home')
    await h1('Trang chủ')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm' }))
    const sheet = await screen.findByRole('dialog', { name: 'Thêm' })
    const links = within(sheet).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Tài khoản', 'Đổi mật khẩu'])
    expect(links[0]).toHaveAttribute('href', '/student/account')
    await userEvent.click(links[0]!)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(router.state.location.pathname).toBe('/student/account'))
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Tài khoản' })).toHaveFocus())
    // The nav items stay Home (and More).
    const tabs = screen.getByRole('navigation', { name: 'Điều hướng học viên' })
    expect(
      within(tabs)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Trang chủ'])
  })

  it('a student, account popover at ≥ 768 px: the link closes the popover and opens the page', async () => {
    server.use(sessionAs('STUDENT'))
    const { router } = renderRoute('/student/home')
    await h1('Trang chủ')
    const popover = await openAccountMenu('STUDENT')
    await userEvent.click(within(popover).getByRole('link', { name: 'Tài khoản' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(router.state.location.pathname).toBe('/student/account'))
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Tài khoản' })).toHaveFocus())
  })

  it('the tutor has no Account link in the account section', async () => {
    server.use(sessionAs('TUTOR'))
    renderRoute('/tutor/today')
    await h1('Hôm nay')
    const popover = await openAccountMenu('TUTOR')
    expect(
      within(popover)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Đổi mật khẩu'])
  })
})
