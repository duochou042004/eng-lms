import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { changeLocale } from '../../lib/i18n'
import { expectNoAxeViolations } from '../../test/axe'
import { renderRoute } from '../../test/render'
import { META, problem, server, sessionAs, sessionBody, setXsrfCookie } from '../../test/server'
import { openAccountMenu } from '../../test/shell'
import { setViewportWidth } from '../../test/viewport'

// T-M2.11 (app shells). jsdom has no layout: the breakpoints come from the matchMedia stub (test/viewport.ts).

const path = (router: ReturnType<typeof renderRoute>['router']) =>
  router.state.location.pathname + router.state.location.search
const h1 = (name: string) => screen.findByRole('heading', { level: 1, name })
const TUTOR_HOME = 'Hôm nay'
const STUDENT_HOME = 'Trang chủ'
const NOT_FOUND = 'Không tìm thấy trang'
/** The shell's top bar. (jsdom's role mapping makes PageHeader's `header` inside `main` a banner too; browsers do not.) */
const banner = () => document.querySelector<HTMLElement>('header:not(main header)')!

describe('AC1: nested shell routes, the guard before any child, the 404 inside the shell', () => {
  it.each([
    ['TUTOR', '/tutor', '/tutor/today', TUTOR_HOME],
    ['STUDENT', '/student', '/student/home', STUDENT_HOME],
  ] as const)('%s: %s redirects to %s', async (role, from, to, title) => {
    server.use(sessionAs(role))
    const { router } = renderRoute(from)
    await h1(title)
    expect(router.state.location.pathname).toBe(to)
  })

  it.each([
    ['TUTOR', '/tutor/nope', 'Điều hướng gia sư', '/tutor/today', 'Về Hôm nay'],
    ['STUDENT', '/student/a/b', 'Điều hướng học viên', '/student/home', 'Về Trang chủ'],
  ] as const)(
    '%s: %s renders the 404 inside the shell (navigation, a link naming the role home, title)',
    async (role, at, navLabel, home, linkName) => {
      server.use(sessionAs(role))
      const { container, router } = renderRoute(at)
      await h1(NOT_FOUND)
      expect(router.state.location.pathname).toBe(at)
      expect(screen.getByRole('navigation', { name: navLabel })).toBeInTheDocument()
      expect(banner()).toBeInTheDocument()
      // AC11 (g): the link names its destination by its nav label.
      expect(within(screen.getByRole('main')).getByRole('link', { name: linkName })).toHaveAttribute('href', home)
      expect(screen.getAllByRole('main')).toHaveLength(1)
      await waitFor(() => expect(document.title).toBe(`${NOT_FOUND} · Eng-LMS`))
      await screen.findByText(META.displayName)
      await expectNoAxeViolations(container)
    },
  )

  it('moves focus to the 404 h1 after a client-side navigation to an unknown shell path, and back to the page', async () => {
    server.use(sessionAs('TUTOR'))
    const { router } = renderRoute('/tutor/today')
    await h1(TUTOR_HOME)
    await act(() => router.navigate('/tutor/nope/deep'))
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: NOT_FOUND })).toHaveFocus())
    // A nav item leaves the 404 and moves focus to the page h1 (AC9).
    await userEvent.click(screen.getByRole('link', { name: 'Hôm nay' }))
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: TUTOR_HOME })).toHaveFocus())
    expect(router.state.location.pathname).toBe('/tutor/today')
  })

  it.each(['/tutor', '/student'])(
    'runs the guard before the index redirect: anonymous %s → /login?next=<it>',
    async (at) => {
      const { router } = renderRoute(at)
      await h1('Đăng nhập')
      expect(path(router)).toBe(`/login?next=${encodeURIComponent(at)}`)
    },
  )

  it('runs the guard first: anonymous /tutor/nope → /login?next=%2Ftutor%2Fnope', async () => {
    const { router } = renderRoute('/tutor/nope')
    await h1('Đăng nhập')
    expect(path(router)).toBe('/login?next=%2Ftutor%2Fnope')
    expect(screen.queryByRole('heading', { name: NOT_FOUND })).not.toBeInTheDocument()
  })

  it.each([
    ['STUDENT', '/tutor/nope'],
    ['TUTOR', '/student/a/b'],
  ] as const)('runs the guard first: a %s on %s → /forbidden', async (role, at) => {
    server.use(sessionAs(role))
    const { router } = renderRoute(at)
    await h1('Bạn không có quyền mở trang này')
    expect(router.state.location.pathname).toBe('/forbidden')
  })

  it('runs the guard first: a session that must change its password on /tutor/nope → /change-password', async () => {
    server.use(sessionAs('TUTOR', true))
    const { router } = renderRoute('/tutor/nope')
    await h1('Đổi mật khẩu')
    expect(router.state.location.pathname).toBe('/change-password')
  })

  it.each([
    ['TUTOR', '/tutor/nope', 'Back to Today'],
    ['STUDENT', '/student/nope', 'Back to Home'],
  ] as const)('AC11 (g) in English: %s on %s → "%s"', async (role, at, linkName) => {
    await changeLocale('en')
    server.use(sessionAs(role))
    renderRoute(at)
    await h1('Page not found')
    expect(within(screen.getByRole('main')).getByRole('link', { name: linkName })).toBeInTheDocument()
  })

  it('keeps the top-level 404 outside the shells', async () => {
    server.use(sessionAs('TUTOR'))
    renderRoute('/nope')
    await h1(NOT_FOUND)
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về trang đầu' })).toHaveAttribute('href', '/')
  })
})

describe('AC2: the tutor shell', () => {
  it('at ≥ 1024 px: a sidebar nav with Today current, the account menu button in the top bar, no menu button', async () => {
    setViewportWidth(1280)
    server.use(sessionAs('TUTOR'))
    const { container } = renderRoute('/tutor')
    await h1(TUTOR_HOME)
    const nav = screen.getByRole('navigation', { name: 'Điều hướng gia sư' })
    expect(within(nav).getByRole('link', { name: 'Hôm nay' })).toHaveAttribute('aria-current', 'page')
    expect(banner()).not.toContainElement(nav)
    expect(within(banner()).getByRole('button', { name: 'co-lan' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mở điều hướng' })).not.toBeInTheDocument()
    await screen.findByText(META.displayName)
    await expectNoAxeViolations(container)
  })

  it.each([360, 768])(
    'at %i px: the menu button opens the drawer (focus inside, contained, Esc and Close, focus back)',
    async (width) => {
      setViewportWidth(width)
      server.use(sessionAs('TUTOR'))
      renderRoute('/tutor/today')
      await h1(TUTOR_HOME)
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'co-lan' })).not.toBeInTheDocument()
      const menu = within(banner()).getByRole('button', { name: 'Mở điều hướng' })
      expect(menu).toHaveAttribute('aria-expanded', 'false')
      await userEvent.click(menu)
      const drawer = await screen.findByRole('dialog', { name: 'Điều hướng' })
      expect(menu).toHaveAttribute('aria-expanded', 'true')
      expect(drawer).toContainElement(document.activeElement as HTMLElement)
      expect(within(drawer).getByRole('navigation', { name: 'Điều hướng gia sư' })).toBeInTheDocument()
      expect(within(drawer).getByRole('link', { name: 'Hôm nay' })).toHaveAttribute('aria-current', 'page')
      // The account section in the footer, after the navigation.
      const footer = drawer.querySelector('.footer')!
      expect(within(footer as HTMLElement).getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument()
      for (let i = 0; i < 8; i++) {
        await userEvent.tab()
        expect(drawer).toContainElement(document.activeElement as HTMLElement)
      }
      await expectNoAxeViolations(document.body)
      await userEvent.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(menu).toHaveFocus())
      await userEvent.click(menu)
      await userEvent.click(await screen.findByRole('button', { name: 'Đóng' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(menu).toHaveFocus())
    },
  )

  it('choosing a drawer item navigates, closes the drawer and moves focus to the page h1', async () => {
    setViewportWidth(360)
    server.use(sessionAs('TUTOR'))
    const { router } = renderRoute('/tutor/nope')
    await h1(NOT_FOUND)
    await userEvent.click(screen.getByRole('button', { name: 'Mở điều hướng' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('link', { name: 'Hôm nay' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/tutor/today'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: TUTOR_HOME })).toHaveFocus())
  })

  it('closes the drawer on browser Back and when the viewport grows to the sidebar width', async () => {
    setViewportWidth(768)
    server.use(sessionAs('TUTOR'))
    const { router } = renderRoute(['/tutor/x', '/tutor/today'], 1)
    await h1(TUTOR_HOME)
    await userEvent.click(screen.getByRole('button', { name: 'Mở điều hướng' }))
    await screen.findByRole('dialog')
    await act(() => router.navigate(-1))
    await h1(NOT_FOUND)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Mở điều hướng' }))
    await screen.findByRole('dialog')
    act(() => setViewportWidth(1024))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('navigation', { name: 'Điều hướng gia sư' })).toBeInTheDocument()
  })
})

describe('AC3: the student shell', () => {
  it('below 768 px: bottom tabs Home (current) and More with visible labels; More opens a bottom sheet with the account section', async () => {
    setViewportWidth(360)
    server.use(sessionAs('STUDENT'))
    const { container } = renderRoute('/student')
    await h1(STUDENT_HOME)
    const tabs = screen.getByRole('navigation', { name: 'Điều hướng học viên' })
    expect(tabs).toHaveAttribute('data-bottom-tabs')
    expect(within(tabs).getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('aria-current', 'page')
    expect(within(tabs).getByRole('link', { name: 'Trang chủ' })).toHaveTextContent('Trang chủ')
    const more = within(tabs).getByRole('button', { name: 'Thêm' })
    expect(more).toHaveTextContent('Thêm')
    // Content is padded for the fixed bar (and the safe area): nothing sits behind it.
    expect(screen.getByRole('main')).toHaveClass('withTabs')
    expect(screen.queryByRole('button', { name: 'an.nguyen' })).not.toBeInTheDocument()
    await screen.findByText(META.displayName)
    await expectNoAxeViolations(container)
    await userEvent.click(more)
    const sheet = await screen.findByRole('dialog', { name: 'Thêm' })
    expect(document.querySelector('[data-placement="bottom"]')).not.toBeNull()
    expect(within(sheet).getByRole('radiogroup', { name: 'Ngôn ngữ' })).toBeInTheDocument()
    expect(within(sheet).getByRole('link', { name: 'Đổi mật khẩu' })).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument()
    await expectNoAxeViolations(document.body)
    await userEvent.click(within(sheet).getByRole('button', { name: 'Đóng' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(more).toHaveFocus())
  })

  it.each([768, 1280])('at %i px: a top bar with Home and the account menu button, no bottom tabs', async (width) => {
    setViewportWidth(width)
    server.use(sessionAs('STUDENT'))
    const { container } = renderRoute('/student/home')
    await h1(STUDENT_HOME)
    const bar = banner()
    const nav = within(bar).getByRole('navigation', { name: 'Điều hướng học viên' })
    expect(within(nav).getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('aria-current', 'page')
    expect(nav).not.toHaveAttribute('data-bottom-tabs')
    expect(within(bar).getByRole('button', { name: 'an.nguyen' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thêm' })).not.toBeInTheDocument()
    expect(screen.getByRole('main')).not.toHaveClass('withTabs')
    await screen.findByText(META.displayName)
    await expectNoAxeViolations(container)
  })
})

describe('AC4: the account section (popover, drawer footer, More sheet)', () => {
  async function openSection(where: 'popover' | 'drawer' | 'sheet') {
    if (where === 'popover') return openAccountMenu()
    await userEvent.click(screen.getByRole('button', { name: where === 'drawer' ? 'Mở điều hướng' : 'Thêm' }))
    return screen.findByRole('dialog')
  }
  const cases = [
    ['popover', 'TUTOR', 1280, '/tutor/today', 'co-lan'],
    ['drawer', 'TUTOR', 360, '/tutor/today', 'co-lan'],
    ['sheet', 'STUDENT', 360, '/student/home', 'an.nguyen'],
  ] as const

  it.each(cases)(
    '%s: the signed-in name, the switcher, Change password and Log out in the same visual kind',
    async (where, role, width, at, name) => {
      setViewportWidth(width)
      server.use(sessionAs(role))
      renderRoute(at)
      await screen.findByRole('heading', { level: 1 })
      const section = await openSection(where)
      expect(within(section).getByText(`Đã đăng nhập: ${name}`)).toBeInTheDocument()
      expect(within(section).getByRole('radiogroup', { name: 'Ngôn ngữ' })).toBeInTheDocument()
      const change = within(section).getByRole('link', { name: 'Đổi mật khẩu' })
      const logout = within(section).getByRole('button', { name: 'Đăng xuất' })
      expect(change).toHaveAttribute('href', '/change-password')
      for (const cls of ['button', 'secondary', 'md']) {
        expect(change).toHaveClass(cls)
        expect(logout).toHaveClass(cls)
      }
    },
  )

  it('shows the display name when there is one (else the username)', async () => {
    server.use(
      http.get('*/api/v1/auth/session', () => {
        setXsrfCookie()
        return HttpResponse.json({ ...sessionBody('TUTOR'), displayName: 'Cô Lan' })
      }),
    )
    renderRoute('/tutor/today')
    await h1(TUTOR_HOME)
    await userEvent.click(screen.getByRole('button', { name: 'Cô Lan' }))
    expect(await screen.findByText('Đã đăng nhập: Cô Lan')).toBeInTheDocument()
  })

  it.each(cases)(
    '%s: Change password opens /change-password (voluntary) and Cancel returns to the shell page',
    async (where, role, width, at) => {
      setViewportWidth(width)
      server.use(sessionAs(role))
      const { router } = renderRoute(at)
      await screen.findByRole('heading', { level: 1 })
      const section = await openSection(where)
      await userEvent.click(within(section).getByRole('link', { name: 'Đổi mật khẩu' }))
      await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Đổi mật khẩu' })).toHaveFocus())
      expect(screen.getByText('Sau khi đổi, bạn sẽ bị đăng xuất trên mọi thiết bị khác.')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))
      await waitFor(() => expect(router.state.location.pathname).toBe(at))
    },
  )

  it.each(cases)('%s: Log out in 2 steps ends at /login', async (where, role, width, at) => {
    setViewportWidth(width)
    let loggedOut = false
    server.use(
      http.get('*/api/v1/auth/session', () => {
        setXsrfCookie()
        return loggedOut ? problem(401, 'UNAUTHENTICATED') : HttpResponse.json(sessionBody(role))
      }),
      http.post('*/api/v1/auth/logout', () => {
        loggedOut = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { router } = renderRoute(at)
    await screen.findByRole('heading', { level: 1 })
    const section = await openSection(where) // step 1
    await userEvent.click(within(section).getByRole('button', { name: 'Đăng xuất' })) // step 2
    await h1('Đăng nhập')
    expect(router.state.location.pathname).toBe('/login')
    expect(loggedOut).toBe(true)
  })

  it('a language change re-renders the shell at once and keeps the popover open', async () => {
    server.use(sessionAs('TUTOR'))
    renderRoute('/tutor/today')
    await h1(TUTOR_HOME)
    const menu = await openAccountMenu()
    await userEvent.click(within(menu).getByRole('radio', { name: 'English' }))
    expect(await within(menu).findByText('Signed in as co-lan')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Account' })).toBe(menu)
    await userEvent.keyboard('{Escape}')
    expect(await h1('Today')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Tutor navigation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Today' })).toBeInTheDocument()
  })
})

describe('AC5: the workspace name, once, in the shells and on the public pages', () => {
  it.each(['/tutor/today', '/student/home'])(
    '%s: the home link shows the workspace name once; "Eng-LMS" is not next to it',
    async (at) => {
      server.use(sessionAs(at.startsWith('/tutor') ? 'TUTOR' : 'STUDENT'))
      renderRoute(at)
      await screen.findByText(META.displayName)
      const bar = banner()
      const home = within(bar).getByRole('link', { name: META.displayName })
      expect(home).toHaveAttribute('href', '/') // → the role home
      expect(home).toHaveAttribute('title', META.displayName)
      expect(within(bar).getAllByText(META.displayName)).toHaveLength(1)
      expect(bar).not.toHaveTextContent('Eng-LMS')
    },
  )

  it('while /meta loads the home link is there with the accessible name "Eng-LMS" and a busy skeleton; nothing interactive nested', async () => {
    server.use(
      sessionAs('TUTOR'),
      http.get('*/api/v1/meta', () => new Promise<never>(() => {})),
    )
    const { container } = renderRoute('/tutor/today')
    await h1(TUTOR_HOME)
    const home = within(banner()).getByRole('link', { name: 'Eng-LMS' })
    expect(within(home).getByRole('status', { name: 'Đang tải thông tin không gian dạy học' })).toHaveAttribute(
      'aria-busy',
      'true',
    )
    expect(within(home).getByTestId('skeleton')).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('after a /meta error: "Eng-LMS" in the link, the compact error with Retry beside it (never inside), Retry recovers', async () => {
    server.use(
      sessionAs('STUDENT'),
      http.get('*/api/v1/meta', () => problem(500, 'INTERNAL_ERROR')),
    )
    const { container } = renderRoute('/student/home')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Không tải được tên không gian dạy học')
    const home = within(banner()).getByRole('link', { name: 'Eng-LMS' })
    const retry = within(alert).getByRole('button', { name: 'Thử lại' })
    expect(home).not.toContainElement(retry)
    expect(home.querySelector('button, a, input')).toBeNull()
    await expectNoAxeViolations(container)
    server.resetHandlers()
    server.use(sessionAs('STUDENT'))
    await userEvent.click(retry)
    expect(await within(banner()).findByRole('link', { name: META.displayName })).toBeInTheDocument()
  })

  it.each([
    ['/login', null, 'Đăng nhập'],
    ['/change-password', 'TUTOR', 'Đổi mật khẩu'],
    ['/forbidden', 'STUDENT', 'Bạn không có quyền mở trang này'],
  ] as const)('%s shows the workspace name above the h1, in the toolbar row', async (at, role, title) => {
    server.use(sessionAs(role))
    const { container } = renderRoute(at)
    const heading = await h1(title)
    const name = await screen.findByText(META.displayName)
    expect(name).toHaveAttribute('title', META.displayName)
    expect(name.closest('.toolbar')).toContainElement(screen.getByRole('radiogroup', { name: 'Ngôn ngữ' }))
    expect(name.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await expectNoAxeViolations(container)
  })

  it('the public frame has the loading state and the compact error with Retry', async () => {
    server.use(http.get('*/api/v1/meta', () => problem(503, 'UNAVAILABLE')))
    renderRoute('/login')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Không tải được tên không gian dạy học')
    expect(alert.closest('.toolbar')).not.toBeNull()
    server.resetHandlers()
    server.use(http.get('*/api/v1/meta', () => new Promise<never>(() => {})))
    await userEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('status', { name: 'Đang tải thông tin không gian dạy học' })).toHaveAttribute(
      'aria-busy',
      'true',
    )
  })

  it('in English: meta.error says workspace (AC6)', async () => {
    await changeLocale('en')
    server.use(http.get('*/api/v1/meta', () => problem(500, 'INTERNAL_ERROR')))
    renderRoute('/login')
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load the workspace name")
  })
})

describe('AC9: keyboard path and landmarks', () => {
  it('skip link → navigation → account menu → Log out, one header, one main, distinct nav labels', async () => {
    setViewportWidth(1280)
    let loggedOut = false
    server.use(
      http.get('*/api/v1/auth/session', () => {
        setXsrfCookie()
        return loggedOut ? problem(401, 'UNAUTHENTICATED') : HttpResponse.json(sessionBody('TUTOR'))
      }),
      http.post('*/api/v1/auth/logout', () => {
        loggedOut = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderRoute('/tutor/today')
    await h1(TUTOR_HOME)
    await screen.findByText(META.displayName)
    expect(document.querySelectorAll('header:not(main header)')).toHaveLength(1)
    expect(screen.getAllByRole('main')).toHaveLength(1)
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Chuyển đến nội dung chính' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('link', { name: META.displayName })).toHaveFocus()
    await userEvent.tab()
    const account = screen.getByRole('button', { name: 'co-lan' })
    expect(account).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Hôm nay' })).toHaveFocus()
    await userEvent.tab({ shift: true })
    await userEvent.keyboard('{Enter}')
    const menu = await screen.findByRole('dialog', { name: 'Tài khoản' })
    const logout = within(menu).getByRole('button', { name: 'Đăng xuất' })
    for (let i = 0; i < 6 && document.activeElement !== logout; i++) await userEvent.tab()
    expect(logout).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await h1('Đăng nhập')
    expect(loggedOut).toBe(true)
  })
})

describe('AC11 (f): a frame change moves focus from body to the new frame trigger', () => {
  it.each([
    ['TUTOR', '/tutor/today', 768, 'Mở điều hướng', 1024, 'co-lan'],
    ['TUTOR', '/tutor/today', 1280, 'co-lan', 768, 'Mở điều hướng'],
    ['STUDENT', '/student/home', 360, 'Thêm', 768, 'an.nguyen'],
    ['STUDENT', '/student/home', 768, 'an.nguyen', 360, 'Thêm'],
  ] as const)(
    '%s on %s: overlay open at %i px (%s), resized to %i px → focus on "%s"',
    async (role, at, from, opener, to, next) => {
      setViewportWidth(from)
      server.use(sessionAs(role))
      renderRoute(at)
      await screen.findByRole('heading', { level: 1 })
      await userEvent.click(screen.getByRole('button', { name: opener }))
      await screen.findByRole('dialog')
      act(() => setViewportWidth(to))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(screen.getByRole('button', { name: next })).toHaveFocus())
    },
  )

  it('leaves focus alone when it is not on body, and does not move it on the first render', async () => {
    setViewportWidth(768)
    server.use(sessionAs('TUTOR'))
    renderRoute('/tutor/today')
    await h1(TUTOR_HOME)
    expect(document.activeElement).toBe(document.body)
    const home = await screen.findByRole('link', { name: META.displayName })
    home.focus()
    act(() => setViewportWidth(1024))
    await screen.findByRole('button', { name: 'co-lan' })
    expect(home).toHaveFocus()
  })
})

describe('AC11 (c): the compact meta error in a narrow shell top bar', () => {
  it('keeps the message inside the alert, describing Retry, with a decorative icon for the narrow layout', async () => {
    setViewportWidth(360)
    server.use(
      sessionAs('TUTOR'),
      http.get('*/api/v1/meta', () => problem(500, 'INTERNAL_ERROR')),
    )
    const { container } = renderRoute('/tutor/today')
    const alert = await screen.findByRole('alert')
    const retry = within(alert).getByRole('button', { name: 'Thử lại' })
    expect(retry).toHaveAccessibleDescription('Không tải được tên không gian dạy học')
    expect(alert).toHaveTextContent('Không tải được tên không gian dạy học')
    expect(alert.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    // UX-9 (T-M2.12): the icon's wrapper carries the message as its title (Retry sits right beside it, e2e).
    expect(alert.querySelector('svg')!.parentElement).toHaveAttribute('title', 'Không tải được tên không gian dạy học')
    // The shell makes the alert the size container the narrow rule queries (WorkspaceName.module.css).
    expect(alert.parentElement).toHaveClass('identity')
    await expectNoAxeViolations(container)
  })
})

describe('AC11 (i): an overlay closed by a frame change stays closed when the frame changes back', () => {
  it.each([
    ['TUTOR', '/tutor/today', 768, 'Mở điều hướng', 1280, 'co-lan'],
    ['STUDENT', '/student/home', 360, 'Thêm', 800, 'an.nguyen'],
  ] as const)(
    '%s on %s: open at %i px (%s), %i px and back → closed, focus on the trigger',
    async (role, at, narrow, opener, wide, account) => {
      setViewportWidth(narrow)
      server.use(sessionAs(role))
      renderRoute(at)
      await screen.findByRole('heading', { level: 1 })
      await userEvent.click(screen.getByRole('button', { name: opener }))
      await screen.findByRole('dialog')
      act(() => setViewportWidth(wide))
      await waitFor(() => expect(screen.getByRole('button', { name: account })).toHaveFocus())
      act(() => setViewportWidth(narrow))
      await waitFor(() => expect(screen.getByRole('button', { name: opener })).toHaveFocus())
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: opener })).toHaveAttribute('aria-expanded', 'false')
    },
  )
})
