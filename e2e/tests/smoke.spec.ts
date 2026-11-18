import { readFileSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import type { BrowserContextOptions, Page } from '@playwright/test'
import { VIEWPORTS } from '../playwright.config'
import { ANONYMOUS, STUDENT_STATE, TUTOR_STATE } from '../support/auth'
import { expectNoAxeViolations, expectNoHorizontalScroll } from '../support/checks'
import { evidenceShot } from '../support/evidence'
import { expect, test } from '../support/fixtures'
import { openAccountSection } from '../support/shell'

// T-M1.6 smoke: the packaged app serves every shell page same-origin, in vi (default) and en, accessibly, without
// horizontal scroll and without console/CSP errors (the console guard is automatic).
// T-M2.4: the landing page is gone; its case is the sign-in page (the anonymous start page). The shells run signed in
// (the stored E2E tutor and student sessions).
// T-M2.11 (DEC-112 (5), scope 11 (c)): on the shells the language radios are in the account section (popover, drawer or
// More sheet by viewport), opened first; the assertions after it opens are unchanged. /student/x is the student shell's
// 404 now (AC1), so the deep link uses /student/home.
const PAGES = [
  { name: 'login', path: '/login', vi: 'Đăng nhập', en: 'Sign in', switcher: true, state: ANONYMOUS },
  {
    name: 'tutor',
    path: '/tutor',
    vi: 'Hôm nay',
    en: 'Today',
    switcher: true,
    state: TUTOR_STATE,
    shell: 'tutor',
  },
  {
    name: 'student',
    path: '/student',
    vi: 'Trang chủ',
    en: 'Home',
    switcher: true,
    state: STUDENT_STATE,
    shell: 'student',
  },
  // The not-found page has no language switcher: English comes from the stored choice (englms.locale).
  {
    name: 'not-found',
    path: '/does-not-exist',
    vi: 'Không tìm thấy trang',
    en: 'Page not found',
    switcher: false,
    state: ANONYMOUS,
  },
] as const

/**
 * T-M2.28 (c): Firefox logs a font download that a reload aborts (NS_BINDING_ABORTED) as a console error. The shell renders
 * only after /auth/session and fonts are requested once text that uses them renders, so wait for the h1, then until no font
 * load is in flight (`document.fonts.ready` alone can resolve before any font request has started).
 */
async function fontsSettled(page: Page, heading: string) {
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded')
}

type StoredState = Exclude<BrowserContextOptions['storageState'], string | undefined>
/**
 * T-M2.28 (b), DEC-174: WebKit neither sends nor keeps a Secure cookie on http://localhost (development-setup "Cookies on
 * http://localhost"), so on WebKit a stored session is loaded with its cookies marked not Secure, on the client side only.
 * The server still sets them Secure (NFR-SEC-04); Chromium and Firefox use the stored state as it is.
 */
function stateFor(state: string | StoredState, browserName: string): string | StoredState {
  if (browserName !== 'webkit' || typeof state !== 'string') return state
  const stored = JSON.parse(readFileSync(state, 'utf8')) as StoredState
  return { ...stored, cookies: stored.cookies.map((cookie) => ({ ...cookie, secure: false })) }
}

/** The shells' account section holds their switcher (T-M2.11); the public pages show it in their toolbar row. */
async function revealSwitcher(page: Page, target: (typeof PAGES)[number]) {
  if ('shell' in target) await openAccountSection(page, target.shell)
}

// TEMP T-M2.30 (c): Firefox-only diagnostic variants of the login flow (x20 each) and an x20 repeat of the login test; removed before the final head.
async function tempAxe(page: Page, legacy: boolean) {
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
  if (legacy) builder.setLegacyMode(true)
  const results = await builder.analyze()
  expect(results.violations.map((v) => v.id)).toEqual([])
}
type TempVariant = { first: boolean; switchLang: boolean; fonts: boolean; legacy: boolean; enFirst?: boolean }
async function tempLogin(page: Page, v: TempVariant) {
  if (v.enFirst) await page.addInitScript(() => localStorage.setItem('englms.locale', 'en'))
  await page.goto('/login')
  await expect(page.getByRole('heading', { level: 1, name: v.enFirst ? 'Sign in' : 'Đăng nhập' })).toBeVisible()
  if (v.first) await tempAxe(page, v.legacy)
  if (v.switchLang) {
    await page.getByRole('radiogroup', { name: 'Ngôn ngữ' }).getByRole('radio', { name: 'English' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
  }
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: v.switchLang || v.enFirst ? 'Sign in' : 'Đăng nhập' })).toBeVisible()
  if (v.fonts) await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded')
  await tempAxe(page, v.legacy)
}
const TEMP_VARIANTS: Record<string, TempVariant> = {
  flow: { first: true, switchLang: true, fonts: false, legacy: false },
  fonts: { first: true, switchLang: true, fonts: true, legacy: false },
  legacy: { first: true, switchLang: true, fonts: false, legacy: true },
  'no-switch': { first: true, switchLang: false, fonts: false, legacy: false },
  'en-first-one-axe': { first: false, switchLang: false, fonts: false, legacy: false, enFirst: true },
}
for (let i = 1; i <= 20; i++) {
  for (const [name, v] of Object.entries(TEMP_VARIANTS)) {
    test(`TEMP T-M2.30 variant ${name} #${i}`, async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'TEMP T-M2.30: Firefox only')
      await tempLogin(page, v)
    })
  }
  test(`TEMP T-M2.30 variant jit-off #${i}`, async ({ playwright, browserName, baseURL }) => {
    test.skip(browserName !== 'firefox', 'TEMP T-M2.30: Firefox only')
    const browser = await playwright.firefox.launch({
      firefoxUserPrefs: { 'javascript.options.baselinejit': false, 'javascript.options.ion': false, 'javascript.options.wasm': false },
    })
    try {
      const context = await browser.newContext({ baseURL, viewport: VIEWPORTS.laptop })
      await tempLogin(await context.newPage(), TEMP_VARIANTS.flow!)
    } finally {
      await browser.close()
    }
  })
}
const TEMP_REPEATS = Array.from({ length: 20 }, (_, i) => ({ ...PAGES[0], repeat: i + 1 }))
for (const target of [...PAGES, ...TEMP_REPEATS]) {
  test.describe(() => {
    test.use({ storageState: async ({ browserName }, use) => use(stateFor(target.state, browserName)) })
    test(`${target.name} renders in vi and en${'repeat' in target ? ` (TEMP repeat ${target.repeat})` : ''}`, async ({ page, browserName }, testInfo) => {
      test.skip('repeat' in target && browserName !== 'firefox', 'TEMP T-M2.30: Firefox only')
      await page.goto(target.path)
      await expect(page.getByRole('heading', { level: 1, name: target.vi })).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
      await expectNoAxeViolations(page)
      await expectNoHorizontalScroll(page)
      await evidenceShot(page, testInfo, `${target.name}-vi`)

      if (target.switcher) {
        await revealSwitcher(page, target)
        // The language switcher is a SegmentedControl: a radiogroup of radio segments with aria-checked (T-M1.9 AC3).
        const switcher = page.getByRole('radiogroup', { name: 'Ngôn ngữ' })
        await expect(switcher.getByRole('radio', { name: 'Tiếng Việt' })).toBeChecked()
        await expect(switcher.getByRole('radio', { name: 'English' })).not.toBeChecked()
        await switcher.getByRole('radio', { name: 'English' }).click()
        // The account section is modal: close it to read the page behind it (it stays open on a language change).
        if ('shell' in target) await page.keyboard.press('Escape')
      } else {
        await page.evaluate(() => localStorage.setItem('englms.locale', 'en'))
        await page.reload()
      }
      await expect(page.getByRole('heading', { level: 1, name: target.en })).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      if (target.switcher) {
        await revealSwitcher(page, target)
        const switcher = page.getByRole('radiogroup', { name: 'Language' })
        await expect(switcher.getByRole('radio', { name: 'English' })).toBeChecked()
        await expect(switcher.getByRole('radio', { name: 'Tiếng Việt' })).not.toBeChecked()
        await expect(switcher.getByRole('radio', { name: 'English' })).toHaveAttribute('lang', 'en')
        // The choice survives a reload (localStorage, T-M1.3 AC5).
        await page.reload()
        await expect(page.getByRole('heading', { level: 1, name: target.en })).toBeVisible()
        await revealSwitcher(page, target)
        await expect(
          page.getByRole('radiogroup', { name: 'Language' }).getByRole('radio', { name: 'English' }),
        ).toBeChecked()
      }
      await expectNoAxeViolations(page)
      await expectNoHorizontalScroll(page)
      await evidenceShot(page, testInfo, `${target.name}-en`)
    })
  })
}

for (const deepLink of [
  { path: '/tutor', heading: 'Hôm nay', state: TUTOR_STATE },
  {
    path: '/student/home',
    heading: 'Trang chủ',
    state: STUDENT_STATE,
  },
]) {
  test.describe(() => {
    test.use({ storageState: async ({ browserName }, use) => use(stateFor(deepLink.state, browserName)) })
    test(`a deep link survives a reload: ${deepLink.path} (same-origin SPA fallback)`, async ({ page }) => {
      const response = await page.goto(deepLink.path)
      expect(response?.status()).toBe(200)
      await fontsSettled(page, deepLink.heading)
      await page.reload()
      await expect(page.getByRole('heading', { level: 1, name: deepLink.heading })).toBeVisible()
    })
  })
}
