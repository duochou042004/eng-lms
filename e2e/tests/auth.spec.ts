import type { Browser, Locator, Page, TestInfo } from '@playwright/test'
import {
  ANONYMOUS,
  apiCall,
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
import { expectNoAxeViolations, expectNoHorizontalScroll } from '../support/checks'
import { evidenceRecord, evidenceShot } from '../support/evidence'
import { expect, test } from '../support/fixtures'
import { openAccountSection } from '../support/shell'
import { StepCounter } from '../support/steps'

// T-M2.4 (auth UI) at the mandatory viewports. Destructive flows (forced change, voluntary change, logout, remember-me)
// each use their own student, created through the tutor API; the stored tutor and student sessions are never logged
// out or password-changed here (packet scope 10).
// T-M2.11: "Change password" and "Log out" sit in the shell's account section (account popover, tutor drawer or student
// More sheet, by viewport: support/shell.ts); /tutor/students has no page yet (the shell's 404, AC1), so the return
// targets use /tutor/today.

const h1 = (page: Page, name: string) => page.getByRole('heading', { level: 1, name })
const LOGIN = { vi: 'Đăng nhập', en: 'Sign in' }
const CHANGE = 'Đổi mật khẩu'
const FORBIDDEN = 'Bạn không có quyền mở trang này'
const TUTOR_HOME = 'Hôm nay'
const STUDENT_HOME = 'Trang chủ'
const FIELD = {
  current: 'Mật khẩu hiện tại (bắt buộc)',
  new: 'Mật khẩu mới (bắt buộc)',
  confirm: 'Nhập lại mật khẩu mới (bắt buộc)',
}
/** A password field by its exact label ("Mật khẩu mới" is also inside "Nhập lại mật khẩu mới"). */
const field = (page: Page, label: string) => page.getByLabel(label, { exact: true })

const tutor = (): Credentials => ({ username: TUTOR_USERNAME, password: tutorPassword() })

/** Screenshot of a changed screen and state, for evidence/T-M2.4/impl/<project>/. */
const shot = (page: Page, testInfo: TestInfo, name: string) => evidenceShot(page, testInfo, name, 'impl')

/** axe and the reflow check on the current page (AC9). */
async function expectAccessible(page: Page) {
  await expectNoAxeViolations(page)
  await expectNoHorizontalScroll(page)
}

/**
 * Removes the console entries of the responses a test provokes on purpose (Chromium logs every 4xx resource as an
 * error): only that status from that API path (G3 QA F2); any other entry still fails the test.
 */
function acceptStatus(consoleGuard: string[], status: number, path: string) {
  const prefix = `console.error: Failed to load resource: the server responded with a status of ${status} `
  for (let i = consoleGuard.length - 1; i >= 0; i--) {
    const entry = consoleGuard[i]!
    const url = /\[([^\]]+)\]$/.exec(entry)?.[1]
    if (entry.startsWith(prefix) && url && new URL(url).pathname === path) consoleGuard.splice(i, 1)
  }
}

/** A page on the app's origin signed in as the E2E tutor (its stored session), for API set-up calls. */
async function tutorApi(browser: Browser) {
  const context = await browser.newContext({ storageState: TUTOR_STATE })
  const page = await context.newPage()
  await page.goto('/tutor')
  await expect(h1(page, TUTOR_HOME)).toBeVisible()
  return { context, page }
}

/** A new student with a temporary password (must change). */
async function newStudent(browser: Browser, testInfo: TestInfo) {
  const { context, page } = await tutorApi(browser)
  const credentials = await createStudent(page, testInfo.project.name)
  await context.close()
  return credentials
}

/** A new student past the forced change (changed through the API in a throwaway context). */
async function readyStudent(browser: Browser, testInfo: TestInfo) {
  const temporary = await newStudent(browser, testInfo)
  const context = await browser.newContext({ storageState: ANONYMOUS })
  const page = await context.newPage()
  await page.goto('/login')
  expect((await apiSignIn(page, temporary)).status).toBe(200)
  const ready = await apiChangePassword(page, temporary)
  await context.close()
  return ready
}

/**
 * G3 UX-1: the first submit that fails the client checks moves focus to the error summary, by Enter and (after a
 * reload, so it is again the first submit) by click. In a real browser the summary renders one frame after the submit.
 */
async function expectFirstEmptySubmitFocusesSummary(page: Page) {
  const summary = page.getByRole('alert', { name: 'Mật khẩu chưa được đổi' })
  await field(page, FIELD.current).focus()
  await page.keyboard.press('Enter')
  await expect(summary).toBeFocused()
  await page.reload()
  await expect(h1(page, CHANGE)).toBeVisible()
  await page.getByRole('button', { name: CHANGE, exact: true }).click()
  await expect(summary).toBeFocused()
  await page.reload()
  await expect(h1(page, CHANGE)).toBeVisible()
}

/** Marks the document, so a later check can tell that no full page load happened. */
async function markDocument(page: Page) {
  await page.evaluate(() => Object.assign(window, { __t_m2_4_spa: true }))
}
async function expectSameDocument(page: Page) {
  expect(await page.evaluate(() => (window as unknown as { __t_m2_4_spa?: boolean }).__t_m2_4_spa)).toBe(true)
}

/** Presses Tab until `target` has focus (at most `max` presses); returns the number of presses. */
async function tabTo(page: Page, target: Locator, max = 12) {
  for (let i = 1; i <= max; i++) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((el) => el === document.activeElement)) return i
  }
  throw new Error('target never received focus')
}

test.describe('anonymous', () => {
  test.use({ storageState: ANONYMOUS })

  test('AC1: a protected URL asks to sign in and returns there; the login takes 3 steps (ux-flows)', async ({
    page,
  }, testInfo) => {
    await page.goto('/tutor/today')
    await expect(page).toHaveURL(/\/login\?next=%2Ftutor%2Ftoday$/)
    await expect(h1(page, LOGIN.vi)).toBeVisible()
    await expectAccessible(page)
    await shot(page, testInfo, 'login-default-vi')
    await markDocument(page)
    const { username, password } = tutor()
    const steps = new StepCounter()
    await steps.step('type the username', () => page.getByLabel('Tên đăng nhập (bắt buộc)').fill(username))
    await steps.step('type the password', () => page.getByLabel('Mật khẩu (bắt buộc)', { exact: true }).fill(password))
    await steps.step('Sign in', () => page.getByRole('button', { name: LOGIN.vi, exact: true }).click())
    await expect(page).toHaveURL(/\/tutor\/today$/)
    await expect(h1(page, TUTOR_HOME)).toBeVisible()
    await expectSameDocument(page)
    steps.expectAtMost(3)
    await evidenceRecord(testInfo, 'steps-login', { viewport: page.viewportSize(), budget: 3, steps: steps.count })
  })

  for (const [next, landing] of [
    ['%2F%2Fevil.example', '/tutor/today'],
    ['https%3A%2F%2Fevil.example', '/tutor/today'],
    ['%2Ftutor%2F..%2Fstudent%2Fhome', '/tutor/today'],
    ['%2Fstudent%2Fhome', '/tutor/today'],
    ['%2Ftutor%2Ftoday%3Fq%3Dan', '/tutor/today?q=an'],
  ] as const) {
    test(`AC2: signing in with next=${next} lands on ${landing}, through the router`, async ({ page }) => {
      await page.goto(`/login?next=${next}`)
      await expect(h1(page, LOGIN.vi)).toBeVisible()
      await markDocument(page)
      await signInWithForm(page, tutor())
      await expect(h1(page, TUTOR_HOME)).toBeVisible()
      expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(landing)
      await expectSameDocument(page)
    })
  }

  test('AC3/AC9 states: the generic failure, the 429 wait and the forgot-password disclosure, accessible', async ({
    page,
    consoleGuard,
  }, testInfo) => {
    await page.goto('/login')
    await expect(h1(page, LOGIN.vi)).toBeVisible()
    await page.getByText('Quên mật khẩu?').click()
    await expect(page.getByText(/Học viên: hãy nhắn gia sư của bạn/)).toBeVisible()
    await expectAccessible(page)
    await shot(page, testInfo, 'login-forgot-open-vi')

    // An unknown username: the server's generic 401 (no account is touched, so no lockout).
    await signInWithForm(page, { username: 'e2e-khong-ton-tai', password: 'mat-khau-bat-ky' })
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Không đăng nhập được với tên đăng nhập và mật khẩu này')
    await expect(page).toHaveURL(/\/login$/)
    acceptStatus(consoleGuard, 401, '/api/v1/auth/login')
    await expectAccessible(page)
    await shot(page, testInfo, 'login-error-vi')

    // The throttle is raised for E2E, so the 429 answer is simulated for this screenshot (its logic: component tests).
    await page.route('**/api/v1/auth/login', (route) =>
      route.fulfill({
        status: 429,
        headers: { 'Content-Type': 'application/problem+json', 'Retry-After': '240' },
        body: JSON.stringify({ code: 'RATE_LIMITED', status: 429, requestId: 'e2e' }),
      }),
    )
    await page.getByRole('button', { name: LOGIN.vi, exact: true }).click()
    await expect(alert).toContainText('Hãy thử lại sau 4 phút.')
    acceptStatus(consoleGuard, 429, '/api/v1/auth/login')
    await expectAccessible(page)
    await shot(page, testInfo, 'login-rate-limited-vi')
  })

  test('AC9: keyboard-only sign-in (Tab to each field, Enter submits)', async ({ page }) => {
    await page.goto('/login')
    await expect(h1(page, LOGIN.vi)).toBeVisible()
    const { username, password } = tutor()
    await tabTo(page, page.getByLabel('Tên đăng nhập (bắt buộc)'))
    await page.keyboard.type(username)
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Mật khẩu (bắt buộc)', { exact: true })).toBeFocused()
    await page.keyboard.type(password)
    await page.keyboard.press('Enter')
    await expect(h1(page, TUTOR_HOME)).toBeFocused()
  })

  test('AC4: the forced change cannot be bypassed; /login logs out first; the change lands on /student/home', async ({
    page,
    browser,
  }, testInfo) => {
    const temporary = await newStudent(browser, testInfo)
    await page.goto('/login')
    await signInWithForm(page, temporary)
    await expect(page).toHaveURL(/\/change-password$/)
    await expect(page.getByText(/Hãy đặt mật khẩu mới trước khi tiếp tục/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Huỷ' })).toHaveCount(0)
    // G3 UX-4: a quiet Log out instead of a Cancel.
    await expect(page.getByRole('main').getByRole('button', { name: 'Đăng xuất' })).toBeVisible()
    await expectAccessible(page)
    await shot(page, testInfo, 'change-password-forced-vi')
    await expectFirstEmptySubmitFocusesSummary(page)

    for (const path of ['/student/home', '/student/work', '/tutor/students', '/']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/change-password$/)
      await expect(h1(page, CHANGE)).toBeVisible()
    }

    // /login in this state logs out first (DEC-092): the form shows and the session is gone.
    await page.goto('/login')
    await expect(h1(page, LOGIN.vi)).toBeVisible()
    expect((await apiCall(page, 'GET', '/api/v1/auth/session')).status).toBe(401)
    await page.goto('/student/home')
    await expect(page).toHaveURL(/\/login\?next=%2Fstudent%2Fhome$/)

    // A fresh login works; the change lands on the student home.
    await page.goto('/login')
    await signInWithForm(page, temporary)
    await expect(page).toHaveURL(/\/change-password$/)
    const next = generatePassword()
    await field(page, FIELD.current).fill(temporary.password)
    await field(page, FIELD.new).fill(next)
    await field(page, FIELD.confirm).fill(next)
    await page.getByRole('button', { name: CHANGE, exact: true }).click()
    await expect(page).toHaveURL(/\/student\/home$/)
    await expect(h1(page, STUDENT_HOME)).toBeVisible()
  })

  test('AC5: voluntary change from the header: field codes on their fields, summary focus, other devices signed out', async ({
    page,
    browser,
    consoleGuard,
  }, testInfo) => {
    const student = await readyStudent(browser, testInfo)
    // Another device of the same student: signed out by the change.
    const other = await browser.newContext({ storageState: ANONYMOUS })
    const otherPage = await other.newPage()
    await otherPage.goto('/login')
    expect((await apiSignIn(otherPage, student)).status).toBe(200)

    await page.goto('/login')
    await signInWithForm(page, student)
    await expect(h1(page, STUDENT_HOME)).toBeVisible()
    await openAccountSection(page, 'student')
    await page.getByRole('link', { name: CHANGE }).click()
    await expect(h1(page, CHANGE)).toBeFocused()
    await expect(page.getByText('Sau khi đổi, bạn sẽ bị đăng xuất trên mọi thiết bị khác.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Huỷ' })).toBeVisible()
    await expectAccessible(page)
    await shot(page, testInfo, 'change-password-voluntary-vi')

    const summary = page.getByRole('alert', { name: 'Mật khẩu chưa được đổi' })
    const attempt = async (current: string, next: string, target: string, message: string) => {
      for (const label of Object.values(FIELD)) await field(page, label).fill('')
      await field(page, FIELD.current).fill(current)
      await field(page, FIELD.new).fill(next)
      await field(page, FIELD.confirm).fill(next)
      await page.getByRole('button', { name: CHANGE, exact: true }).click()
      await expect(summary).toBeFocused()
      await expect(summary.getByRole('link', { name: message })).toBeVisible()
      await expect(field(page, target)).toHaveAttribute('aria-invalid', 'true')
      await expect(field(page, target)).toHaveAccessibleDescription(new RegExp(message.replace(/[.?]/g, '\\$&')))
    }
    await attempt('mat-khau-sai-1', generatePassword(), FIELD.current, 'Mật khẩu hiện tại không đúng.')
    await attempt(
      student.password,
      'qwertyuiop',
      FIELD.new,
      'Mật khẩu này quá phổ biến, dễ bị đoán. Hãy chọn mật khẩu khác.',
    )
    await attempt(student.password, student.username, FIELD.new, 'Mật khẩu mới không được trùng với tên đăng nhập.')
    await attempt(student.password, student.password, FIELD.new, 'Mật khẩu mới phải khác mật khẩu hiện tại.')
    acceptStatus(consoleGuard, 422, '/api/v1/auth/password')
    await expectAccessible(page)
    await shot(page, testInfo, 'change-password-field-errors-vi')

    const next = generatePassword()
    for (const label of Object.values(FIELD)) await field(page, label).fill('')
    await field(page, FIELD.current).fill(student.password)
    await field(page, FIELD.new).fill(next)
    await field(page, FIELD.confirm).fill(next)
    await page.getByRole('button', { name: CHANGE, exact: true }).click()
    await expect(page.getByRole('status')).toContainText('Đã đổi mật khẩu')
    await expect(page.getByRole('status')).toContainText('Bạn đã bị đăng xuất trên các thiết bị khác.')
    await expectAccessible(page)
    await shot(page, testInfo, 'change-password-success-vi')
    // This device stays signed in; the other one is signed out.
    expect((await apiCall(page, 'GET', '/api/v1/auth/session')).status).toBe(200)
    expect((await apiCall(otherPage, 'GET', '/api/v1/auth/session')).status).toBe(401)
    await other.close()
  })

  test('AC9: keyboard-only password change', async ({ page, browser }, testInfo) => {
    const student = await readyStudent(browser, testInfo)
    await page.goto('/login')
    await signInWithForm(page, student)
    await expect(h1(page, STUDENT_HOME)).toBeVisible()
    await page.goto('/change-password')
    await expect(h1(page, CHANGE)).toBeVisible()
    const next = generatePassword()
    await tabTo(page, field(page, FIELD.current))
    await page.keyboard.type(student.password)
    await tabTo(page, field(page, FIELD.new))
    await page.keyboard.type(next)
    await tabTo(page, field(page, FIELD.confirm))
    await page.keyboard.type(next)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('status')).toContainText('Đã đổi mật khẩu')
  })

  test('AC6: Log out ends the session; back and protected visits ask to sign in; also after an idle expiry, remembered or not', async ({
    page,
    context,
    browser,
  }, testInfo) => {
    const student = await readyStudent(browser, testInfo)
    await page.goto('/login')
    await signInWithForm(page, student)
    await expect(h1(page, STUDENT_HOME)).toBeVisible()
    await openAccountSection(page, 'student')
    await page.getByRole('button', { name: 'Đăng xuất' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(h1(page, LOGIN.vi)).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL(/\/login\?next=%2Fstudent%2Fhome$/)
    await expect(h1(page, STUDENT_HOME)).toHaveCount(0)
    await page.goto('/student/home')
    await expect(page).toHaveURL(/\/login\?next=%2Fstudent%2Fhome$/)

    const forbiddenAnswers: string[] = []
    page.on('response', (response) => {
      if (response.status() === 403) forbiddenAnswers.push(response.url())
    })
    for (const remembered of [false, true]) {
      await page.goto('/login')
      await signInWithForm(page, student, remembered)
      await expect(h1(page, STUDENT_HOME)).toBeVisible()
      const names = (await context.cookies()).map((c) => c.name)
      expect(names.includes('ENGLMS_REMEMBER_ME')).toBe(remembered)
      // The idle expiry: the session cookie is gone; the page still shows the student (no request yet).
      await context.clearCookies({ name: 'ENGLMS_SESSION' })
      await openAccountSection(page, 'student')
      await page.getByRole('button', { name: 'Đăng xuất' }).click()
      await expect(h1(page, LOGIN.vi)).toBeVisible()
      expect((await context.cookies()).map((c) => c.name)).not.toContain('ENGLMS_REMEMBER_ME')
      // The next sign-in works (the XSRF cookie is re-primed): no 403.
      await signInWithForm(page, student)
      await expect(h1(page, STUDENT_HOME)).toBeVisible()
      await openAccountSection(page, 'student')
      await page.getByRole('button', { name: 'Đăng xuất' }).click()
      await expect(h1(page, LOGIN.vi)).toBeVisible()
    }
    expect(forbiddenAnswers, '403 answers').toEqual([])
  })

  test('AC7: / sends an anonymous visitor to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
    await expect(h1(page, LOGIN.vi)).toBeVisible()
  })

  test('AC8: remember-me sets the 30-day cookie only when ticked; a new browser holding it opens as that user; after Log out another user signs in', async ({
    page,
    context,
    browser,
  }, testInfo) => {
    const student = await readyStudent(browser, testInfo)
    await page.goto('/login')
    await signInWithForm(page, student)
    await expect(h1(page, STUDENT_HOME)).toBeVisible()
    expect((await context.cookies()).map((c) => c.name)).not.toContain('ENGLMS_REMEMBER_ME')
    await openAccountSection(page, 'student')
    await page.getByRole('button', { name: 'Đăng xuất' }).click()
    await expect(h1(page, LOGIN.vi)).toBeVisible()

    await signInWithForm(page, student, true)
    await expect(h1(page, STUDENT_HOME)).toBeVisible()
    const remember = (await context.cookies()).find((c) => c.name === 'ENGLMS_REMEMBER_ME')
    expect(remember, 'ENGLMS_REMEMBER_ME').toBeDefined()
    const days = (remember!.expires - Date.now() / 1000) / 86_400
    expect(days, 'remember-me lifetime in days').toBeGreaterThan(29.9)
    expect(days, 'remember-me lifetime in days').toBeLessThanOrEqual(30)
    await evidenceRecord(testInfo, 'ac8-remember-me-cookie', {
      name: remember!.name,
      httpOnly: remember!.httpOnly,
      secure: remember!.secure,
      sameSite: remember!.sameSite,
      lifetimeDays: Math.round(days * 100) / 100,
    })

    // A "browser restart": a new context holding only the remember-me cookie opens as the student.
    const restarted = await browser.newContext({ storageState: { cookies: [remember!], origins: [] } })
    const shared = await restarted.newPage()
    const forbiddenAnswers: string[] = []
    shared.on('response', (response) => {
      if (response.status() === 403) forbiddenAnswers.push(response.url())
    })
    await shared.goto('/')
    await expect(shared).toHaveURL(/\/student\/home$/)
    await expect(h1(shared, STUDENT_HOME)).toBeVisible()
    // The shared-device case (DEC-093): log out, then another user signs in on the form, with no 403.
    await openAccountSection(shared, 'student')
    await shared.getByRole('button', { name: 'Đăng xuất' }).click()
    await expect(h1(shared, LOGIN.vi)).toBeVisible()
    await signInWithForm(shared, tutor())
    await expect(shared).toHaveURL(/\/tutor\/today$/)
    await expect(h1(shared, TUTOR_HOME)).toBeVisible()
    expect(forbiddenAnswers, '403 answers').toEqual([])
    await restarted.close()
  })

  test('AC8/AC9: the public pages in vi and en: hint, disclosure and switcher on /login, switcher on /forbidden', async ({
    page,
  }, testInfo) => {
    await page.goto('/login')
    await expect(page.getByText(/Không chọn mục này trên thiết bị dùng chung/)).toBeVisible()
    await page.getByRole('radiogroup', { name: 'Ngôn ngữ' }).getByRole('radio', { name: 'English' }).click()
    await expect(h1(page, LOGIN.en)).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByText(/Leave this unticked on a shared device/)).toBeVisible()
    await page.getByText('Forgot your password?').click()
    await expect(page.getByText(/Students: message your tutor/)).toBeVisible()
    await expectAccessible(page)
    await shot(page, testInfo, 'login-forgot-open-en')

    await page.goto('/forbidden')
    await expect(h1(page, "You don't have access to this page")).toBeVisible()
    await page.getByRole('radiogroup', { name: 'Language' }).getByRole('radio', { name: 'Tiếng Việt' }).click()
    await expect(h1(page, FORBIDDEN)).toBeVisible()
    await expectAccessible(page)
  })
})

for (const [role, state, other, home, homeTitle] of [
  ['TUTOR', TUTOR_STATE, '/student/home', '/tutor/today', TUTOR_HOME],
  ['STUDENT', STUDENT_STATE, '/tutor/students', '/student/home', STUDENT_HOME],
] as const) {
  test.describe(`signed in as ${role}`, () => {
    test.use({ storageState: state })

    test(`AC7: wrong role → /forbidden with a link home; / and /login go home`, async ({ page }, testInfo) => {
      await page.goto(other)
      await expect(page).toHaveURL(/\/forbidden$/)
      await expect(h1(page, FORBIDDEN)).toBeVisible()
      await expectAccessible(page)
      await shot(page, testInfo, `forbidden-${role.toLowerCase()}-vi`)
      await page.getByRole('link', { name: 'Về trang chính của bạn' }).click()
      await expect(page).toHaveURL(new RegExp(`${home}$`))
      await expect(h1(page, homeTitle)).toBeFocused()
      for (const path of ['/', '/login']) {
        await page.goto(path)
        await expect(page).toHaveURL(new RegExp(`${home}$`))
        await expect(h1(page, homeTitle)).toBeVisible()
      }
    })

    test('G3 UX-1: voluntary change, the first empty submit focuses the summary (Enter, click)', async ({ page }) => {
      await page.goto('/change-password')
      await expect(h1(page, CHANGE)).toBeVisible()
      await expectFirstEmptySubmitFocusesSummary(page)
    })

    test('AC9: the shell header with the account controls; the password page in English is accessible', async ({
      page,
    }, testInfo) => {
      await page.goto(home)
      await openAccountSection(page, role === 'TUTOR' ? 'tutor' : 'student')
      await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible()
      await expectAccessible(page)
      await shot(page, testInfo, `shell-header-${role.toLowerCase()}-vi`)
      await page.getByRole('link', { name: CHANGE }).click()
      await page.getByRole('radiogroup', { name: 'Ngôn ngữ' }).getByRole('radio', { name: 'English' }).click()
      await expect(h1(page, 'Change password')).toBeVisible()
      await expectAccessible(page)
      if (role === 'STUDENT') await shot(page, testInfo, 'change-password-voluntary-en')
    })
  })
}

test.describe('cold load', () => {
  test.use({ storageState: TUTOR_STATE })

  test('AC1: GET /auth/session completes before any other API request (DEC-092)', async ({ page }, testInfo) => {
    const events: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/api/')) events.push(`start ${new URL(r.url()).pathname}`)
    })
    page.on('requestfinished', (r) => {
      if (r.url().includes('/api/')) events.push(`end ${new URL(r.url()).pathname}`)
    })
    await page.goto('/tutor')
    await expect(h1(page, TUTOR_HOME)).toBeVisible()
    await expect(page.getByRole('status', { name: 'Đang tải thông tin không gian dạy học' })).toHaveCount(0)
    await evidenceRecord(testInfo, 'ac1-network-order', { events })
    expect(events.slice(0, 3)).toEqual(['start /api/v1/auth/session', 'end /api/v1/auth/session', 'start /api/v1/meta'])
    expect(events.filter((e) => e === 'start /api/v1/auth/session')).toHaveLength(1)
  })
})
