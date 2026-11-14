import type { Browser, Page, TestInfo } from '@playwright/test'
import {
  ANONYMOUS,
  apiChangePassword,
  apiSignIn,
  createStudent,
  generatePassword,
  signInWithForm,
  STUDENT_STATE,
  TUTOR_STATE,
  TUTOR_USERNAME,
  tutorPassword,
  type Credentials,
} from '../support/auth'
import {
  expectFocusNotLost,
  expectNoAxeViolations,
  expectNoHorizontalScroll,
  expectNoMidWordBreak,
  expectSettledAccessible,
} from '../support/checks'
import { evidenceRecord, evidenceShot } from '../support/evidence'
import { expect, test } from '../support/fixtures'
import { openAccountSection } from '../support/shell'

// T-M2.12 (DEC-116): navigation feedback (AC1), the chunk-load error page and its Retry (AC2, AC3), the cross-tab
// sign-in/out (AC5, AC6), the narrow top bar's meta error (AC8, UX-9) and axe on the new states (AC9). The stored
// sessions are never logged out: the cross-tab cases use a fresh tutor sign-in and new students (T-M2.4 scope 10).

const h1 = (page: Page, name: string) => page.getByRole('heading', { level: 1, name })
const shot = (page: Page, testInfo: TestInfo, name: string) => evidenceShot(page, testInfo, name, 'impl')
const COPY = {
  vi: {
    loading: 'Đang tải trang',
    offlineTitle: 'Bạn đang ngoại tuyến',
    chunkTitle: 'Không tải được trang này',
    // T-M2.13 scope 4 (UX-6): the descriptions no longer repeat the h1; the offline Retry announces the full text.
    offline: 'Trang này cần kết nối mạng để tải.',
    chunk: 'Hãy kiểm tra kết nối mạng rồi thử lại.',
    offlineAnnouncement: 'Bạn đang ngoại tuyến. Trang này cần kết nối mạng để tải.',
    retry: 'Thử lại',
    startPage: 'Về trang đầu',
    forbidden: 'Bạn không có quyền mở trang này',
    yourHome: 'Về trang chính của bạn',
    tutorHome: 'Hôm nay',
    studentHome: 'Trang chủ',
    login: 'Đăng nhập',
    change: 'Đổi mật khẩu',
    logout: 'Đăng xuất',
    metaError: 'Không tải được tên không gian dạy học',
    metaErrorDetails: 'Xem lỗi',
    signedOutElsewhere: 'Bạn đã đăng xuất ở một thẻ khác.',
    language: 'Tiếng Việt',
  },
  en: {
    loading: 'Loading the page',
    offlineTitle: "You're offline",
    chunkTitle: "This page couldn't load",
    offline: 'This page needs a connection to load.',
    chunk: 'Check your connection and try again.',
    offlineAnnouncement: "You're offline. This page needs a connection to load.",
    retry: 'Try again',
    startPage: 'Go to the start page',
    forbidden: "You don't have access to this page",
    yourHome: 'Go to your home page',
    tutorHome: 'Today',
    studentHome: 'Home',
    login: 'Sign in',
    change: 'Change password',
    logout: 'Log out',
    metaError: "Couldn't load the workspace name",
    metaErrorDetails: 'Show the error',
    signedOutElsewhere: 'You were signed out in another tab.',
    language: 'English',
  },
} as const
const CHUNK = {
  tutor: /\/assets\/TutorShell-[^/]+\.js$/,
  student: /\/assets\/StudentShell-[^/]+\.js$/,
}
const SLOW_MS = 1500

/** The root layout's navigation status region (the page's own status regions are inside `main`). */
const navigationStatus = (page: Page) => page.locator('#root > output')

/** Removes the console entries a test provokes on purpose (a failed chunk or API request). */
function accept(consoleGuard: string[], matches: (entry: string) => boolean) {
  for (let i = consoleGuard.length - 1; i >= 0; i--) if (matches(consoleGuard[i]!)) consoleGuard.splice(i, 1)
}

/** Records, in the page, when a click happened and when the progress line first appeared after it. */
async function watchProgressLine(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as {
      __nav: { click: number | null; line: number | null }
    }
    w.__nav = { click: null, line: null }
    document.addEventListener('click', () => (w.__nav.click ??= performance.now()), { capture: true })
    new MutationObserver(() => {
      if (w.__nav.line === null && document.querySelector('[data-testid="progress-line"]'))
        w.__nav.line = performance.now()
    }).observe(document.body, { childList: true, subtree: true })
  })
  return () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            __nav: { click: number | null; line: number | null }
          }
        ).__nav,
    )
}

/** Switches the language with the public pages' switcher. */
async function chooseLanguage(page: Page, lang: 'vi' | 'en') {
  await page.getByRole('radio', { name: COPY[lang].language, exact: true }).click()
}

test.describe('AC1: navigation feedback (DEC-073)', () => {
  test.use({ storageState: TUTOR_STATE })

  for (const lang of ['vi', 'en'] as const) {
    const c = COPY[lang]
    test(`[${lang}] a slow navigation shows the progress line and "Loading the page" after 150 ms; the page stays; a fast one shows nothing`, async ({
      page,
    }, testInfo) => {
      await page.goto('/forbidden')
      await expect(h1(page, COPY.vi.forbidden)).toBeVisible()
      if (lang === 'en') await chooseLanguage(page, 'en')
      await expect(h1(page, c.forbidden)).toBeVisible()
      let release: () => void = () => {}
      const released = new Promise<void>((resolve) => (release = resolve))
      await page.route(CHUNK.tutor, async (route) => {
        await Promise.race([released, new Promise((resolve) => setTimeout(resolve, SLOW_MS))])
        await route.continue()
      })
      const nav = await watchProgressLine(page)
      const link = page.getByRole('link', { name: c.yourHome })
      await link.click()
      const line = page.getByTestId('progress-line')
      await expect(line).toBeAttached()
      await expect(navigationStatus(page)).toHaveText(c.loading)
      // The previous page stays visible, and focus stays on the activated link until the new page renders.
      await expect(h1(page, c.forbidden)).toBeVisible()
      await expect(link).toBeFocused()
      await expect(line).toHaveAttribute('aria-hidden', 'true')
      const lineBox = (await line.boundingBox())!
      expect(lineBox.y, 'at the top edge').toBe(0)
      expect(lineBox.width, 'the full width').toBe(page.viewportSize()!.width)
      await expectNoAxeViolations(page)
      await expectNoHorizontalScroll(page)
      await shot(page, testInfo, `progress-line-slow-navigation-${lang}`)
      const timing = await nav()
      release()

      await expect(h1(page, c.tutorHome)).toBeFocused()
      await expect(line).toHaveCount(0)
      await expect(navigationStatus(page)).toHaveText('')
      const delay = timing.line! - timing.click!
      await evidenceRecord(testInfo, `ac1-progress-line-delay-${lang}`, {
        clickToLineMs: delay,
        minimumMs: 150,
      })
      // The 150 ms timer starts with the navigation, after the click; performance.now() may round by a fraction of a ms.
      expect(delay, 'the line shows only after 150 ms').toBeGreaterThanOrEqual(149.9)

      // A navigation that settles at once (the forbidden page's module is cached): nothing shows.
      const back = await watchProgressLine(page)
      await page.goBack()
      await expect(h1(page, c.forbidden)).toBeFocused()
      await page.waitForTimeout(300)
      expect((await back()).line, 'no progress line for a fast navigation').toBeNull()
      await expect(navigationStatus(page)).toHaveText('')
    })
  }

  test('with reduced motion the line is static; without, it moves', async ({ page }) => {
    const names: Record<string, string> = {}
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      await page.emulateMedia({ reducedMotion })
      await page.goto('/forbidden')
      await expect(h1(page, COPY.vi.forbidden)).toBeVisible()
      let release: () => void = () => {}
      const released = new Promise<void>((resolve) => (release = resolve))
      await page.route(CHUNK.tutor, async (route) => {
        await released
        await route.continue()
      })
      await page.getByRole('link', { name: COPY.vi.yourHome }).click()
      const bar = page.getByTestId('progress-line').locator('div')
      await expect(bar).toBeAttached()
      names[reducedMotion] = await bar.evaluate((el) => getComputedStyle(el).animationName)
      if (reducedMotion === 'reduce')
        expect((await bar.boundingBox())!.width, 'a static full-width line').toBe(page.viewportSize()!.width)
      release()
      await expect(h1(page, COPY.vi.tutorHome)).toBeVisible()
      await page.unroute(CHUNK.tutor)
    }
    expect(names['no-preference']).not.toBe('none')
    expect(names.reduce).toBe('none')
  })
})

test.describe('AC2, AC3: a page whose code cannot load (DEC-087 F-3)', () => {
  test.use({ storageState: STUDENT_STATE })

  for (const lang of ['vi', 'en'] as const) {
    const c = COPY[lang]

    test(`[${lang}] offline: the offline page with Retry and the start-page link; Retry offline sends nothing; online it loads the page in full`, async ({
      page,
      context,
      consoleGuard,
    }, testInfo) => {
      await page.goto('/forbidden')
      await expect(h1(page, COPY.vi.forbidden)).toBeVisible()
      if (lang === 'en') await chooseLanguage(page, 'en')
      await expect(h1(page, c.forbidden)).toBeVisible()
      await context.setOffline(true)
      await page.getByRole('link', { name: c.yourHome }).click()
      // Within the navigation: no endless busy state.
      await expect(h1(page, c.offlineTitle)).toBeFocused({ timeout: 5000 })
      await expect(page).toHaveTitle(`${c.offlineTitle} · Eng-LMS`)
      await expect(page.getByText(c.offline, { exact: true })).toBeVisible()
      const retry = page.getByRole('button', { name: c.retry })
      await expect(retry).toBeVisible()
      // AC11 (c): Retry has the primary style (the accent fill), the start-page link stays a quiet link.
      await expect(retry).toHaveClass(/primary/)
      await expect(page.getByRole('link', { name: c.startPage })).toHaveAttribute('href', '/')
      await expect(page.getByTestId('progress-line')).toHaveCount(0)
      expect(new URL(page.url()).pathname).toBe('/student/home')
      await expectNoAxeViolations(page)
      await expectNoHorizontalScroll(page)
      await shot(page, testInfo, `chunk-offline-${lang}`)

      const requests: string[] = []
      page.on('request', (request) => requests.push(request.url()))
      await page.getByRole('button', { name: c.retry }).click()
      await expect(page.getByRole('main').getByRole('status')).toHaveText(c.offlineAnnouncement)
      await page.waitForTimeout(300)
      expect(requests, 'Retry while offline sends no request').toEqual([])
      await expect(h1(page, c.offlineTitle)).toBeVisible()

      // AC11 (a): back online, the copy follows without any action (and nothing reloads).
      await context.setOffline(false)
      await expect(h1(page, c.chunkTitle)).toBeVisible()
      await expect(page.getByText(c.chunk, { exact: true })).toBeVisible()
      await expect(page).toHaveTitle(`${c.chunkTitle} · Eng-LMS`)
      await shot(page, testInfo, `chunk-back-online-${lang}`)
      await context.setOffline(true)
      await expect(h1(page, c.offlineTitle)).toBeVisible()
      await context.setOffline(false)
      await expect(h1(page, c.chunkTitle)).toBeVisible()
      await page.getByRole('button', { name: c.retry }).click()
      await expect(h1(page, c.studentHome)).toBeVisible()
      expect(new URL(page.url()).pathname).toBe('/student/home')
      expect(await page.evaluate(() => document.documentElement.lang)).toBe(lang)
      accept(consoleGuard, (e) => /ERR_INTERNET_DISCONNECTED|StudentShell/.test(e))
    })

    test(`[${lang}] online, the chunk request fails: the couldn't-load page; Retry loads it in full`, async ({
      page,
      consoleGuard,
    }, testInfo) => {
      await page.goto('/forbidden')
      await expect(h1(page, COPY.vi.forbidden)).toBeVisible()
      if (lang === 'en') await chooseLanguage(page, 'en')
      await page.route(CHUNK.student, (route) => route.abort())
      await page.getByRole('link', { name: c.yourHome }).click()
      await expect(h1(page, c.chunkTitle)).toBeFocused({ timeout: 5000 })
      await expect(page).toHaveTitle(`${c.chunkTitle} · Eng-LMS`)
      await expect(page.getByText(c.chunk, { exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: c.startPage })).toBeVisible()
      await expectNoAxeViolations(page)
      await expectNoHorizontalScroll(page)
      await shot(page, testInfo, `chunk-failed-${lang}`)
      await page.unroute(CHUNK.student)
      await page.getByRole('button', { name: c.retry }).click()
      await expect(h1(page, c.studentHome)).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.lang)).toBe(lang)
      accept(consoleGuard, (e) => /ERR_FAILED|StudentShell/.test(e))
    })
  }
})

/** A page on the app's origin signed in as the E2E tutor (its stored session), for API set-up calls. */
async function newStudentCredentials(browser: Browser, testInfo: TestInfo, ready: boolean): Promise<Credentials> {
  const context = await browser.newContext({ storageState: TUTOR_STATE })
  const page = await context.newPage()
  await page.goto('/tutor')
  await expect(h1(page, COPY.vi.tutorHome)).toBeVisible()
  const temporary = await createStudent(page, testInfo.project.name)
  await context.close()
  if (!ready) return temporary
  const studentContext = await browser.newContext({ storageState: ANONYMOUS })
  const studentPage = await studentContext.newPage()
  await studentPage.goto('/login')
  expect((await apiSignIn(studentPage, temporary)).status).toBe(200)
  const changed = await apiChangePassword(studentPage, temporary)
  await studentContext.close()
  return changed
}

/** Two tabs of one browser (one cookie jar), both on `/login`. */
async function twoTabs(browser: Browser) {
  const context = await browser.newContext({ storageState: ANONYMOUS })
  const a = await context.newPage()
  const b = await context.newPage()
  for (const page of [a, b]) {
    await page.goto('/login')
    await expect(h1(page, COPY.vi.login)).toBeVisible()
  }
  return { context, a, b }
}

const tutor = (): Credentials => ({
  username: TUTOR_USERNAME,
  password: tutorPassword(),
})

/** Records every h1 text `page` shows from now on. */
async function recordHeadings(page: Page) {
  await page.evaluate(() => {
    const seen: string[] = []
    Object.assign(window, { __h1: seen })
    new MutationObserver(() => {
      const text = document.querySelector('h1')?.textContent ?? ''
      if (seen.at(-1) !== text) seen.push(text)
    }).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  })
  return () => page.evaluate(() => (window as unknown as { __h1: string[] }).__h1)
}

/** T-M2.13 AC2, AC6: the cross-tab sign-out notice on /login, a status above the form; never focused. */
async function expectSignedOutNotice(page: Page, testInfo: TestInfo, lang: 'vi' | 'en') {
  const notice = page.getByRole('status').filter({ hasText: COPY[lang].signedOutElsewhere })
  await expect(notice).toBeVisible()
  await expect(notice).toHaveText(COPY[lang].signedOutElsewhere)
  const noticeBox = (await notice.boundingBox())!
  const formBox = (await page.locator('form').boundingBox())!
  expect(noticeBox.y + noticeBox.height, 'the notice is above the form').toBeLessThanOrEqual(formBox.y)
  await expect(h1(page, COPY[lang].login)).toBeFocused()
  await expectSettledAccessible(page)
  if (lang === 'vi' && testInfo.project.name === 'phone-small') await expectNoMidWordBreak(notice)
  await shot(page, testInfo, `cross-tab-signed-out-notice-${lang}`)
}

test.describe('AC5, AC6: cross-tab sign-in and sign-out (S4-2)', () => {
  test('log out in tab B: tab A on /tutor/today goes to /login?next=%2Ftutor%2Ftoday without user action (AC5)', async ({
    browser,
  }, testInfo) => {
    const { context, a, b } = await twoTabs(browser)
    await signInWithForm(b, tutor())
    await expect(h1(b, COPY.vi.tutorHome)).toBeVisible()
    await a.goto('/tutor/today')
    await expect(h1(a, COPY.vi.tutorHome)).toBeVisible()
    const dialog = await openAccountSection(b, 'tutor')
    await dialog.getByRole('button', { name: COPY.vi.logout }).click()
    await expect(h1(b, COPY.vi.login)).toBeVisible()
    await expect(a).toHaveURL(/\/login\?next=%2Ftutor%2Ftoday$/)
    await expect(h1(a, COPY.vi.login)).toBeVisible()
    await expect(a.getByRole('banner')).toHaveCount(0) // no shell (and no tutor data) left in tab A
    // T-M2.13 AC2 (UX-4): the page says why it shows, as a status above the form; the route focus is on the h1.
    await expectSignedOutNotice(a, testInfo, 'vi')
    await a.goBack()
    // Back after a cross-tab sign-out: the guard asks to sign in again, no cached tutor page.
    await expect(h1(a, COPY.vi.login)).toBeVisible()
    await shot(a, testInfo, 'cross-tab-signed-out-tab-a-vi')
    await context.close()
  })

  test('[en] log out in tab B: tab A on /tutor/today shows the notice in English (T-M2.13 AC2)', async ({
    browser,
  }, testInfo) => {
    const { context, a, b } = await twoTabs(browser)
    // Tab A's language (stored for the browser; tab B keeps the vi it loaded with).
    await chooseLanguage(a, 'en')
    await signInWithForm(b, tutor())
    await expect(h1(b, COPY.vi.tutorHome)).toBeVisible()
    await a.goto('/tutor/today')
    await expect(h1(a, COPY.en.tutorHome)).toBeVisible()
    const dialog = await openAccountSection(b, 'tutor')
    await dialog.getByRole('button', { name: COPY.vi.logout }).click()
    await expect(a).toHaveURL(/\/login\?next=%2Ftutor%2Ftoday$/)
    await expect(h1(a, COPY.en.login)).toBeVisible()
    await expectSignedOutNotice(a, testInfo, 'en')
    await context.close()
  })

  test('tab A on /tutor/students (its list query answers 401 during the follow): one navigation, with the notice; a sign-in submit hides it (T-M2.13 AC2, G0 D-1)', async ({
    browser,
    consoleGuard,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'laptop', 'checked at laptop')
    const { context, a, b } = await twoTabs(browser)
    await signInWithForm(b, tutor())
    await expect(h1(b, COPY.vi.tutorHome)).toBeVisible()
    await a.goto('/tutor/students')
    await expect(h1(a, 'Học viên')).toBeVisible()
    const unauthenticated: string[] = []
    a.on('response', (response) => {
      if (response.status() === 401 && !response.url().includes('/api/v1/auth/session'))
        unauthenticated.push(response.url())
    })
    // Every history entry the SPA pushes from now on.
    await a.evaluate(() => {
      const pushed: string[] = []
      Object.assign(window, { __pushed: pushed })
      const push = history.pushState.bind(history)
      history.pushState = (data, unused, url) => {
        pushed.push(String(url))
        push(data, unused, url)
      }
    })
    const dialog = await openAccountSection(b, 'tutor')
    await dialog.getByRole('button', { name: COPY.vi.logout }).click()
    await expect(a).toHaveURL(/\/login\?next=%2Ftutor%2Fstudents$/)
    await expect(h1(a, COPY.vi.login)).toBeVisible()
    const notice = a.getByRole('status').filter({ hasText: COPY.vi.signedOutElsewhere })
    await expect(notice).toBeVisible()
    await a.waitForTimeout(500)
    const pushed = await a.evaluate(() => (window as unknown as { __pushed: string[] }).__pushed)
    expect(pushed, 'tab A navigates once').toEqual(['/login?next=%2Ftutor%2Fstudents'])
    await evidenceRecord(testInfo, 'cross-tab-students-navigations', {
      pushed,
      unauthenticated,
    })
    await expectSettledAccessible(a)
    await shot(a, testInfo, 'cross-tab-signed-out-students-notice-vi')

    // Starting a sign-in hides it (the answer is stubbed, so the E2E tutor's throttle is not touched).
    await a.route('**/api/v1/auth/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/problem+json',
        body: '{"status":401,"code":"BAD_CREDENTIALS"}',
      }),
    )
    await a.getByLabel('Tên đăng nhập (bắt buộc)').fill(TUTOR_USERNAME)
    await a.getByLabel('Mật khẩu (bắt buộc)', { exact: true }).fill('not-the-password')
    await a.getByRole('button', { name: COPY.vi.login, exact: true }).click()
    await expect(a.getByRole('alert')).toBeVisible()
    await expect(a.getByText(COPY.vi.signedOutElsewhere)).toHaveCount(0)
    accept(consoleGuard, (e) => e.includes('status of 401'))
    await context.close()
  })

  test('tab A on /login, tab B signs in as the tutor: tab A goes to the tutor home (AC6)', async ({ browser }) => {
    const { context, a, b } = await twoTabs(browser)
    await signInWithForm(b, tutor())
    await expect(h1(b, COPY.vi.tutorHome)).toBeVisible()
    await expect(h1(a, COPY.vi.tutorHome)).toBeVisible()
    expect(new URL(a.url()).pathname).toBe('/tutor/today')
    await context.close()
  })

  test('tab A on /tutor/today; tab B logs out and signs in as a student: tab A never shows tutor content again (AC6)', async ({
    browser,
  }, testInfo) => {
    const student = await newStudentCredentials(browser, testInfo, true)
    const { context, a, b } = await twoTabs(browser)
    await signInWithForm(b, tutor())
    await expect(h1(b, COPY.vi.tutorHome)).toBeVisible()
    await a.goto('/tutor/today')
    await expect(h1(a, COPY.vi.tutorHome)).toBeVisible()
    const dialog = await openAccountSection(b, 'tutor')
    await dialog.getByRole('button', { name: COPY.vi.logout }).click()
    await expect(h1(b, COPY.vi.login)).toBeVisible()
    await expect(h1(a, COPY.vi.login)).toBeVisible()
    const headings = await recordHeadings(a)
    await signInWithForm(b, student)
    await expect(h1(b, COPY.vi.studentHome)).toBeVisible()
    await expect(a).toHaveURL(/\/(student\/home|forbidden)$/)
    await expect(h1(a, COPY.vi.studentHome).or(h1(a, COPY.vi.forbidden))).toBeVisible()
    expect(await headings(), "tab A's pages after the student's sign-in").not.toContain(COPY.vi.tutorHome)
    await context.close()
  })

  test("tab A on /login, tab B signs in a user who must change the password: A goes to /change-password and B's session stays valid (AC6, D-2)", async ({
    browser,
  }, testInfo) => {
    const student = await newStudentCredentials(browser, testInfo, false)
    const { context, a, b } = await twoTabs(browser)
    await signInWithForm(b, student)
    await expect(h1(b, COPY.vi.change)).toBeVisible()
    await expect(a).toHaveURL(/\/change-password$/)
    await expect(h1(a, COPY.vi.change)).toBeVisible()
    // Tab B completes the change: its session was not ended by tab A.
    const next = generatePassword()
    await b.getByLabel('Mật khẩu hiện tại (bắt buộc)', { exact: true }).fill(student.password)
    await b.getByLabel('Mật khẩu mới (bắt buộc)', { exact: true }).fill(next)
    await b.getByLabel('Nhập lại mật khẩu mới (bắt buộc)', { exact: true }).fill(next)
    await b.getByRole('button', { name: COPY.vi.change, exact: true }).click()
    await expect(h1(b, COPY.vi.studentHome)).toBeVisible()
    await context.close()
  })
})

test.describe('AC8: the narrow top bar meta error keeps Retry beside its icon (UX-9, DEC-115)', () => {
  const CASES = [
    {
      role: 'tutor',
      state: TUTOR_STATE,
      home: '/tutor/today',
      title: COPY.vi.tutorHome,
      projects: ['phone-small'],
    },
    {
      role: 'student',
      state: STUDENT_STATE,
      home: '/student/home',
      title: COPY.vi.studentHome,
      projects: ['phone-small', 'tablet'],
    },
  ] as const
  for (const target of CASES) {
    test.describe(() => {
      test.use({ storageState: target.state })
      test(`${target.role}: Retry within 8 px of the icon, the icon titled with the message`, async ({
        page,
        consoleGuard,
      }, testInfo) => {
        test.skip(
          !(target.projects as readonly string[]).includes(testInfo.project.name),
          `checked at ${target.projects.join(', ')}`,
        )
        await page.route('**/api/v1/meta', (route) =>
          route.fulfill({
            status: 500,
            contentType: 'application/problem+json',
            body: '{"status":500,"code":"INTERNAL_ERROR"}',
          }),
        )
        await page.goto(target.home)
        await expect(h1(page, target.title)).toBeVisible()
        const alert = page.getByRole('banner').getByRole('alert')
        await expect(alert).toContainText(COPY.vi.metaError)
        // T-M2.13 (e): the icon is the toggletip trigger, found by its name; its svg stays decorative.
        const icon = alert.getByRole('button', {
          name: COPY.vi.metaErrorDetails,
        })
        await expect(icon).toBeVisible()
        await expect(icon).toHaveAttribute('title', COPY.vi.metaError)
        await expect(icon.locator('svg')).toHaveAttribute('aria-hidden', 'true')
        const retry = alert.getByRole('button', { name: COPY.vi.retry })
        await expect(retry).toHaveAccessibleDescription(COPY.vi.metaError)
        const iconBox = (await icon.boundingBox())!
        const retryBox = (await retry.boundingBox())!
        const gap = retryBox.x - (iconBox.x + iconBox.width)
        await evidenceRecord(testInfo, `ac8-ux9-${target.role}`, {
          viewport: page.viewportSize(),
          icon: iconBox,
          retry: retryBox,
          gapPx: gap,
          limitPx: 8,
        })
        expect(gap, 'Retry start edge vs icon end edge').toBeGreaterThanOrEqual(0)
        expect(gap, 'Retry start edge vs icon end edge').toBeLessThanOrEqual(8)
        await expectNoAxeViolations(page)
        await expectNoHorizontalScroll(page)
        await shot(page, testInfo, `ux9-${target.role}-meta-error-vi`)
        accept(consoleGuard, (e) => e.includes('status of 500') && e.includes('/api/v1/meta'))
      })
    })
  }
})

test.describe('T-M2.13 AC1: the compact meta error opens its message on a tap (UX-3)', () => {
  const CASES = [
    {
      role: 'tutor',
      state: TUTOR_STATE,
      home: '/tutor/today',
      title: COPY.vi.tutorHome,
      project: 'phone-small',
      wide: 768,
    },
    {
      role: 'student',
      state: STUDENT_STATE,
      home: '/student/home',
      title: COPY.vi.studentHome,
      project: 'phone-small',
      wide: null,
    },
    {
      role: 'student',
      state: STUDENT_STATE,
      home: '/student/home',
      title: COPY.vi.studentHome,
      project: 'tablet',
      wide: 1280,
    },
  ] as const
  for (const target of CASES) {
    test.describe(() => {
      test.use({ storageState: target.state })
      test(`${target.role} at ${target.project}: tap opens the message, Esc and an outside tap return focus to the trigger${target.wide ? `; widening to ${target.wide} px closes it with focus on Retry` : ''}`, async ({
        page,
        consoleGuard,
      }, testInfo) => {
        test.skip(testInfo.project.name !== target.project, `checked at ${target.project}`)
        await page.route('**/api/v1/meta', (route) =>
          route.fulfill({
            status: 500,
            contentType: 'application/problem+json',
            body: '{"status":500,"code":"INTERNAL_ERROR"}',
          }),
        )
        await page.goto(target.home)
        await expect(h1(page, target.title)).toBeVisible()
        const alert = page.getByRole('banner').getByRole('alert')
        const trigger = alert.getByRole('button', {
          name: COPY.vi.metaErrorDetails,
        })
        const retry = alert.getByRole('button', { name: COPY.vi.retry })
        await expect(trigger).toBeVisible()
        const box = (await trigger.boundingBox())!
        expect(box.width, 'trigger width').toBeGreaterThanOrEqual(44)
        expect(box.height, 'trigger height').toBeGreaterThanOrEqual(44)
        await expect(retry).toHaveAccessibleDescription(COPY.vi.metaError)

        // Tap → the popover with the message; focus inside it.
        await trigger.tap()
        const tip = page.getByRole('dialog', { name: COPY.vi.metaError })
        await expect(tip).toBeVisible()
        await expect(tip).toHaveText(COPY.vi.metaError)
        await expect(trigger).toHaveAttribute('aria-expanded', 'true')
        await expect.poll(() => tip.evaluate((el) => el.contains(document.activeElement))).toBe(true)
        await expectSettledAccessible(page)
        await expectNoMidWordBreak(tip)
        const tipBox = (await tip.boundingBox())!
        const viewport = page.viewportSize()!
        expect(tipBox.x, 'popover start gutter').toBeGreaterThanOrEqual(16)
        expect(tipBox.x + tipBox.width, 'popover end gutter').toBeLessThanOrEqual(viewport.width - 16)
        await shot(page, testInfo, `toggletip-${target.role}-open-vi`)

        // Esc closes it, focus back on the trigger.
        await page.keyboard.press('Escape')
        await expect(tip).toHaveCount(0)
        await expect(trigger).toBeFocused()

        // An outside tap closes it, focus back on the trigger.
        await trigger.tap()
        await expect(tip).toBeVisible()
        // At the end of the h1's row: outside the popover (which starts at the gutter) and outside any control.
        const heading = (await h1(page, target.title).boundingBox())!
        await page.touchscreen.tap(viewport.width - 20, heading.y + heading.height / 2)
        await expect(tip).toHaveCount(0)
        await expect(trigger).toBeFocused()

        // In English (the account section's switcher would close it: the language comes from storage on a reload).
        await page.evaluate(() => localStorage.setItem('englms.locale', 'en'))
        await page.reload()
        await expect(h1(page, target.role === 'tutor' ? COPY.en.tutorHome : COPY.en.studentHome)).toBeVisible()
        // By attribute, not role: once hidden (below) it leaves the accessibility tree.
        const triggerEn = alert.locator(`button[aria-label="${COPY.en.metaErrorDetails}"]`)
        await triggerEn.tap()
        const tipEn = page.getByRole('dialog', { name: COPY.en.metaError })
        await expect(tipEn).toHaveText(COPY.en.metaError)
        await expectSettledAccessible(page)
        await shot(page, testInfo, `toggletip-${target.role}-open-en`)

        if (target.wide) {
          // A frame change (rotation): the container widens past 22rem, the trigger renders no box → closed, focus on Retry.
          await page.setViewportSize({ width: target.wide, height: viewport.height })
          await expect(tipEn).toHaveCount(0)
          const retryEn = alert.getByRole('button', { name: COPY.en.retry })
          await expect(retryEn).toBeFocused()
          await expectFocusNotLost(page)
          // ≥ 22rem: the message shows and the trigger is not a Tab stop.
          await expect(alert.getByText(COPY.en.metaError, { exact: true })).toBeVisible()
          await expect(triggerEn).toBeHidden()
          await page.keyboard.press('Shift+Tab')
          await expect(triggerEn).not.toBeFocused()
          await expectSettledAccessible(page)
        }
        accept(consoleGuard, (e) => e.includes('status of 500') && e.includes('/api/v1/meta'))
      })
    })
  }
})

// The /dev/ui gallery exists only in the development build (`pnpm dev`).
const DEV_SERVER = /:5173\/?$/.test(process.env.E2E_BASE_URL ?? '')

test('/dev/ui (dev build): the ProgressLine entry, accessible', async ({ page }, testInfo) => {
  test.skip(!DEV_SERVER, 'needs the dev server: E2E_BASE_URL=http://localhost:5173 (no /dev/ui in the packaged build)')
  await page.goto('/dev/ui')
  const show = page.getByRole('button', { name: 'Hiện đường tiến trình' })
  await show.scrollIntoViewIfNeeded()
  await show.click()
  await expect(page.getByTestId('progress-line')).toBeAttached()
  await expectNoAxeViolations(page)
  await expectNoHorizontalScroll(page)
  await shot(page, testInfo, 'devui-progress-line-vi')
})
