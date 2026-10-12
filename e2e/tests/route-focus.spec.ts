import type { Locator, Page } from '@playwright/test'
import { ANONYMOUS, STUDENT_STATE, TUTOR_STATE } from '../support/auth'
import { evidenceRecord, evidenceShot } from '../support/evidence'
import { expect, test } from '../support/fixtures'
import { openAccountSection, workspaceName } from '../support/shell'
import { StepCounter } from '../support/steps'

// T-M1.9: route focus and titles (AC1), 44 px targets (AC6) and the UX step budgets (AC10) at the mandatory viewports.
// T-M2.4: no landing page; the anonymous start page is /login and the shells need a session (the stored E2E tutor and
// student sessions). The client-side navigations start from a shell: its header link to the password page, its home
// link (`/` → the role home) and the 404 page's start-page link.
// T-M2.11: the password-page link and the shell's language switcher are in the account section (popover, drawer or More
// sheet by viewport; support/shell.ts); the shell's home link is the workspace name (no "Eng-LMS" next to it). The
// language budget is 1 step on the public pages and at most 2 from a shell page (DEC-112 (5), packet scope 11 (a)).

const COPY = {
  vi: {
    login: 'Đăng nhập',
    tutor: 'Không gian gia sư',
    student: 'Trang của học viên',
    notFound: 'Không tìm thấy trang',
    changePassword: 'Đổi mật khẩu',
    home: 'Về trang đầu',
    skip: 'Chuyển đến nội dung chính',
    language: 'Ngôn ngữ',
  },
  en: {
    login: 'Sign in',
    tutor: 'Tutor workspace',
    student: 'Student home',
    notFound: 'Page not found',
    changePassword: 'Change password',
    home: 'Go to the start page',
    skip: 'Skip to main content',
    language: 'Language',
  },
} as const
type Lang = keyof typeof COPY

const h1 = (page: Page, name: string) => page.getByRole('heading', { level: 1, name })

async function expectFocusedPage(page: Page, title: string) {
  await expect(h1(page, title)).toBeFocused()
  await expect(page).toHaveTitle(`${title} · Eng-LMS`)
}

async function expectBodyFocused(page: Page) {
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)
}

async function useLanguage(page: Page, lang: Lang) {
  await page.addInitScript((l) => {
    if (!sessionStorage.getItem('t-m1.9-locale-set')) {
      localStorage.setItem('englms.locale', l)
      sessionStorage.setItem('t-m1.9-locale-set', '1')
    }
  }, lang)
}

const ROLES = [
  { role: 'tutor', path: '/tutor', state: TUTOR_STATE },
  { role: 'student', path: '/student', state: STUDENT_STATE },
] as const

/** The shell's top-bar home link: the workspace name (T-M2.11). */
async function shellHomeLink(page: Page) {
  return page.getByRole('banner').getByRole('link', { name: await workspaceName(page), exact: true })
}

for (const lang of ['vi', 'en'] as const) {
  const c = COPY[lang]

  for (const { role, path, state } of ROLES) {
    test.describe(() => {
      test.use({ storageState: state })
      test(`[${lang}] ${role}: client-side navigation moves focus to the h1 and sets the title; a first load does not`, async ({
        page,
      }) => {
        const home = c[role]
        await useLanguage(page, lang)
        await page.goto(path)
        await expect(h1(page, home)).toBeVisible()
        await expect(page).toHaveTitle(`${home} · Eng-LMS`)
        await expectBodyFocused(page)

        await openAccountSection(page, role)
        await page.getByRole('link', { name: c.changePassword }).click()
        await expectFocusedPage(page, c.changePassword)
        await page.goBack()
        await expectFocusedPage(page, home)
        await (await shellHomeLink(page)).click()
        await expectFocusedPage(page, home)
        await page.goBack()
        await expectFocusedPage(page, home)

        // A reload of a page first reached by client navigation is a first load: focus stays on body.
        await openAccountSection(page, role)
        await page.getByRole('link', { name: c.changePassword }).click()
        await expectFocusedPage(page, c.changePassword)
        await page.reload()
        await expect(h1(page, c.changePassword)).toBeVisible()
        await expect(page).toHaveTitle(`${c.changePassword} · Eng-LMS`)
        await expectBodyFocused(page)

        // Any → 404: a fresh 404, a link to the start page (`/` → the role home), then browser back to the 404.
        await page.goto('/does-not-exist')
        await expect(h1(page, c.notFound)).toBeVisible()
        await expect(page).toHaveTitle(`${c.notFound} · Eng-LMS`)
        await expectBodyFocused(page)
        await page.getByRole('link', { name: c.home }).click()
        await expectFocusedPage(page, home)
        await page.goBack()
        await expectFocusedPage(page, c.notFound)
      })
    })
  }

  test.describe(() => {
    test.use({ storageState: TUTOR_STATE })
    test(`[${lang}] a language change updates the title without a navigation and keeps focus on the switcher`, async ({
      page,
    }) => {
      await useLanguage(page, lang)
      await page.goto('/tutor')
      await expect(page).toHaveTitle(`${c.tutor} · Eng-LMS`)
      const other: Lang = lang === 'vi' ? 'en' : 'vi'
      const otherName = other === 'en' ? 'English' : 'Tiếng Việt'
      await openAccountSection(page, 'tutor')
      await page.getByRole('radiogroup', { name: c.language }).getByRole('radio', { name: otherName }).click()
      await expect(page).toHaveTitle(`${COPY[other].tutor} · Eng-LMS`)
      await expect(page.locator('html')).toHaveAttribute('lang', other)
      // The group's name is now in the other language; focus stayed on the activated segment (no jump to the h1).
      const segment = page
        .getByRole('radiogroup', { name: COPY[other].language })
        .getByRole('radio', { name: otherName })
      await expect(segment).toBeFocused()
      await expect(segment).toBeChecked()
    })
  })
}

async function blockSize(locator: Locator) {
  const box = await locator.boundingBox()
  expect(box, 'element has a layout box').not.toBeNull()
  return Math.round(box!.height * 100) / 100
}

test.describe(() => {
  test.use({ storageState: TUTOR_STATE })
  test('targets measure at least 44 px block size: skip link, shell home link, 404 link, switcher segments, account controls', async ({
    page,
  }, testInfo) => {
    const sizes: Record<string, number> = {}
    await page.goto('/tutor')
    await expect(h1(page, COPY.vi.tutor)).toBeVisible()
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: COPY.vi.skip })
    await expect(skip).toBeFocused()
    sizes.skipLink = await blockSize(skip)
    sizes.shellHomeLink = await blockSize(await shellHomeLink(page))
    // The focused skip link sits over the top bar's start (the menu button below 1024 px): leave it first.
    await skip.blur()
    await openAccountSection(page, 'tutor')
    for (const name of ['Tiếng Việt', 'English']) {
      sizes[`switcherSegment:${name}`] = await blockSize(page.getByRole('radio', { name }))
    }
    sizes.changePasswordLink = await blockSize(page.getByRole('link', { name: COPY.vi.changePassword }))
    sizes.logoutButton = await blockSize(page.getByRole('button', { name: 'Đăng xuất' }))
    await page.goto('/does-not-exist')
    sizes.notFoundHomeLink = await blockSize(page.getByRole('link', { name: COPY.vi.home }))
    await evidenceRecord(testInfo, 'ac6-target-sizes', { viewport: page.viewportSize(), minimum: 44, sizes })
    for (const [name, size] of Object.entries(sizes)) expect(size, name).toBeGreaterThanOrEqual(44)
  })
})

test.describe('UX step budgets (T-M1.9 design notes)', () => {
  test('switch the language: 1 step on the public pages, at most 2 from a shell page (pointer), 1 step (keyboard)', async ({
    browser,
  }, testInfo) => {
    const record: Record<string, number> = {}
    for (const [path, storageState, shell] of [
      ['/login', ANONYMOUS, null],
      ['/tutor', TUTOR_STATE, 'tutor'],
      ['/student', STUDENT_STATE, 'student'],
    ] as const) {
      const context = await browser.newContext({ storageState })
      const page = await context.newPage()
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const steps = new StepCounter()
      if (shell) await steps.step('open the account section', () => openAccountSection(page, shell))
      await steps.step('activate the "English" segment', () => page.getByRole('radio', { name: 'English' }).click())
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      steps.expectAtMost(shell ? 2 : 1)
      record[`pointer ${path}`] = steps.count
      await context.close()
    }
    // Keyboard on the sign-in page (the switcher is its first Tab stop): Tab into the group, arrow, Space. The page is
    // lazy and a first load moves no focus: wait for its h1 before the first Tab, or Tab can run on the loading region
    // (DEC-082).
    const context = await browser.newContext({ storageState: ANONYMOUS })
    const page = await context.newPage()
    await page.goto('/login')
    await expect(h1(page, COPY.vi.login)).toBeVisible()
    const steps = new StepCounter()
    await steps.step('Tab into the group, ArrowRight, Space', async () => {
      await page.keyboard.press('Tab')
      await expect(page.getByRole('radio', { name: 'Tiếng Việt' })).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(page.getByRole('radio', { name: 'English' })).toBeFocused()
      await page.keyboard.press('Space')
    })
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('radio', { name: 'English' })).toBeChecked()
    steps.expectAtMost(1)
    record['keyboard /login'] = steps.count
    await evidenceRecord(testInfo, 'steps-switch-language', {
      viewport: page.viewportSize(),
      budget: { publicPage: 1, shellPage: 2 },
      steps: record,
    })
    await context.close()
  })

  test('reach the main content: 1 step on a fresh shell load, 0 on sign-in/404, 0 after a client-side navigation', async ({
    browser,
  }, testInfo) => {
    const record: Record<string, number> = {}
    for (const [path, storageState] of [
      ['/tutor', TUTOR_STATE],
      ['/student', STUDENT_STATE],
    ] as const) {
      const context = await browser.newContext({ storageState })
      const page = await context.newPage()
      await page.goto(path)
      await expect(page.getByRole('main')).toBeVisible()
      const steps = new StepCounter()
      await steps.step('Tab to the skip link, Enter', async () => {
        await page.keyboard.press('Tab')
        await expect(page.getByRole('link', { name: COPY.vi.skip })).toBeFocused()
        await page.keyboard.press('Enter')
      })
      await expect(page.getByRole('main')).toBeFocused()
      steps.expectAtMost(1)
      record[`fresh ${path}`] = steps.count
      await context.close()
    }
    const anonymous = await browser.newContext({ storageState: ANONYMOUS })
    for (const path of ['/login', '/does-not-exist']) {
      const page = await anonymous.newPage()
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const steps = new StepCounter()
      // No step: the first Tab stop is already inside main (no header before it).
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('main'))).toBe(true)
      steps.expectAtMost(0)
      record[`fresh ${path}`] = steps.count
    }
    await anonymous.close()
    // Keyboard-only, signed in as the tutor: on the 404 page, Tab to the start-page link, Enter (`/` → the tutor home).
    // Focus lands on the new page's h1 (0 further steps).
    const context = await browser.newContext({ storageState: TUTOR_STATE })
    const page = await context.newPage()
    await page.goto('/does-not-exist')
    await expect(h1(page, COPY.vi.notFound)).toBeVisible()
    const link = page.getByRole('link', { name: COPY.vi.home })
    for (let i = 0; i < 5 && !(await link.evaluate((el) => el === document.activeElement)); i++)
      await page.keyboard.press('Tab')
    await expect(link).toBeFocused()
    await page.keyboard.press('Enter')
    const steps = new StepCounter()
    await expect(h1(page, COPY.vi.tutor)).toBeFocused()
    expect(await page.evaluate(() => !!document.activeElement?.closest('main'))).toBe(true)
    steps.expectAtMost(0)
    await evidenceShot(page, testInfo, 'focus-h1-after-keyboard-navigation-vi')
    record['after client-side navigation'] = steps.count
    await evidenceRecord(testInfo, 'steps-reach-main', {
      viewport: page.viewportSize(),
      budgets: { freshShell: 1, freshOther: 0, afterNavigation: 0 },
      steps: record,
    })
    await context.close()
  })
})
