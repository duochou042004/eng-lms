import type { Browser, Locator, Page, TestInfo } from '@playwright/test'
import {
  ANONYMOUS,
  apiChangePassword,
  apiSignIn,
  createStudent,
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
import { accept, acceptStatus, answerPreferencesInPlace, expect, guardContext, test } from '../support/fixtures'
import { accountOpener, accountPlace, openAccountSection, workspaceName, type ShellRole } from '../support/shell'
import { StepCounter } from '../support/steps'

// T-M2.11 (app shells) at the mandatory viewports: nested routes and the 404 inside the shells (AC1), the tutor sidebar or
// drawer (AC2), the student bottom tabs or top bar (AC3), the account section (AC4), the workspace name (AC5), the one-row
// top bar and reflow (AC7), accessibility and keyboard (AC9). Log out runs on fresh sessions only (a fresh tutor sign-in
// or a new student): the stored sessions are never logged out (T-M2.4 scope 10).

const h1 = (page: Page, name: string) => page.getByRole('heading', { level: 1, name })
const COPY = {
  tutorHome: 'Hôm nay',
  studentHome: 'Trang chủ',
  notFound: 'Không tìm thấy trang',
  login: 'Đăng nhập',
  change: 'Đổi mật khẩu',
  logout: 'Đăng xuất',
  forbidden: 'Bạn không có quyền mở trang này',
  tutorNav: 'Điều hướng gia sư',
  studentNav: 'Điều hướng học viên',
  metaLoading: 'Đang tải thông tin không gian dạy học',
  metaError: 'Không tải được tên không gian dạy học',
}
const HOME = { tutor: '/tutor/today', student: '/student/home' } as const
const TITLE = { tutor: COPY.tutorHome, student: COPY.studentHome } as const
const NAV = { tutor: COPY.tutorNav, student: COPY.studentNav } as const
const ITEM = { tutor: 'Hôm nay', student: 'Trang chủ' } as const
/** The shell 404's link names its destination (AC11 (g)). */
const BACK = { tutor: 'Về Hôm nay', student: 'Về Trang chủ' } as const
const LONG_NAME = 'Lớp tiếng Anh giao tiếp của cô Nguyễn Thị Phương Lan, Hà Nội'.padEnd(60, '.').slice(0, 60)

/** Evidence screenshot of a changed screen and state: evidence/T-M2.11/impl/<project>/. */
const shot = (page: Page, testInfo: TestInfo, name: string) => evidenceShot(page, testInfo, name, 'impl')

// Waits for any overlay's fade first (T-M2.20 AC7: axe right after a Sheet or Popover opens caught it mid-fade).
async function expectAccessible(page: Page) {
  await expectSettledAccessible(page)
}

/** Presses Tab until `target` has focus (at most `max` presses); returns the accessible names passed on the way. */
async function tabTo(page: Page, target: Locator, max = 12) {
  const passed: string[] = []
  for (let i = 1; i <= max; i++) {
    await page.keyboard.press('Tab')
    passed.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        return `${el?.tagName.toLowerCase()}:${el?.getAttribute('aria-label') ?? el?.textContent?.trim() ?? ''}`
      }),
    )
    if (await target.evaluate((el) => el === document.activeElement)) return passed
  }
  throw new Error(`target never received focus; passed ${passed.join(' → ')}`)
}

/** One row: the vertical extents of `row`'s laid-out direct children all overlap (none starts below another's bottom). */
async function expectOneRow(row: Locator, what: string) {
  const boxes = await row.evaluate((el) => {
    const bar = el.getBoundingClientRect()
    return {
      bar: { top: bar.top, bottom: bar.bottom, height: bar.height },
      children: [...el.children]
        .map((c) => c.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({ top: r.top, bottom: r.bottom })),
    }
  })
  const tops = boxes.children.map((c) => Math.round(c.top))
  // One row: the children's vertical extents overlap (no child starts below another one's bottom).
  for (const a of boxes.children)
    for (const b of boxes.children)
      expect(a.top, `${what}: children on one row (${JSON.stringify(tops)})`).toBeLessThan(b.bottom)
  return boxes
}

/** Below 768 px the public toolbar is two rows: the name row above the end-aligned switcher (AC11 (a), (j)). */
async function expectTwoRows(row: Locator, what: string) {
  const boxes = await row.evaluate((el) => {
    const [name, switcher] = [...el.children].map((c) => c.getBoundingClientRect())
    return {
      name: { top: name!.top, bottom: name!.bottom, width: name!.width },
      switcher: { top: switcher!.top, right: switcher!.right },
      row: {
        width: el.getBoundingClientRect().width,
        right: el.getBoundingClientRect().right,
      },
    }
  })
  expect(boxes.switcher.top, `${what}: the switcher row is below the name row`).toBeGreaterThanOrEqual(
    boxes.name.bottom,
  )
  expect(Math.abs(boxes.name.width - boxes.row.width), `${what}: the name row is full width`).toBeLessThanOrEqual(1)
  expect(Math.abs(boxes.switcher.right - boxes.row.right), `${what}: the switcher is end-aligned`).toBeLessThanOrEqual(
    1,
  )
  return boxes
}

/** Sum of the layout-shift entries without recent input (an upper bound of CLS), as in loading.spec.ts. */
async function layoutShiftTotal(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ total: number; entries: number }>((resolve) => {
        let total = 0
        let entries = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as Array<
            PerformanceEntry & { value: number; hadRecentInput: boolean }
          >) {
            if (!entry.hadRecentInput) {
              total += entry.value
              entries++
            }
          }
        }).observe({ type: 'layout-shift', buffered: true })
        setTimeout(() => resolve({ total, entries }), 250)
      }),
  )
}

/**
 * A page signed in through the API in a fresh context: the stored sessions stay untouched. Guarded with `guard` (the
 * test's `consoleGuard`; T-M2.31 (c), DEC-182: an unguarded one let the logout alert's crash pass).
 */
async function freshSession(browser: Browser, credentials: Credentials, guard: string[]) {
  const context = await browser.newContext({ storageState: ANONYMOUS })
  await guardContext(context, guard)
  // Its tests switch the language: answered in place, as in the `test` fixture's own context (T-M2.6 scope 7a).
  await answerPreferencesInPlace(context)
  const page = await context.newPage()
  await page.goto('/login')
  expect((await apiSignIn(page, credentials)).status).toBe(200)
  return { context, page }
}

/** A new student past the forced change (created with the stored tutor session). */
async function readyStudent(browser: Browser, testInfo: TestInfo, guard: string[]): Promise<Credentials> {
  const tutorContext = await browser.newContext({ storageState: TUTOR_STATE })
  await guardContext(tutorContext, guard)
  const tutorPage = await tutorContext.newPage()
  await tutorPage.goto('/tutor/today')
  const temporary = await createStudent(tutorPage, testInfo.project.name)
  await tutorContext.close()
  const { context, page } = await freshSession(browser, temporary, guard)
  const ready = await apiChangePassword(page, temporary)
  await context.close()
  return ready
}

for (const role of ['tutor', 'student'] as const) {
  const state = role === 'tutor' ? TUTOR_STATE : STUDENT_STATE

  test.describe(`${role} shell`, () => {
    test.use({ storageState: state })

    test(`AC1/AC2/AC3: /${role} → ${HOME[role]}, the frame at this viewport, the 404 inside the shell`, async ({
      page,
    }, testInfo) => {
      await page.goto(`/${role}`)
      await expect(page).toHaveURL(new RegExp(`${HOME[role]}$`))
      await expect(h1(page, TITLE[role])).toBeVisible()
      const banner = page.getByRole('banner')
      const place = accountPlace(page, role)
      const nav = page.getByRole('navigation', { name: NAV[role] })
      if (place === 'drawer') {
        await expect(nav).toHaveCount(0) // in the drawer
        await expect(accountOpener(page, role)).toBeVisible()
      } else {
        await expect(nav).toBeVisible()
        await expect(nav.getByRole('link', { name: ITEM[role] })).toHaveAttribute('aria-current', 'page')
      }
      if (place === 'popover') {
        // The account menu button sits top right (the top bar's inline-end padding is 16 px).
        const account = await accountOpener(page, role).boundingBox()
        expect(page.viewportSize()!.width - (account!.x + account!.width)).toBeLessThanOrEqual(17)
        await expect(page.getByRole('button', { name: 'Mở điều hướng' })).toHaveCount(0)
        if (role === 'tutor')
          await expect(banner.getByRole('navigation')).toHaveCount(0) // sidebar, not top bar
        else await expect(banner.getByRole('navigation', { name: COPY.studentNav })).toBeVisible()
      }
      if (place === 'sheet') {
        // AC3: bottom tabs with visible labels, 44 px targets, safe-area padding, nothing hidden behind them.
        const tabs = page.locator('nav[data-bottom-tabs]')
        await expect(tabs).toHaveAccessibleName(COPY.studentNav)
        await expect(banner.getByRole('navigation')).toHaveCount(0)
        const measures: Record<string, number> = {}
        for (const tab of [tabs.getByRole('link', { name: 'Trang chủ' }), tabs.getByRole('button', { name: 'Thêm' })]) {
          await expect(tab).toBeVisible()
          await expect(tab.getByText(/^(Trang chủ|Thêm)$/)).toBeVisible()
          const box = await tab.boundingBox()
          measures[`${await tab.textContent()}`] = box!.height
          expect(box!.height).toBeGreaterThanOrEqual(44)
          expect(box!.width).toBeGreaterThanOrEqual(44)
        }
        const layout = await page.evaluate(() => {
          const bar = document.querySelector<HTMLElement>('nav[data-bottom-tabs]')!
          const main = document.querySelector<HTMLElement>('main')!
          window.scrollTo(0, document.documentElement.scrollHeight)
          const last = main.lastElementChild!.getBoundingClientRect()
          const safeArea = [...document.styleSheets]
            .flatMap((sheet) => [...sheet.cssRules])
            .some(
              (rule) =>
                rule instanceof CSSStyleRule &&
                bar.matches(rule.selectorText) &&
                rule.style.paddingBlockEnd.includes('safe-area-inset-bottom'),
            )
          return {
            barTop: bar.getBoundingClientRect().top,
            barHeight: bar.getBoundingClientRect().height,
            lastContentBottom: last.bottom,
            mainPaddingEnd: parseFloat(getComputedStyle(main).paddingBlockEnd),
            safeArea,
          }
        })
        await evidenceRecord(testInfo, 'ac3-bottom-tabs', {
          viewport: page.viewportSize(),
          measures,
          layout,
        })
        expect(layout.safeArea, 'padding-block-end: env(safe-area-inset-bottom) on the bar').toBe(true)
        expect(layout.mainPaddingEnd).toBeGreaterThanOrEqual(layout.barHeight)
        expect(layout.lastContentBottom).toBeLessThanOrEqual(layout.barTop)
        await page.evaluate(() => window.scrollTo(0, 0))
      }
      await expect(page.getByRole('status', { name: COPY.metaLoading })).toHaveCount(0)
      await expectAccessible(page)
      await shot(page, testInfo, `${role}-default-vi`)

      // The 404 inside the shell (DEC-087 F-4).
      const unknown = role === 'tutor' ? '/tutor/nope' : '/student/a/b'
      await page.goto(unknown)
      await expect(h1(page, COPY.notFound)).toBeVisible()
      await expect(page).toHaveTitle(`${COPY.notFound} · Eng-LMS`)
      await expect(banner).toBeVisible()
      if (place === 'drawer') await expect(accountOpener(page, role)).toBeVisible()
      else await expect(page.getByRole('navigation', { name: NAV[role] })).toBeVisible()
      await expect(page.getByRole('main').getByRole('link', { name: BACK[role] })).toHaveAttribute('href', HOME[role])
      await expectAccessible(page)
      await shot(page, testInfo, `${role}-404-vi`)

      // A nav item leaves the 404: focus lands on the page h1 (AC9); browser Back lands on the 404's h1 (AC1).
      if (place === 'drawer') await openAccountSection(page, role)
      await page.getByRole('navigation', { name: NAV[role] }).getByRole('link', { name: ITEM[role] }).click()
      await expect(h1(page, TITLE[role])).toBeFocused()
      await expect(page).toHaveURL(new RegExp(`${HOME[role]}$`))
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await page.goBack()
      await expect(h1(page, COPY.notFound)).toBeFocused()
    })

    test(`AC2/AC3/AC4/AC9: the account section in its ${role} place: modal, focus, Esc and Close, axe`, async ({
      page,
    }, testInfo) => {
      await page.goto(HOME[role])
      await expect(h1(page, TITLE[role])).toBeVisible()
      await expect(page.getByRole('status', { name: COPY.metaLoading })).toHaveCount(0)
      const place = accountPlace(page, role)
      const opener = accountOpener(page, role)
      await expect(opener).toHaveAttribute('aria-expanded', 'false')
      const dialog = await openAccountSection(page, role)
      await expect(opener).toHaveAttribute('aria-expanded', 'true')
      const dialogName = {
        popover: 'Tài khoản',
        drawer: 'Điều hướng',
        sheet: 'Thêm',
      }[place]
      await expect(dialog).toHaveAccessibleName(dialogName)
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
      // AC4: the signed-in name, the language switcher, Change password and Log out (the same visual kind).
      await expect(dialog.getByText(/^Đã đăng nhập: .+/)).toBeVisible()
      await expect(dialog.getByRole('radiogroup', { name: 'Ngôn ngữ' })).toBeVisible()
      const change = dialog.getByRole('link', { name: COPY.change })
      const logout = dialog.getByRole('button', { name: COPY.logout })
      const looks = async (l: Locator) =>
        l.evaluate((el) => {
          const s = getComputedStyle(el)
          return [
            s.borderTopStyle,
            s.borderTopColor,
            s.backgroundColor,
            s.color,
            s.fontWeight,
            s.minHeight,
            s.textDecorationLine,
          ]
        })
      // No hover state on either (the pointer was over the opener, now under the dialog): point at the dialog's corner.
      const corner = (await dialog.boundingBox())!
      await page.mouse.move(corner.x + 2, corner.y + 2)
      // Polled: a hover background may still be fading out (the buttons' colour transition).
      await expect
        .poll(async () => JSON.stringify(await looks(change)) === JSON.stringify(await looks(logout)), {
          message: 'Change password and Log out look alike',
        })
        .toBe(true)
      if (place === 'drawer') {
        // The account section is the drawer's footer, after the navigation.
        const navBox = await dialog.getByRole('navigation', { name: COPY.tutorNav }).boundingBox()
        expect((await logout.boundingBox())!.y).toBeGreaterThan(navBox!.y)
      }
      // Tab stays inside.
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab')
        expect(await dialog.evaluate((el) => el.contains(document.activeElement)), `Tab ${i + 1} stays inside`).toBe(
          true,
        )
      }
      await expectAccessible(page)
      const name = {
        popover: `${role}-account-open-vi`,
        drawer: 'tutor-drawer-open-vi',
        sheet: 'student-more-open-vi',
      }[place]
      await shot(page, testInfo, name)
      // Esc closes; focus returns to the opener.
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(opener).toBeFocused()
      if (place !== 'popover') {
        // The visible Close button closes too.
        await opener.click()
        // React Aria's visually hidden dismiss buttons are named "Đóng" too (T-M2.32 (f)): the visible one has the X icon.
        await page
          .getByRole('dialog')
          .getByRole('button', { name: 'Đóng' })
          .filter({ has: page.locator('svg') })
          .click()
        await expect(page.getByRole('dialog')).toHaveCount(0)
        await expect(opener).toBeFocused()
      }
      // Choosing the current page's item navigates (a new entry), closes the overlay and focuses the h1.
      if (place === 'drawer') {
        await openAccountSection(page, role)
        await page.getByRole('dialog').getByRole('link', { name: ITEM[role] }).click()
        await expect(page.getByRole('dialog')).toHaveCount(0)
        await expect(h1(page, TITLE[role])).toBeFocused()
      }
    })

    test(`AC4: Change password from the ${role} account section opens the voluntary change; Cancel returns`, async ({
      page,
    }) => {
      await page.goto(HOME[role])
      await expect(h1(page, TITLE[role])).toBeVisible()
      await openAccountSection(page, role)
      await page.getByRole('link', { name: COPY.change }).click()
      await expect(h1(page, COPY.change)).toBeFocused()
      await expect(page.getByText('Sau khi đổi, bạn sẽ bị đăng xuất trên mọi thiết bị khác.')).toBeVisible()
      await page.getByRole('button', { name: 'Huỷ' }).click()
      await expect(page).toHaveURL(new RegExp(`${HOME[role]}$`))
      await expect(h1(page, TITLE[role])).toBeFocused()
    })

    test(`AC4: a language change from the ${role} account section re-renders the shell at once`, async ({ page }) => {
      await page.goto(HOME[role])
      await expect(h1(page, TITLE[role])).toBeVisible()
      const dialog = await openAccountSection(page, role)
      await dialog.getByRole('radio', { name: 'English' }).click()
      await expect(dialog.getByText(/^Signed in as .+/)).toBeVisible()
      await expect(dialog.getByRole('link', { name: 'Change password' })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(h1(page, role === 'tutor' ? 'Today' : 'Home')).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      await expect(accountOpener(page, role)).toBeVisible()
    })

    test(`AC5/AC7: the ${role} top bar shows the workspace name once, in one row (vi, en); a 60-character name truncates`, async ({
      page,
    }, testInfo) => {
      await page.goto(HOME[role])
      const name = await workspaceName(page)
      const banner = page.getByRole('banner')
      const home = banner.getByRole('link', { name, exact: true })
      await expect(home).toBeVisible()
      await expect(home).toHaveAttribute('title', name)
      await expect(home).toHaveAttribute('href', '/')
      const text = await banner.innerText()
      expect(text.split(name).length - 1, 'the workspace name once').toBe(1)
      // No product name next to it (the dev database's workspace may itself be named "Eng-LMS").
      expect(text.split('Eng-LMS').length - 1, 'no "Eng-LMS Eng-LMS"').toBe(name.includes('Eng-LMS') ? 1 : 0)
      const record: Record<string, unknown> = {}
      record.vi = await expectOneRow(banner, 'top bar (vi)')
      await page.evaluate(() => localStorage.setItem('englms.locale', 'en'))
      // A 60-character workspace name (the API is mocked for this page: the name is tutor data, T-M2.6).
      await page.route('**/api/v1/meta', async (route) => {
        const response = await route.fetch()
        await route.fulfill({
          response,
          json: { ...(await response.json()), displayName: LONG_NAME },
        })
      })
      await page.reload()
      const longHome = banner.getByRole('link', {
        name: LONG_NAME,
        exact: true,
      })
      await expect(longHome).toBeVisible()
      await expect(longHome).toHaveAttribute('title', LONG_NAME)
      const truncated = await longHome
        .locator('span')
        .first()
        .evaluate((el) => el.scrollWidth > el.clientWidth)
      record.en = await expectOneRow(banner, 'top bar (en, 60-character name)')
      await expectNoHorizontalScroll(page)
      await shot(page, testInfo, `${role}-long-name-en`)
      await evidenceRecord(testInfo, `ac7-${role}-one-row`, {
        viewport: page.viewportSize(),
        truncated,
        ...record,
      })
      // At 360 px a 60-character name never fits (at 768 px it may, beside the tutor's menu button only).
      if (page.viewportSize()!.width < 480) expect(truncated, '60 characters truncate on a phone').toBe(true)
    })

    test(`AC7: no horizontal scroll for the ${role} shell at 320–1280 px, overlays closed and open`, async ({
      page,
    }) => {
      await page.goto(HOME[role])
      await expect(h1(page, TITLE[role])).toBeVisible()
      for (const width of [320, 360, 768, 1024, 1280]) {
        await page.setViewportSize({ width, height: 800 })
        await expect(accountOpener(page, role)).toBeVisible()
        await expectNoHorizontalScroll(page)
        await openAccountSection(page, role)
        await expectNoHorizontalScroll(page)
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog')).toHaveCount(0)
      }
    })
  })
}

test.describe('Log out from any shell page in ≤ 2 steps (fresh sessions)', () => {
  for (const role of ['tutor', 'student'] as const) {
    test(`AC4/AC9: ${role}: pointer (open the account section, Log out) and keyboard`, async ({
      consoleGuard,
      browser,
    }, testInfo) => {
      const credentials =
        role === 'tutor'
          ? { username: TUTOR_USERNAME, password: tutorPassword() }
          : await readyStudent(browser, testInfo, consoleGuard)
      const record: Record<string, unknown> = {}
      for (const at of [HOME[role], role === 'tutor' ? '/tutor/nope' : '/student/a/b']) {
        const { context, page } = await freshSession(browser, credentials, consoleGuard)
        await page.goto(at)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        const steps = new StepCounter()
        await steps.step('open the account section', () => openAccountSection(page, role))
        await steps.step('Log out', () => page.getByRole('dialog').getByRole('button', { name: COPY.logout }).click())
        await expect(page).toHaveURL(/\/login$/)
        await expect(h1(page, COPY.login)).toBeVisible()
        steps.expectAtMost(2)
        record[`pointer ${at}`] = steps.count
        await context.close()
      }
      // Keyboard only: skip link → navigation → account menu → Log out.
      const { context, page } = await freshSession(browser, credentials, consoleGuard)
      await page.goto(HOME[role])
      await expect(h1(page, TITLE[role])).toBeVisible()
      await page.keyboard.press('Tab')
      await expect(page.getByRole('link', { name: 'Chuyển đến nội dung chính' })).toBeFocused()
      const path = await tabTo(page, accountOpener(page, role))
      await page.keyboard.press('Enter')
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      const inside = await tabTo(page, dialog.getByRole('button', { name: COPY.logout }))
      await page.keyboard.press('Enter')
      await expect(h1(page, COPY.login)).toBeVisible()
      await evidenceRecord(testInfo, `steps-logout-${role}`, {
        viewport: page.viewportSize(),
        budget: 2,
        steps: record,
        keyboard: { toAccountOpener: path, insideSection: inside },
      })
      await context.close()
    })
  }
})

test.describe('workspace name on the public pages (AC5)', () => {
  test.use({ storageState: ANONYMOUS })

  test('/login shows the workspace name above the h1 in its toolbar row (one row at 360 px, vi and en); session first', async ({
    page,
  }, testInfo) => {
    const events: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/api/')) events.push(`start ${new URL(r.url()).pathname}`)
    })
    page.on('requestfinished', (r) => {
      if (r.url().includes('/api/')) events.push(`end ${new URL(r.url()).pathname}`)
    })
    await page.goto('/login')
    const heading = h1(page, COPY.login)
    await expect(heading).toBeVisible()
    await expect(page.getByRole('status', { name: COPY.metaLoading })).toHaveCount(0)
    expect(events.slice(0, 3)).toEqual(['start /api/v1/auth/session', 'end /api/v1/auth/session', 'start /api/v1/meta'])
    const name = await workspaceName(page)
    const shown = page.getByRole('main').getByText(name, { exact: true })
    await expect(shown).toBeVisible()
    await expect(shown).toHaveAttribute('title', name)
    expect((await shown.boundingBox())!.y).toBeLessThan((await heading.boundingBox())!.y)
    const toolbar = page.locator('main > div > div').first()
    await expect(toolbar).toContainText(name)
    await expect(toolbar.getByRole('radiogroup', { name: 'Ngôn ngữ' })).toBeVisible()
    // AC7 as amended by AC11 (a), (j): one row at >= 768 px, two rows (name, then switcher) below.
    const rows = page.viewportSize()!.width >= 768 ? expectOneRow : expectTwoRows
    const vi = await rows(toolbar, 'public toolbar (vi)')
    await expectAccessible(page)
    await shot(page, testInfo, 'login-workspace-name-vi')
    await toolbar.getByRole('radio', { name: 'English' }).click()
    await expect(h1(page, 'Sign in')).toBeVisible()
    const en = await rows(toolbar, 'public toolbar (en)')
    await evidenceRecord(testInfo, 'ac5-login-workspace-name', {
      events,
      viewport: page.viewportSize(),
      vi,
      en,
    })
  })

  test('the public frame: loading state, compact error with Retry beside nothing interactive, Retry recovers', async ({
    page,
    consoleGuard,
  }, testInfo) => {
    let release: () => void = () => {}
    const released = new Promise<void>((resolve) => (release = resolve))
    let fail = true
    await page.route('**/api/v1/meta', async (route) => {
      if (fail)
        return route.fulfill({
          status: 500,
          contentType: 'application/problem+json',
          body: '{"status":500,"code":"INTERNAL_ERROR"}',
        })
      await released
      return route.continue()
    })
    await page.goto('/login')
    const alert = page.getByRole('alert')
    await expect(alert).toContainText(COPY.metaError)
    acceptStatus(consoleGuard, 500, '/api/v1/meta')
    await expectAccessible(page)
    await shot(page, testInfo, 'login-workspace-name-error-vi')
    fail = false
    await alert.getByRole('button', { name: 'Thử lại' }).click()
    await expect(page.getByRole('status', { name: COPY.metaLoading })).toHaveAttribute('aria-busy', 'true')
    release()
    await expect(page.getByRole('main').getByText(await workspaceName(page), { exact: true })).toBeVisible()
  })
})

test.describe('AC11 (a), (j): the public frame below 768 px', () => {
  test.use({ storageState: ANONYMOUS })

  /** The characters of the name element's text that are painted inside its box (line clamp hides the rest). */
  const visibleCharacters = (name: Locator) =>
    name.evaluate((el) => {
      const box = el.getBoundingClientRect()
      const text = el.firstChild as Text
      const range = document.createRange()
      let count = 0
      for (let i = 0; i < text.length; i++) {
        range.setStart(text, i)
        range.setEnd(text, i + 1)
        const r = range.getBoundingClientRect()
        if (r.width > 0 && r.bottom <= box.bottom + 0.5 && r.right <= box.right + 0.5) count++
      }
      return count
    })

  for (const width of [320, 360, 568, 740]) {
    test(`at ${width} px: two rows in every state, a 60-character name shows ≥ 30 characters, the h1 never moves (CLS ≤ 0.05)`, async ({
      page,
      consoleGuard,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 740 })
      let mode: 'hold' | 'long' | 'fail' = 'hold'
      let release: () => void = () => {}
      const released = new Promise<void>((resolve) => (release = resolve))
      await page.route('**/api/v1/meta', async (route) => {
        if (mode === 'fail')
          return route.fulfill({
            status: 500,
            contentType: 'application/problem+json',
            body: '{"status":500,"code":"INTERNAL_ERROR"}',
          })
        if (mode === 'hold') await released
        const response = await route.fetch()
        await route.fulfill({
          response,
          json: { ...(await response.json()), displayName: LONG_NAME },
        })
      })
      const toolbar = page.locator('main > div > div').first()
      const heading = h1(page, COPY.login)
      const record: Record<string, unknown> = {}

      // Loading: the name is still pending.
      await page.goto('/login')
      await expect(heading).toBeVisible()
      await expect(page.getByRole('status', { name: COPY.metaLoading })).toBeVisible()
      const loadingTop = (await heading.boundingBox())!.y
      record.loading = {
        h1Top: loadingTop,
        rows: await expectTwoRows(toolbar, 'loading'),
      }
      await shot(page, testInfo, `login-${width}-name-loading-vi`)

      // Loaded: the 60-character name, at most two lines, at least 30 characters visible.
      mode = 'long'
      release()
      const name = page.getByRole('main').getByText(LONG_NAME, { exact: true })
      await expect(name).toBeVisible()
      await expect(name).toHaveAttribute('title', LONG_NAME)
      const shown = await visibleCharacters(name)
      const loadedTop = (await heading.boundingBox())!.y
      record.loaded = {
        h1Top: loadedTop,
        visibleCharacters: shown,
        rows: await expectTwoRows(toolbar, 'loaded'),
      }
      expect(shown, 'characters of the 60-character name on screen').toBeGreaterThanOrEqual(30)
      await expectAccessible(page)
      await shot(page, testInfo, `login-${width}-long-name-vi`)
      record.loadedCls = await layoutShiftTotal(page)

      // Error: the compact message wraps (≤ 2 lines) with Retry at the end; same rows, same h1 top.
      mode = 'fail'
      await page.reload()
      const alert = page.getByRole('alert')
      await expect(alert).toContainText(COPY.metaError)
      acceptStatus(consoleGuard, 500, '/api/v1/meta')
      await expect(alert.getByRole('button', { name: 'Thử lại' })).toBeVisible()
      const errorTop = (await heading.boundingBox())!.y
      record.error = {
        h1Top: errorTop,
        rows: await expectTwoRows(toolbar, 'error'),
      }
      record.errorCls = await layoutShiftTotal(page)
      await expectAccessible(page)
      await shot(page, testInfo, `login-${width}-name-error-vi`)
      await evidenceRecord(testInfo, `ac11a-public-frame-${width}`, record)

      expect(Math.abs(loadedTop - loadingTop), 'h1 top: loaded vs loading').toBeLessThanOrEqual(0.5)
      expect(Math.abs(errorTop - loadingTop), 'h1 top: error vs loading').toBeLessThanOrEqual(0.5)
      expect((record.loadedCls as { total: number }).total, 'CLS (loading → loaded)').toBeLessThanOrEqual(0.05)
      expect((record.errorCls as { total: number }).total, 'CLS (error load)').toBeLessThanOrEqual(0.05)
    })

    test(`at ${width} px: the loading skeleton draws the same two rows; the h1 appears where its line was`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 740 })
      let release: () => void = () => {}
      const released = new Promise<void>((resolve) => (release = resolve))
      await page.route(/\/assets\/LoginPage-[^/]+\.js$/, async (route) => {
        await released
        await route.continue()
      })
      await page.goto('/login', { waitUntil: 'commit' })
      const region = page.getByRole('status', { name: 'Đang tải trang' })
      await expect(region.locator('[data-shown]')).toHaveCount(1)
      const rows = await expectTwoRows(region.getByTestId('route-loading-toolbar'), 'skeleton')
      const line = (await region.getByTestId('route-loading-title').getByTestId('skeleton').boundingBox())!.y
      await shot(page, testInfo, `login-${width}-route-loading-vi`)
      release()
      const heading = h1(page, COPY.login)
      await expect(heading).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      const top = (await heading.boundingBox())!.y
      const cls = await layoutShiftTotal(page)
      await evidenceRecord(testInfo, `ac11a-public-skeleton-${width}`, {
        rows,
        titleLine: line,
        h1Top: top,
        cls,
      })
      expect(Math.abs(top - line), 'heading vs its skeleton line').toBeLessThanOrEqual(8)
      expect(cls.total).toBeLessThanOrEqual(0.05)
    })
  }
})

test.describe('workspace name in the shell: loading and error (AC5)', () => {
  test.use({ storageState: TUTOR_STATE })

  test('the home link is there while loading (named "Eng-LMS"); after an error the Retry sits beside it', async ({
    page,
    consoleGuard,
  }, testInfo) => {
    let release: () => void = () => {}
    const released = new Promise<void>((resolve) => (release = resolve))
    let mode: 'hold' | 'fail' | 'pass' = 'hold'
    await page.route('**/api/v1/meta', async (route) => {
      if (mode === 'hold') await released
      if (mode === 'fail')
        return route.fulfill({
          status: 500,
          contentType: 'application/problem+json',
          body: '{"status":500,"code":"INTERNAL_ERROR"}',
        })
      return route.continue()
    })
    await page.goto('/tutor/today')
    await expect(h1(page, COPY.tutorHome)).toBeVisible()
    const loadingLink = page.getByRole('banner').getByRole('link', { name: 'Eng-LMS', exact: true })
    await expect(loadingLink.getByRole('status', { name: COPY.metaLoading })).toHaveAttribute('aria-busy', 'true')
    await expectNoAxeViolations(page)
    await shot(page, testInfo, 'tutor-workspace-name-loading-vi')
    mode = 'pass'
    release()
    const name = await workspaceName(page)
    await expect(page.getByRole('banner').getByRole('link', { name, exact: true })).toBeVisible()
    mode = 'fail'
    await page.reload()
    const alert = page.getByRole('banner').getByRole('alert')
    await expect(alert).toContainText(COPY.metaError)
    acceptStatus(consoleGuard, 500, '/api/v1/meta')
    const home = page.getByRole('banner').getByRole('link', { name: 'Eng-LMS', exact: true })
    await expect(home).toBeVisible()
    expect(await home.locator('button, a, input').count(), 'nothing interactive inside the home link').toBe(0)
    await expect(alert.getByRole('button', { name: 'Thử lại' })).toBeVisible()
    await expectOneRow(page.getByRole('banner'), 'top bar with the error')
    await expectAccessible(page)
    await shot(page, testInfo, 'tutor-workspace-name-error-vi')
    mode = 'pass'
    await alert.getByRole('button', { name: 'Thử lại' }).click()
    await expect(page.getByRole('banner').getByRole('link', { name, exact: true })).toBeVisible()
  })
})

test.describe('reduced motion (AC9)', () => {
  for (const role of ['tutor', 'student'] as const) {
    test.describe(() => {
      test.use({
        storageState: role === 'tutor' ? TUTOR_STATE : STUDENT_STATE,
      })
      test(`the ${role} ${role === 'tutor' ? 'drawer' : 'More sheet'} slides in, and does not move with reduced motion`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width: 360, height: 740 })
        const names: Record<string, string[]> = {}
        for (const reducedMotion of ['no-preference', 'reduce'] as const) {
          await page.emulateMedia({ reducedMotion })
          await page.goto(HOME[role])
          await expect(h1(page, TITLE[role])).toBeVisible()
          await page.evaluate(() => {
            const seen: string[] = []
            Object.assign(window, { __animations: seen })
            document.addEventListener('animationstart', (e) => seen.push(e.animationName))
          })
          await openAccountSection(page, role as ShellRole)
          await page.waitForFunction(() => !document.querySelector('[data-entering]'))
          names[reducedMotion] = await page.evaluate(
            () => (window as unknown as { __animations: string[] }).__animations,
          )
          await page.keyboard.press('Escape')
        }
        await evidenceRecord(testInfo, `ac9-reduced-motion-${role}`, {
          animationsStarted: names,
        })
        expect(
          names['no-preference']!.some((n) => /slide/.test(n)),
          'slides without a preference',
        ).toBe(true)
        expect(
          names.reduce!.some((n) => /slide/.test(n)),
          'no movement with reduced motion',
        ).toBe(false)
      })
    })
  }
})

// The /dev/ui gallery exists only in the development build (`pnpm dev`): its T-M2.11 entries, open and closed.
const DEV_SERVER = /:5173\/?$/.test(process.env.E2E_BASE_URL ?? '')

test('/dev/ui (dev build): the Sheet, Popover, NavList, BottomTabs and ButtonLink entries, accessible', async ({
  page,
}, testInfo) => {
  test.skip(!DEV_SERVER, 'needs the dev server: E2E_BASE_URL=http://localhost:5173 (no /dev/ui in the packaged build)')
  await page.goto('/dev/ui')
  const navigation = page.getByRole('heading', {
    level: 2,
    name: 'Điều hướng',
  })
  await navigation.scrollIntoViewIfNeeded()
  await expect(page.getByRole('navigation', { name: 'Điều hướng mẫu', exact: true })).toBeVisible()
  await expectAccessible(page)
  await shot(page, testInfo, 'devui-entries-vi')
  for (const [open, name] of [
    ['Mở ngăn điều hướng', 'devui-sheet-start-open-vi'],
    ['Mở sheet dưới', 'devui-sheet-bottom-open-vi'],
    ['Cô Lan', 'devui-popover-open-vi'],
  ] as const) {
    await page.getByRole('button', { name: open, exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectAccessible(page)
    await shot(page, testInfo, name)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
})

// T-M2.13 scope 3 (AC3, AC4; DEC-155): a failed Log out keeps the page and the session and says so in the open account
// section; Log out stays the retry. Fresh tutor sign-ins only (T-M2.4 scope 10). The student's More sheet renders the
// same AccountSection (component test, G0 D-3).
test.describe('T-M2.13: Log out gives feedback when it fails', () => {
  const FAILED = {
    title: 'Chưa đăng xuất được',
    failed: 'Bạn vẫn đang đăng nhập. Hãy thử lại.',
    offline: 'Bạn đang ngoại tuyến và vẫn đang đăng nhập. Hãy đăng xuất lại khi có mạng.',
  }

  /** A second tab of the same browser that records the auth channel's messages. */
  async function listeningTab(context: Awaited<ReturnType<typeof freshSession>>['context']) {
    const other = await context.newPage()
    await other.goto(HOME.tutor)
    await expect(h1(other, COPY.tutorHome)).toBeVisible()
    await other.evaluate(() => {
      const received: unknown[] = []
      Object.assign(window, { __auth: received })
      new BroadcastChannel('englms-auth').addEventListener('message', (event) => received.push(event.data))
    })
    return {
      page: other,
      received: () => other.evaluate(() => (window as unknown as { __auth: unknown[] }).__auth),
    }
  }

  async function expectFailure(page: Page, testInfo: TestInfo, text: string, name: string) {
    const dialog = page.getByRole('dialog')
    const logout = dialog.getByRole('button', { name: COPY.logout })
    // Not busy for long: no endless spinner (O-1).
    await expect(logout).not.toHaveAttribute('data-pending', { timeout: 1000 })
    const alert = dialog.getByRole('alert')
    await expect(alert).toContainText(FAILED.title)
    await expect(alert).toContainText(text)
    await expect(logout).toBeFocused()
    await expectFocusNotLost(page)
    expect(new URL(page.url()).pathname).toBe(HOME.tutor)
    await expectAccessible(page)
    if (testInfo.project.name === 'phone-small') {
      // The title and the text are separate blocks (measured one by one: joined, "được" + "Bạn" reads as one word).
      await expectNoMidWordBreak(alert.getByText(FAILED.title, { exact: true }))
      await expectNoMidWordBreak(alert.getByText(text, { exact: true }))
    }
    await shot(page, testInfo, name)
  }

  test('offline: Log out stops being busy at once and says the user is still signed in; back online it signs out (AC3)', async ({
    browser,
    consoleGuard,
  }, testInfo) => {
    test.skip(
      !['phone-small', 'laptop'].includes(testInfo.project.name),
      'checked at phone-small (drawer) and laptop (popover)',
    )
    const { context, page } = await freshSession(
      browser,
      {
        username: TUTOR_USERNAME,
        password: tutorPassword(),
      },
      consoleGuard,
    )
    const other = await listeningTab(context)
    await page.goto(HOME.tutor)
    await expect(h1(page, COPY.tutorHome)).toBeVisible()
    const dialog = await openAccountSection(page, 'tutor')
    await context.setOffline(true)
    await dialog.getByRole('button', { name: COPY.logout }).click()
    await expectFailure(page, testInfo, FAILED.offline, `logout-failed-offline-${accountPlace(page, 'tutor')}-vi`)
    expect(await other.received(), 'nothing posted on the channel').toEqual([])
    expect(new URL(other.page.url()).pathname).toBe(HOME.tutor)

    await context.setOffline(false)
    await dialog.getByRole('button', { name: COPY.logout }).click()
    await expect(dialog.getByRole('alert')).toHaveCount(0)
    await expect(page).toHaveURL(/\/login$/)
    await expect(h1(page, COPY.login)).toBeVisible()
    await expect.poll(other.received).toEqual([{ type: 'signed-out' }])
    accept(consoleGuard, (e) => /ERR_INTERNET_DISCONNECTED/.test(e))
    await context.close()
  })

  test('a 500: the alert, the page and the session stay, nothing is posted; Log out again (204) signs out (AC4)', async ({
    browser,
    consoleGuard,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'laptop', 'checked at laptop')
    const { context, page } = await freshSession(
      browser,
      {
        username: TUTOR_USERNAME,
        password: tutorPassword(),
      },
      consoleGuard,
    )
    const other = await listeningTab(context)
    await page.goto(HOME.tutor)
    await expect(h1(page, COPY.tutorHome)).toBeVisible()
    await page.route('**/api/v1/auth/logout', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/problem+json',
        body: '{"status":500,"code":"INTERNAL_ERROR"}',
      }),
    )
    const dialog = await openAccountSection(page, 'tutor')
    await dialog.getByRole('button', { name: COPY.logout }).click()
    await expectFailure(page, testInfo, FAILED.failed, `logout-failed-500-${accountPlace(page, 'tutor')}-vi`)
    expect(await other.received(), 'nothing posted on the channel').toEqual([])
    // Still signed in on the server: a protected read answers.
    expect((await page.request.get('/api/v1/auth/session')).status()).toBe(200)

    await page.unroute('**/api/v1/auth/logout')
    await dialog.getByRole('button', { name: COPY.logout }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(h1(page, COPY.login)).toBeVisible()
    await expect.poll(other.received).toEqual([{ type: 'signed-out' }])
    acceptStatus(consoleGuard, 500, '/api/v1/auth/logout')
    await context.close()
  })
})

/** Answers every Log out with a 500 (T-M2.29, T-M2.31). */
async function failLogout(page: Page) {
  await page.route('**/api/v1/auth/logout', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/problem+json',
      body: '{"status":500,"code":"INTERNAL_ERROR"}',
    }),
  )
}

/** The page's own scroll position (behind a modal overlay it must not move). */
const pageScroll = (page: Page) => page.evaluate(() => document.scrollingElement?.scrollTop ?? 0)
// Scrolled first, so a page that can scroll has room to move both ways; the baseline is read once the overlay is open.
const scrollPageToEnd = (page: Page) => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))

// T-M2.29 (h1), (h2) (DEC-172 UX-1, UX-2): the logout failure alert is reachable on a phone held sideways (the drawer's
// footer scrolls) and is on screen on the forced change-password page (it scrolls itself into view, `nearest`); focus
// stays on Log out and the page behind an overlay does not move. Fresh sessions only (T-M2.4 scope 10).
test.describe('T-M2.29: the logout failure alert is on screen', () => {
  const FAILED = {
    vi: {
      title: 'Chưa đăng xuất được',
      text: 'Bạn vẫn đang đăng nhập. Hãy thử lại.',
    },
    en: {
      title: "Couldn't log out",
      text: "You're still signed in. Try again.",
    },
  }

  /**
   * Each target, scrolled into view, is wholly visible (the viewport and every clipping ancestor: IntersectionObserver),
   * and the open dialog stays inside the viewport. Ratio 0.99: `nearest` can stop on a fractional offset (seen: 0.995).
   */
  async function expectReachable(page: Page, targets: Locator[]) {
    for (const target of targets) {
      await target.scrollIntoViewIfNeeded()
      await expect(target).toBeInViewport({ ratio: 0.99 })
    }
    const height = page.viewportSize()!.height
    await expect
      .poll(
        async () => {
          const box = (await page.getByRole('dialog').boundingBox())!
          return box.y >= 0 && box.y + box.height <= height + 0.5
        },
        { message: 'the sheet stays inside the viewport' },
      )
      .toBe(true)
    await expectNoHorizontalScroll(page)
  }

  test('AC1/AC2: tutor drawer at 740×360 and 568×320, logout answered 500: title and text reachable, focus stays', async ({
    browser,
    consoleGuard,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-small', 'a phone held sideways: phone-small emulation')
    const { context, page } = await freshSession(
      browser,
      {
        username: TUTOR_USERNAME,
        password: tutorPassword(),
      },
      consoleGuard,
    )
    await failLogout(page)
    for (const [width, height] of [
      [740, 360],
      [568, 320],
    ] as const) {
      await page.setViewportSize({ width, height })
      await page.goto(HOME.tutor)
      await expect(h1(page, COPY.tutorHome)).toBeVisible()
      await scrollPageToEnd(page)
      const dialog = await openAccountSection(page, 'tutor')
      expect(accountPlace(page, 'tutor')).toBe('drawer')
      const before = await pageScroll(page)
      const logout = dialog.getByRole('button', { name: COPY.logout })
      await logout.click()
      const alert = dialog.getByRole('alert')
      await expect(alert).toContainText(FAILED.vi.text)
      await expect(logout).toBeFocused()
      await expect
        .poll(() => pageScroll(page), {
          message: 'the page behind the drawer does not move',
        })
        .toBe(before)
      await expect(alert.getByText(FAILED.vi.text, { exact: true })).toBeInViewport({ ratio: 0.99 })
      await shot(page, testInfo, `logout-failed-drawer-${width}x${height}-vi`)
      await expectReachable(page, [
        alert.getByText(FAILED.vi.title, { exact: true }),
        alert.getByText(FAILED.vi.text, { exact: true }),
      ])
      await expectSettledAccessible(page)
      await expectNoMidWordBreak(alert.getByText(FAILED.vi.title, { exact: true }))
      await expectNoMidWordBreak(alert.getByText(FAILED.vi.text, { exact: true }))
      await expect(logout).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
    }
    acceptStatus(consoleGuard, 500, '/api/v1/auth/logout')
    await context.close()
  })

  test('AC1/AC2: student More sheet at 568×320, logout answered 500: all of its content reachable, the page stays', async ({
    browser,
    consoleGuard,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-small', 'a phone held sideways: phone-small emulation')
    const credentials = await readyStudent(browser, testInfo, consoleGuard)
    const { context, page } = await freshSession(browser, credentials, consoleGuard)
    await failLogout(page)
    await page.setViewportSize({ width: 568, height: 320 })
    await page.goto(HOME.student)
    await expect(h1(page, COPY.studentHome)).toBeVisible()
    await scrollPageToEnd(page)
    const dialog = await openAccountSection(page, 'student')
    expect(accountPlace(page, 'student')).toBe('sheet')
    const before = await pageScroll(page)
    const logout = dialog.getByRole('button', { name: COPY.logout })
    await logout.click()
    const alert = dialog.getByRole('alert')
    await expect(alert).toContainText(FAILED.vi.text)
    await expect(logout).toBeFocused()
    await expect
      .poll(() => pageScroll(page), {
        message: 'the page behind the sheet does not move',
      })
      .toBe(before)
    // Everything laid out in the sheet (the visually hidden Dismiss buttons excepted: 1 px, clipped by design).
    const targets: Locator[] = []
    for (const candidate of await dialog.locator('h2, p, a, button, [role="radio"]').all()) {
      const box = await candidate.boundingBox()
      if (box && box.width > 1 && box.height > 1) targets.push(candidate)
    }
    expect(targets.length, 'the sheet has content to reach').toBeGreaterThan(5)
    await expectReachable(page, targets)
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'logout-failed-more-sheet-568x320-vi')
    acceptStatus(consoleGuard, 500, '/api/v1/auth/logout')
    await context.close()
  })

  test('AC2: the account popover or drawer at this viewport: the alert does not move the page; focus stays', async ({
    browser,
    consoleGuard,
  }, testInfo) => {
    const { context, page } = await freshSession(
      browser,
      {
        username: TUTOR_USERNAME,
        password: tutorPassword(),
      },
      consoleGuard,
    )
    await failLogout(page)
    await page.goto(HOME.tutor)
    await expect(h1(page, COPY.tutorHome)).toBeVisible()
    await scrollPageToEnd(page)
    const dialog = await openAccountSection(page, 'tutor')
    const before = await pageScroll(page)
    const logout = dialog.getByRole('button', { name: COPY.logout })
    await logout.click()
    const alert = dialog.getByRole('alert')
    await expect(alert).toContainText(FAILED.vi.text)
    await expect(alert).toBeInViewport({ ratio: 0.99 })
    await expect(logout).toBeFocused()
    await expect
      .poll(() => pageScroll(page), {
        message: 'the page behind the overlay does not move',
      })
      .toBe(before)
    await expectSettledAccessible(page)
    await shot(page, testInfo, `logout-failed-${accountPlace(page, 'tutor')}-vi`)
    acceptStatus(consoleGuard, 500, '/api/v1/auth/logout')
    await context.close()
  })

  test('AC2/AC5: forced change-password page, logout answered 500: the alert is on screen, focus stays (vi, en)', async ({
    browser,
    consoleGuard,
  }, testInfo) => {
    const tutorContext = await browser.newContext({
      storageState: TUTOR_STATE,
    })
    await guardContext(tutorContext, consoleGuard)
    const tutorPage = await tutorContext.newPage()
    await tutorPage.goto(HOME.tutor)
    const temporary = await createStudent(tutorPage, testInfo.project.name)
    await tutorContext.close()
    const { context, page } = await freshSession(browser, temporary, consoleGuard)
    await failLogout(page)
    await page.goto('/change-password')
    await expect(h1(page, COPY.change)).toBeVisible()
    const logout = page.getByRole('main').getByRole('button', { name: COPY.logout })
    await logout.click()
    const alert = page.getByRole('alert').filter({ hasText: FAILED.vi.title })
    await expect(alert).toBeInViewport({ ratio: 0.99 })
    await expect(logout).toBeFocused()
    await expectFocusNotLost(page)
    await expectSettledAccessible(page)
    if (testInfo.project.name === 'phone-small') {
      await expectNoMidWordBreak(alert.getByText(FAILED.vi.title, { exact: true }))
      await expectNoMidWordBreak(alert.getByText(FAILED.vi.text, { exact: true }))
    }
    await shot(page, testInfo, 'logout-failed-change-password-forced-vi')

    // English: the same state, re-rendered by the switcher (the alert stays while the logout holds its error).
    await page.getByRole('radio', { name: 'English' }).check()
    const alertEn = page.getByRole('alert').filter({ hasText: FAILED.en.title })
    await expect(alertEn).toContainText(FAILED.en.text)
    await alertEn.scrollIntoViewIfNeeded()
    await expectSettledAccessible(page)
    if (testInfo.project.name === 'phone-small') {
      await expectNoMidWordBreak(alertEn.getByText(FAILED.en.title, { exact: true }))
      await expectNoMidWordBreak(alertEn.getByText(FAILED.en.text, { exact: true }))
    }
    await shot(page, testInfo, 'logout-failed-change-password-forced-en')
    acceptStatus(consoleGuard, 500, '/api/v1/auth/logout')
    await context.close()
  })
})

// T-M2.31 (DEC-178 QA-1, UX-1; DEC-182): the account popover scrolls inside itself on a phone held sideways (a); in the
// tutor drawer the focused Log out keeps its focus ring inside the footer when the alert appears (b); a failed logout
// never turns into the route error page on Esc or a second Log out (c). Fresh, guarded sessions only (T-M2.4 scope 10).
test.describe('T-M2.31: the account overlays scroll the logout alert into place', () => {
  const FAILED = {
    vi: { title: 'Chưa đăng xuất được', text: 'Bạn vẫn đang đăng nhập. Hãy thử lại.', logout: COPY.logout },
    en: { title: "Couldn't log out", text: "You're still signed in. Try again.", logout: 'Log out' },
  }
  const ROUTE_ERROR = 'Không hiển thị được trang này'
  type Locale = keyof typeof FAILED

  /** The open dialog's popover (React Aria renders the dialog as its only child). */
  const popoverOf = (dialog: Locator) => dialog.locator('xpath=..')

  /**
   * How far `target` (with its outward focus ring when `ring`) sits inside the padding box (`clientTop` / `clientHeight`)
   * of `box`, or of its nearest scrolling ancestor: the smaller of the top and bottom distances; negative when clipped.
   */
  function inset(target: Locator, { box, ring = false }: { box?: Locator; ring?: boolean } = {}) {
    return async () => {
      const container = box ? await box.elementHandle() : null
      return target.evaluate(
        (el, { container, ring }) => {
          let port = container as HTMLElement | null
          for (let p = el.parentElement; !port && p; p = p.parentElement)
            if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) port = p
          const root = getComputedStyle(document.documentElement)
          const outset = ring
            ? parseFloat(root.getPropertyValue('--focus-ring-width')) +
              parseFloat(root.getPropertyValue('--focus-ring-offset'))
            : 0
          const r = el.getBoundingClientRect()
          const top = port!.getBoundingClientRect().top + port!.clientTop
          const bottom = top + port!.clientHeight
          return Math.min(r.top - outset - top, bottom - (r.bottom + outset))
        },
        { container, ring },
      )
    }
  }

  /**
   * The block size Log out with its focus ring and the alert text need together (ring top to the text's bottom) and the
   * footer's `clientHeight`: when `needed` exceeds `available` they cannot both show and the text wins (AC2o).
   */
  const span = async (logout: Locator, text: Locator) =>
    text.evaluate(
      (el, button) => {
        const root = getComputedStyle(document.documentElement)
        const ring =
          parseFloat(root.getPropertyValue('--focus-ring-width')) +
          parseFloat(root.getPropertyValue('--focus-ring-offset'))
        let port = el.parentElement
        while (port && !/(auto|scroll)/.test(getComputedStyle(port).overflowY)) port = port.parentElement
        const needed = el.getBoundingClientRect().bottom - (button!.getBoundingClientRect().top - ring)
        return { needed, available: port!.clientHeight }
      },
      await logout.elementHandle(),
    )

  /** Laid-out points just below the popover's box that hit something inside it (content painted outside the box). */
  const paintedBelow = (dialog: Locator) =>
    dialog.evaluate((d) => {
      const popover = d.parentElement!
      const box = popover.getBoundingClientRect()
      let hits = 0
      for (let y = Math.ceil(box.bottom) + 1; y < innerHeight; y += 4)
        for (let x = box.left + 4; x < box.right - 4; x += 16) {
          const el = document.elementFromPoint(x, y)
          if (el && popover.contains(el)) hits++
        }
      return hits
    })

  async function chooseLocale(dialog: Locator, locale: Locale) {
    if (locale === 'en') await dialog.getByRole('radio', { name: 'English' }).click()
    await expect(dialog.getByRole('button', { name: FAILED[locale].logout })).toBeVisible()
  }

  for (const [width, height, locales] of [
    [800, 360, ['vi', 'en']],
    [844, 390, ['vi']],
    [915, 412, ['vi']],
  ] as const) {
    test(`AC1/AC4: student account popover at ${width}×${height}, logout answered 500: it scrolls inside itself (${locales.join(', ')})`, async ({
      browser,
      consoleGuard,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'phone-small', 'a phone held sideways: phone-small emulation')
      const credentials = await readyStudent(browser, testInfo, consoleGuard)
      const { context, page } = await freshSession(browser, credentials, consoleGuard)
      await failLogout(page)
      for (const locale of locales) {
        await page.setViewportSize({ width, height })
        await page.goto(HOME.student)
        await expect(h1(page, COPY.studentHome)).toBeVisible()
        await scrollPageToEnd(page)
        const dialog = await openAccountSection(page, 'student')
        expect(accountPlace(page, 'student')).toBe('popover')
        await chooseLocale(dialog, locale)
        const copy = FAILED[locale]
        const before = await pageScroll(page)
        const contentWidth = await dialog.evaluate((d) => d.getBoundingClientRect().width)
        const logout = dialog.getByRole('button', { name: copy.logout })
        await logout.click()
        const alert = dialog.getByRole('alert')
        const title = alert.getByText(copy.title, { exact: true })
        const text = alert.getByText(copy.text, { exact: true })
        await expect(alert).toContainText(copy.text)
        await expect(logout).toBeFocused()
        // No user action: the mount scroll brings the text into view inside the popover's box.
        await expect(text).toBeInViewport({ ratio: 0.99 })
        await expect
          .poll(inset(text, { box: popoverOf(dialog) }), { message: 'the text inside the popover' })
          .toBeGreaterThanOrEqual(0)
        await expect(logout).toBeInViewport({ ratio: 0.99 })
        await expect.poll(() => paintedBelow(dialog), { message: 'nothing paints below the popover' }).toBe(0)
        await expect
          .poll(() => dialog.evaluate((d) => d.getBoundingClientRect().width), { message: 'the content width stays' })
          .toBe(contentWidth)
        await expect.poll(() => pageScroll(page), { message: 'the page behind the popover does not move' }).toBe(before)
        await expectNoHorizontalScroll(page)
        if (width === 800) {
          // The wheel scrolls inside the popover: up to its start, then back down to the title and the text.
          const box = (await popoverOf(dialog).boundingBox())!
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
          await page.mouse.wheel(0, -600)
          await expect.poll(() => popoverOf(dialog).evaluate((p) => p.scrollTop), { message: 'wheel up' }).toBe(0)
          await page.mouse.wheel(0, 600)
          await expect(title).toBeInViewport({ ratio: 0.99 })
          await expect(text).toBeInViewport({ ratio: 0.99 })
          await expect.poll(() => pageScroll(page), { message: 'the wheel does not move the page' }).toBe(before)
          await expect(logout).toBeFocused()
        }
        await expectSettledAccessible(page)
        await expectNoMidWordBreak(title)
        await expectNoMidWordBreak(text)
        await shot(page, testInfo, `logout-failed-popover-${width}x${height}-${locale}`)
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog')).toHaveCount(0)
        await expect(h1(page, ROUTE_ERROR)).toHaveCount(0)
      }
      acceptStatus(consoleGuard, 500, '/api/v1/auth/logout')
      await context.close()
    })
  }

  test('AC2/AC4: tutor drawer at 568×320 and 740×360, logout answered 500: Log out and its focus ring stay in the footer (vi, en)', async ({
    browser,
    consoleGuard,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-small', 'a phone held sideways: phone-small emulation')
    const { context, page } = await freshSession(
      browser,
      { username: TUTOR_USERNAME, password: tutorPassword() },
      consoleGuard,
    )
    await failLogout(page)
    for (const locale of ['vi', 'en'] as const) {
      for (const [width, height] of [
        [568, 320],
        [740, 360],
      ] as const) {
        await page.setViewportSize({ width, height })
        await page.goto(HOME.tutor)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await scrollPageToEnd(page)
        const dialog = await openAccountSection(page, 'tutor')
        expect(accountPlace(page, 'tutor')).toBe('drawer')
        if (locale === 'en') await chooseLocale(dialog, 'en')
        const copy = FAILED[locale]
        const before = await pageScroll(page)
        const logout = dialog.getByRole('button', { name: copy.logout })
        await logout.click()
        const alert = dialog.getByRole('alert')
        const title = alert.getByText(copy.title, { exact: true })
        const text = alert.getByText(copy.text, { exact: true })
        await expect(alert).toContainText(copy.text)
        await expect(logout).toBeFocused()
        await expect
          .poll(inset(logout, { ring: true }), { message: 'Log out with its focus ring inside the footer' })
          .toBeGreaterThanOrEqual(0)
        await expect.poll(inset(title), { message: 'the alert title inside the footer' }).toBeGreaterThanOrEqual(0)
        await expect.poll(inset(text), { message: 'the alert text inside the footer' }).toBeGreaterThanOrEqual(0)
        await expect(text).toBeInViewport({ ratio: 0.99 })
        await expect.poll(() => pageScroll(page), { message: 'the page behind the drawer does not move' }).toBe(before)
        await expectSettledAccessible(page)
        await expectNoMidWordBreak(title)
        await expectNoMidWordBreak(text)
        await shot(page, testInfo, `logout-failed-drawer-ring-${width}x${height}-${locale}`)
        await expect(logout).toBeFocused()
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog')).toHaveCount(0)
        await expect(h1(page, ROUTE_ERROR)).toHaveCount(0)
      }
    }
    acceptStatus(consoleGuard, 500, '/api/v1/auth/logout')
    await context.close()
  })

  // AC2o (G3 QA-1, DEC-183): the offline copy is three lines. At 568×320 Log out with its ring and the alert text cannot
  // both fit in the footer, so the text wins. At 740×360 they needed 180.2 px of the footer's 179 px (DEC-183 OQ-1); the
  // drawer footer's smaller gap (T-M2.32 (c)) fits both, asserted explicitly (the branch below adapts either way).
  test('AC2o: tutor drawer at 568×320 and 740×360, logout offline: the alert text wins where both cannot fit (vi, en)', async ({
    browser,
    consoleGuard,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-small', 'a phone held sideways: phone-small emulation')
    const OFFLINE = {
      vi: 'Bạn đang ngoại tuyến và vẫn đang đăng nhập. Hãy đăng xuất lại khi có mạng.',
      en: "You're offline and still signed in. Log out again when you're back online.",
    }
    const { context, page } = await freshSession(
      browser,
      { username: TUTOR_USERNAME, password: tutorPassword() },
      consoleGuard,
    )
    for (const locale of ['vi', 'en'] as const) {
      for (const [width, height] of [
        [568, 320],
        [740, 360],
      ] as const) {
        await page.setViewportSize({ width, height })
        await page.goto(HOME.tutor)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await scrollPageToEnd(page)
        const dialog = await openAccountSection(page, 'tutor')
        expect(accountPlace(page, 'tutor')).toBe('drawer')
        if (locale === 'en') await chooseLocale(dialog, 'en')
        const copy = FAILED[locale]
        const before = await pageScroll(page)
        const logout = dialog.getByRole('button', { name: copy.logout })
        await context.setOffline(true)
        await logout.click()
        const alert = dialog.getByRole('alert')
        const title = alert.getByText(copy.title, { exact: true })
        const text = alert.getByText(OFFLINE[locale], { exact: true })
        await expect(alert).toContainText(OFFLINE[locale])
        await expect(logout).toBeFocused()
        await expect(text).toBeInViewport({ ratio: 0.99 })
        await expect.poll(inset(text), { message: 'the alert text inside the footer' }).toBeGreaterThanOrEqual(0)
        if (width === 740)
          await expect
            .poll(
              async () => {
                const { needed, available } = await span(logout, text)
                return available - needed
              },
              { message: `${width}×${height} ${locale}: Log out, its ring and the text fit the footer (T-M2.32 AC3)` },
            )
            .toBeGreaterThanOrEqual(0)
        const room = await span(logout, text)
        if (room.needed <= room.available) {
          // Both fit: AC2 holds (Log out with its ring, the title and the text inside the footer).
          await expect
            .poll(inset(logout, { ring: true }), { message: 'Log out with its focus ring inside the footer' })
            .toBeGreaterThanOrEqual(0)
          await expect.poll(inset(title), { message: 'the alert title inside the footer' }).toBeGreaterThanOrEqual(0)
        } else {
          // The text wins: only the top of Log out's ring is cut, and by no more than the shortfall (whole-pixel scroll).
          await expect
            .poll(inset(logout, { ring: true }), { message: 'Log out is cut by no more than the shortfall' })
            .toBeGreaterThanOrEqual(-Math.ceil(room.needed - room.available))
        }
        testInfo.annotations.push({
          type: 'AC2o',
          description: `${width}×${height} ${locale}: needed ${room.needed.toFixed(1)} px, footer ${room.available} px`,
        })
        await expect.poll(() => pageScroll(page), { message: 'the page behind the drawer does not move' }).toBe(before)
        await expectSettledAccessible(page)
        await expectNoMidWordBreak(text)
        await shot(page, testInfo, `logout-offline-drawer-${width}x${height}-${locale}`)
        await expect(logout).toBeFocused()
        await context.setOffline(false)
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog')).toHaveCount(0)
        await expect(h1(page, ROUTE_ERROR)).toHaveCount(0)
      }
    }
    accept(consoleGuard, (e) => /ERR_INTERNET_DISCONNECTED/.test(e))
    await context.close()
  })

  for (const role of ['tutor', 'student'] as const) {
    const where = role === 'tutor' ? 'drawer at 740×360' : 'popover at 1280×800'
    test(`AC2c: ${role} ${where}, logout answered 500: Esc keeps the shell; Log out again shows the alert again`, async ({
      browser,
      consoleGuard,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== (role === 'tutor' ? 'phone-small' : 'laptop'),
        role === 'tutor' ? 'the drawer: phone-small held sideways' : 'the popover: laptop',
      )
      const credentials =
        role === 'tutor'
          ? { username: TUTOR_USERNAME, password: tutorPassword() }
          : await readyStudent(browser, testInfo, consoleGuard)
      const { context, page } = await freshSession(browser, credentials, consoleGuard)
      await failLogout(page)
      if (role === 'tutor') await page.setViewportSize({ width: 740, height: 360 })
      await page.goto(HOME[role])
      await expect(h1(page, TITLE[role])).toBeVisible()
      expect(accountPlace(page, role)).toBe(role === 'tutor' ? 'drawer' : 'popover')

      // A failed logout, then Esc: the overlay closes, the shell stays, focus returns to the opener.
      let dialog = await openAccountSection(page, role)
      await dialog.getByRole('button', { name: COPY.logout }).click()
      await expect(dialog.getByRole('alert')).toContainText(FAILED.vi.text)
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(h1(page, ROUTE_ERROR)).toHaveCount(0)
      await expect(h1(page, TITLE[role])).toBeVisible()
      await expect(accountOpener(page, role)).toBeFocused()

      // A failed logout, then Log out again (a second 500): the alert comes back, the shell stays.
      dialog = await openAccountSection(page, role)
      const logout = dialog.getByRole('button', { name: COPY.logout })
      await logout.click()
      await expect(dialog.getByRole('alert')).toContainText(FAILED.vi.text)
      await logout.click()
      await expect(logout).not.toHaveAttribute('data-pending')
      await expect(dialog.getByRole('alert')).toContainText(FAILED.vi.text)
      await expect(h1(page, ROUTE_ERROR)).toHaveCount(0)
      await expect(h1(page, TITLE[role])).toBeVisible()
      await expect(logout).toBeFocused()
      await shot(page, testInfo, `logout-failed-again-${role}-vi`)
      acceptStatus(consoleGuard, 500, '/api/v1/auth/logout')
      await context.close()
    })
  }

  test('AC3/AC4: tutor account popover at 1280×800: no alert and with the alert (vi, en), accessible; the page stays', async ({
    browser,
    consoleGuard,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'laptop', 'the tutor popover: laptop')
    const { context, page } = await freshSession(
      browser,
      { username: TUTOR_USERNAME, password: tutorPassword() },
      consoleGuard,
    )
    await failLogout(page)
    await page.goto(HOME.tutor)
    await expect(h1(page, COPY.tutorHome)).toBeVisible()
    await scrollPageToEnd(page)
    const dialog = await openAccountSection(page, 'tutor')
    expect(accountPlace(page, 'tutor')).toBe('popover')
    const before = await pageScroll(page)
    // No alert, vi then en: the narrower content box (the gutter) still breaks no word.
    for (const locale of ['vi', 'en'] as const) {
      await chooseLocale(dialog, locale)
      await expectSettledAccessible(page)
      await expectNoMidWordBreak(dialog.locator('p').first())
      for (const button of await dialog.getByRole('button').all()) await expectNoMidWordBreak(button)
      await shot(page, testInfo, `account-popover-1280x800-${locale}`)
    }
    // With the alert (Log out in en), then re-rendered in vi by the switcher (the alert stays while the error holds).
    const logout = dialog.getByRole('button', { name: FAILED.en.logout })
    await logout.click()
    const alert = dialog.getByRole('alert')
    await expect(alert).toContainText(FAILED.en.text)
    await expect(alert).toBeInViewport({ ratio: 0.99 })
    await expect(logout).toBeFocused()
    await expect.poll(() => popoverOf(dialog).evaluate((p) => p.scrollTop), { message: 'no scroll inside' }).toBe(0)
    await expect.poll(() => pageScroll(page), { message: 'the page behind the popover does not move' }).toBe(before)
    for (const locale of ['en', 'vi'] as const) {
      if (locale === 'vi') await dialog.getByRole('radio', { name: 'Tiếng Việt' }).click()
      const copy = FAILED[locale]
      await expect(alert).toContainText(copy.text)
      await expectSettledAccessible(page)
      await expectNoMidWordBreak(alert.getByText(copy.title, { exact: true }))
      await expectNoMidWordBreak(alert.getByText(copy.text, { exact: true }))
      await shot(page, testInfo, `logout-failed-popover-1280x800-${locale}`)
    }
    acceptStatus(consoleGuard, 500, '/api/v1/auth/logout')
    await context.close()
  })
})
