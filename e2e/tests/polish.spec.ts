import type { Locator, Page } from '@playwright/test'
import { ANONYMOUS, TUTOR_STATE } from '../support/auth'
import { expectNoAxeViolations, expectNoHorizontalScroll } from '../support/checks'
import { evidenceRecord, evidenceShot } from '../support/evidence'
import { expect, test } from '../support/fixtures'
import { StepCounter } from '../support/steps'

// T-M1.13 (web polish): stable SegmentedControl widths (AC2), the landing loading skeleton (AC3) and the route error
// page's way back to the start page (AC4), at the mandatory viewports.
// T-M2.4: no landing page. The anonymous start page is /login (AC2, AC3); a signed-in tutor's start page is `/` →
// /tutor/today, and AC4's failed client navigation is the shell header's link to the password page.

const COPY = {
  vi: {
    login: 'Đăng nhập',
    tutor: 'Không gian gia sư',
    toChangePassword: 'Đổi mật khẩu',
    language: 'Ngôn ngữ',
    loading: 'Đang tải trang',
    errorTitle: 'Không hiển thị được trang này',
    reload: 'Tải lại trang',
    home: 'Về trang đầu',
    devView: 'Chế độ xem',
    devOptions: ['Danh sách', 'Tuần', 'Tháng'],
  },
  en: {
    login: 'Sign in',
    tutor: 'Tutor workspace',
    toChangePassword: 'Change password',
    language: 'Language',
    loading: 'Loading the page',
    errorTitle: "This page couldn't be displayed",
    reload: 'Reload page',
    home: 'Go to the start page',
    devView: 'View',
    devOptions: ['List', 'Week', 'Month'],
  },
} as const
type Lang = keyof typeof COPY
const ENDONYM = { vi: 'Tiếng Việt', en: 'English' } as const

const CHANGE_PASSWORD_CHUNK = /\/assets\/ChangePasswordPage-[^/]+\.js$/
const LOGIN_CHUNK = /\/assets\/LoginPage-[^/]+\.js$/
// Chromium's console message for a request the test aborts on purpose (AC4 reaches the error page this way).
// The guard appends the request's URL to a failed-resource entry (T-M2.4 G3 QA F2).
const ABORTED_REQUEST = /^console\.error: Failed to load resource: net::ERR_FAILED( \[[^\]]+\])?$/

const h1 = (page: Page, name: string) => page.getByRole('heading', { level: 1, name })
const round = (n: number) => Math.round(n * 100) / 100

async function useLanguage(page: Page, lang: Lang) {
  await page.addInitScript((l) => localStorage.setItem('englms.locale', l), lang)
}

/** Removes the expected console entries of an aborted chunk request from the guard; any other entry still fails the test. */
function acceptAbortedRequests(consoleGuard: string[]) {
  const before = consoleGuard.length
  for (let i = consoleGuard.length - 1; i >= 0; i--)
    if (ABORTED_REQUEST.test(consoleGuard[i]!)) consoleGuard.splice(i, 1)
  return before - consoleGuard.length
}

// ---- AC2: segment boundaries do not move when the selection changes ------------------------------------------------

interface SegmentBox {
  name: string
  x: number
  width: number
  checked: boolean
  iconVisible: boolean
}

/** The accessible name, as assistive technology gets it (`textContent` would double the label: SegmentedControl keeps a
 *  hidden semibold copy of it). Read from the ARIA snapshot line `- radio "<name>"`. */
async function accessibleName(element: Locator) {
  const name = /^- \w+ "(.*)"/.exec(await element.ariaSnapshot())?.[1]
  expect(name, 'element has an accessible name').toBeTruthy()
  return name!
}

async function segmentBoxes(group: Locator): Promise<SegmentBox[]> {
  const result: SegmentBox[] = []
  for (const radio of await group.getByRole('radio').all()) {
    const box = await radio.boundingBox()
    expect(box, 'segment has a layout box').not.toBeNull()
    result.push({
      name: await accessibleName(radio),
      x: round(box!.x),
      width: round(box!.width),
      checked: (await radio.getAttribute('aria-checked')) === 'true',
      iconVisible: await radio.locator('svg[aria-hidden="true"]').isVisible(),
    })
  }
  return result
}

/** Each segment's inline start and size are identical (±1 px); the check icon is visible only on the checked segment. */
function expectStable(before: SegmentBox[], after: SegmentBox[]) {
  expect(after).toHaveLength(before.length)
  before.forEach((b, i) => {
    expect(Math.abs(after[i]!.x - b.x), `inline start of segment ${i}`).toBeLessThanOrEqual(1)
    expect(Math.abs(after[i]!.width - b.width), `inline size of segment ${i}`).toBeLessThanOrEqual(1)
  })
  for (const s of [...before, ...after])
    expect(s.iconVisible, `check icon visible = checked (${s.name})`).toBe(s.checked)
}

for (const path of ['/login', '/tutor']) {
  test.describe(() => {
    test.use({ storageState: path === '/tutor' ? TUTOR_STATE : ANONYMOUS })
    test(`AC2: the language switcher keeps its segment boundaries when the selection changes (pointer and keyboard) on ${path}`, async ({
      page,
    }, testInfo) => {
      const slug = path === '/login' ? 'login' : 'tutor'
      await page.goto(path)
      const group = () => page.getByRole('radiogroup', { name: /^(Ngôn ngữ|Language)$/ })
      await expect(group().getByRole('radio', { name: ENDONYM.vi })).toBeChecked()
      await page.evaluate(() => document.fonts.ready)
      const vi = await segmentBoxes(group())
      await evidenceShot(page, testInfo, `ac2-switcher-${slug}-vi`)

      await group().getByRole('radio', { name: ENDONYM.en }).click()
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      await expect(group().getByRole('radio', { name: ENDONYM.en })).toBeChecked()
      const en = await segmentBoxes(group())
      expectStable(vi, en)
      await expectNoHorizontalScroll(page)
      await evidenceShot(page, testInfo, `ac2-switcher-${slug}-en`)

      // Keyboard back to vi: focus is on "English"; ArrowLeft, Space.
      await page.keyboard.press('ArrowLeft')
      await expect(group().getByRole('radio', { name: ENDONYM.vi })).toBeFocused()
      await page.keyboard.press('Space')
      await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
      const viAgain = await segmentBoxes(group())
      expectStable(en, viAgain)
      expectStable(vi, viAgain)

      await evidenceRecord(testInfo, `ac2-switcher-widths-${slug}`, {
        viewport: page.viewportSize(),
        tolerancePx: 1,
        selectedVi: vi,
        selectedEnPointer: en,
        selectedViKeyboard: viAgain,
      })
    })
  })
}

// The 3-option /dev/ui example exists only in the development build (`pnpm dev`); the packaged app has no /dev/ui.
const DEV_SERVER = /:5173\/?$/.test(process.env.E2E_BASE_URL ?? '')

for (const lang of ['vi', 'en'] as const) {
  test(`AC2 (/dev/ui, dev build) [${lang}]: the 3-option example keeps its segment boundaries`, async ({
    page,
  }, testInfo) => {
    test.skip(
      !DEV_SERVER,
      'needs the dev server: E2E_BASE_URL=http://localhost:5173 (no /dev/ui in the packaged build)',
    )
    const c = COPY[lang]
    await useLanguage(page, lang)
    await page.goto('/dev/ui')
    const group = page.getByRole('radiogroup', { name: c.devView, exact: true })
    await expect(group.getByRole('radio', { name: c.devOptions[0] })).toBeChecked()
    await page.evaluate(() => document.fonts.ready)
    const initial = await segmentBoxes(group)
    const record: Record<string, SegmentBox[]> = { [c.devOptions[0]]: initial }
    for (const option of [c.devOptions[1], c.devOptions[2], c.devOptions[0]]) {
      await group.getByRole('radio', { name: option }).click()
      await expect(group.getByRole('radio', { name: option })).toBeChecked()
      const after = await segmentBoxes(group)
      record[`${option} (after)`] = after
      expectStable(initial, after)
      if (option === c.devOptions[2]) {
        await group.scrollIntoViewIfNeeded()
        await evidenceShot(page, testInfo, `ac2-devui-segmented-${lang}`)
      }
    }
    await expectNoHorizontalScroll(page)
    await evidenceRecord(testInfo, `ac2-devui-widths-${lang}`, {
      viewport: page.viewportSize(),
      tolerancePx: 1,
      boxes: record,
    })
  })
}

// T-M1.16 AC2: the gallery's LanguageSwitcher example sizes to its content, so a language change (which changes the
// column width) moves no segment boundary inside it; the whole example may move.
test("T-M1.16 AC2 (/dev/ui, dev build): a UI language change keeps the LanguageSwitcher example's segments", async ({
  page,
}, testInfo) => {
  test.skip(!DEV_SERVER, 'needs the dev server: E2E_BASE_URL=http://localhost:5173 (no /dev/ui in the packaged build)')
  await useLanguage(page, 'vi')
  await page.goto('/dev/ui')
  // The page header has a switcher too; the gallery example is the last one.
  const example = page.getByRole('radiogroup', { name: /^(Ngôn ngữ|Language)$/ }).last()
  const measure = async () => {
    await page.evaluate(() => document.fonts.ready)
    const group = (await example.boundingBox())!
    return (await segmentBoxes(example)).map((s) => ({ name: s.name, offsetPx: round(s.x - group.x), width: s.width }))
  }
  await expect(example.getByRole('radio', { name: ENDONYM.vi })).toBeChecked()
  const vi = await measure()
  await example.getByRole('radio', { name: ENDONYM.en }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(example.getByRole('radio', { name: ENDONYM.en })).toBeChecked()
  const en = await measure()
  await example.scrollIntoViewIfNeeded()
  await evidenceShot(page, testInfo, 't-m1.16-ac2-devui-switcher-en')
  await example.getByRole('radio', { name: ENDONYM.vi }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
  const viAgain = await measure()
  await evidenceRecord(testInfo, 't-m1.16-ac2-devui-switcher', {
    viewport: page.viewportSize(),
    tolerancePx: 1,
    vi,
    en,
    viAgain,
  })
  for (const after of [en, viAgain]) {
    expect(after).toHaveLength(vi.length)
    vi.forEach((b, i) => {
      expect(Math.abs(after[i]!.width - b.width), `inline size of segment ${i}`).toBeLessThanOrEqual(1)
      expect(
        Math.abs(after[i]!.offsetPx - b.offsetPx),
        `offset of segment ${i} from the group start`,
      ).toBeLessThanOrEqual(1)
    })
  }
  await expectNoHorizontalScroll(page)
})

// ---- AC3: the start page's loading skeleton matches the page (the sign-in page since T-M2.4) ------------------------------------------------------------

/** Sum of all layout-shift entries without recent input (an upper bound of CLS), as in loading.spec.ts. */
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

for (const lang of ['vi', 'en'] as const) {
  test(`AC3 [${lang}]: on a slowed first load of /login, the heading appears where its skeleton line was; CLS ≤ 0.05`, async ({
    page,
  }, testInfo) => {
    const c = COPY[lang]
    await useLanguage(page, lang)
    let release: () => void = () => {}
    const released = new Promise<void>((resolve) => (release = resolve))
    await page.route(LOGIN_CHUNK, async (route) => {
      await released
      await route.continue()
    })
    await page.goto('/login', { waitUntil: 'commit' })
    const region = page.getByRole('status', { name: c.loading })
    await expect(region.locator('[data-shown]')).toHaveCount(1)
    const toolbar = region.getByTestId('route-loading-toolbar')
    await expect(toolbar).toHaveCount(1)
    const titleLine = region.getByTestId('route-loading-title').getByTestId('skeleton')
    await expect(titleLine).toBeVisible()
    const skeleton = {
      titleLine: await titleLine.boundingBox(),
      toolbarRow: await toolbar.boundingBox(),
      switcher: await toolbar.getByTestId('skeleton').boundingBox(),
    }
    await evidenceShot(page, testInfo, `ac3-login-loading-${lang}`)
    release()

    const heading = h1(page, c.login)
    await expect(heading).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const page_ = {
      heading: await heading.boundingBox(),
      switcher: await page.getByRole('radiogroup', { name: c.language }).boundingBox(),
    }
    const cls = await layoutShiftTotal(page)
    const headingDelta = round(Math.abs(page_.heading!.y - skeleton.titleLine!.y))
    await evidenceRecord(testInfo, `ac3-login-skeleton-${lang}`, {
      viewport: page.viewportSize(),
      skeleton,
      page: page_,
      headingBlockStartDeltaPx: headingDelta,
      headingLimitPx: 8,
      switcherBlockStartDeltaPx: round(Math.abs(page_.switcher!.y - skeleton.switcher!.y)),
      layoutShift: cls,
      clsLimit: 0.05,
    })
    expect(headingDelta, 'heading block start vs its skeleton line').toBeLessThanOrEqual(8)
    expect(cls.total, 'layout shift total of the first load').toBeLessThanOrEqual(0.05)
  })
}

// ---- AC4: the route error page offers a way back to the start page -------------------------------------------------

for (const lang of ['vi', 'en'] as const) {
  const c = COPY[lang]

  test.describe(() => {
    test.use({ storageState: TUTOR_STATE })
    test(`AC4 [${lang}]: a failed lazy load on a client navigation → error page → "go to the start page" (1 step)`, async ({
      page,
      consoleGuard,
    }, testInfo) => {
      await useLanguage(page, lang)
      await page.goto('/')
      await expect(h1(page, c.tutor)).toBeVisible()
      await page.route(CHANGE_PASSWORD_CHUNK, (route) => route.abort())
      await page.getByRole('link', { name: c.toChangePassword }).click()
      // The pathless-child boundary inside the root layout: route focus moves to the error page's h1 (T-M1.9).
      await expect(h1(page, c.errorTitle)).toBeFocused()
      expect(acceptAbortedRequests(consoleGuard), 'the aborted chunk request was logged').toBeGreaterThan(0)

      const reload = page.getByRole('button', { name: c.reload })
      const home = page.getByRole('link', { name: c.home })
      await expect(reload).toBeVisible()
      await expect(home).toBeVisible()
      await expect(home).toHaveAttribute('href', '/')
      const homeBox = await home.boundingBox()
      expect(homeBox!.height, 'start-page link block size').toBeGreaterThanOrEqual(44)
      await expectNoAxeViolations(page)
      await expectNoHorizontalScroll(page)
      await evidenceShot(page, testInfo, `ac4-error-page-${lang}`)

      // Reach main content: 0 steps (focus is already on the h1 inside main; the next Tab stop is the reload button).
      await page.keyboard.press('Tab')
      await expect(reload).toBeFocused()
      expect(await page.evaluate(() => !!document.activeElement?.closest('main'))).toBe(true)

      const pointer = new StepCounter()
      await pointer.step('activate "go to the start page"', () => home.click())
      await expect(h1(page, c.tutor)).toBeFocused()
      await expect(page).toHaveURL(/\/tutor\/today$/)
      await expect(page).toHaveTitle(`${c.tutor} · Eng-LMS`)
      pointer.expectAtMost(1)

      // Keyboard: the same failure again, then Tab to the link and Enter (one step).
      await page.getByRole('link', { name: c.toChangePassword }).click()
      await expect(h1(page, c.errorTitle)).toBeFocused()
      acceptAbortedRequests(consoleGuard)
      const keyboard = new StepCounter()
      await keyboard.step('Tab to "go to the start page", Enter', async () => {
        for (let i = 0; i < 3 && !(await home.evaluate((el) => el === document.activeElement)); i++)
          await page.keyboard.press('Tab')
        await expect(home).toBeFocused()
        await page.keyboard.press('Enter')
      })
      await expect(h1(page, c.tutor)).toBeFocused()
      keyboard.expectAtMost(1)

      await evidenceRecord(testInfo, `ac4-error-page-${lang}`, {
        viewport: page.viewportSize(),
        homeLinkBox: homeBox,
        minimumTargetPx: 44,
        steps: {
          reachMainAfterFailedNavigation: 0,
          leaveForStartPagePointer: pointer.count,
          leaveForStartPageKeyboard: keyboard.count,
        },
        budgets: { reachMain: 0, leaveForStartPage: 1 },
      })
    })
  })

  // T-M2.4: `/` has no page module any more; what can fail there is the session bootstrap it needs first.
  test(`AC4 [${lang}]: no start-page link when the failed route is / itself`, async ({ page, consoleGuard }) => {
    await useLanguage(page, lang)
    await page.route('**/api/v1/auth/session', (route) => route.abort())
    await page.goto('/')
    await expect(h1(page, c.errorTitle)).toBeVisible()
    expect(acceptAbortedRequests(consoleGuard), 'the aborted chunk request was logged').toBeGreaterThan(0)
    await expect(page.getByRole('button', { name: c.reload })).toBeVisible()
    await expect(page.getByRole('link')).toHaveCount(0)
    await expectNoAxeViolations(page)
  })
}
