import { readFileSync } from 'node:fs'
import { test as rawTest, type Page } from '@playwright/test'
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

/** The shells' account section holds their switcher (T-M2.11); the public pages show it in their toolbar row. */
async function revealSwitcher(page: Page, target: (typeof PAGES)[number]) {
  if ('shell' in target) await openAccountSection(page, target.shell)
}

for (const target of PAGES) {
  test.describe(() => {
    test.use({ storageState: target.state })
    test(`${target.name} renders in vi and en`, async ({ page }, testInfo) => {
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
    test.use({ storageState: deepLink.state })
    test(`a deep link survives a reload: ${deepLink.path} (same-origin SPA fallback)`, async ({ page }) => {
      const response = await page.goto(deepLink.path)
      expect(response?.status()).toBe(200)
      await fontsSettled(page, deepLink.heading)
      await page.reload()
      await expect(page.getByRole('heading', { level: 1, name: deepLink.heading })).toBeVisible()
    })
  })
}

// ===== T-M2.28 DIAGNOSTIC (temporary: removed before the final head; not a test of the product) =====
// (b) on webkit-smoke: b1 what injects the inline <style>; b2 the stored cookies as they are; b3 the same cookies without Secure.
// (c) on firefox-smoke: the old form (no wait before the reload) x20 and the new form (fontsSettled) x20, under the console guard.
const DIAG = (line: string) => console.log(`T-M2.28-DIAG ${line}`)
rawTest.describe('T-M2.28 diag (b) webkit', () => {
  rawTest('diag b1: the inline style after a screenshot of a rendered page', async ({ browser, browserName }, testInfo) => {
    rawTest.skip(browserName !== 'webkit', 'webkit only')
    const context = await browser.newContext({ storageState: ANONYMOUS, baseURL: testInfo.project.use.baseURL })
    const page = await context.newPage()
    const seen: string[] = []
    page.on('console', (m) => seen.push(`${m.type()}: ${m.text()}`))
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) =>
        console.error(`CSP violation: ${e.violatedDirective} blocked ${e.blockedURI || 'inline'} sample=${e.sample}`),
      )
      new MutationObserver((records) => {
        for (const r of records)
          for (const n of Array.from(r.addedNodes))
            if (n.nodeName === 'STYLE') console.log(`style added to <${r.target.nodeName}>: ${n.textContent}`)
      }).observe(document, { childList: true, subtree: true })
    })
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded')
    DIAG(`b1 before the screenshot: ${JSON.stringify(seen)}`)
    const before = seen.length
    await page.screenshot({ path: testInfo.outputPath('b1.png') })
    await expect.poll(() => seen.length, { timeout: 3000 }).toBeGreaterThan(before).catch(() => {})
    DIAG(`b1 after the screenshot: ${JSON.stringify(seen.slice(before))}`)
    await context.close()
  })
  for (const [name, state, path] of [
    ['tutor', TUTOR_STATE, '/tutor'],
    ['student', STUDENT_STATE, '/student/home'],
  ] as const) {
    for (const insecure of [false, true]) {
      rawTest(`diag ${insecure ? 'b3' : 'b2'} ${name}: cookies ${insecure ? 'without Secure' : 'as stored'}`, async ({ browser, browserName }, testInfo) => {
        rawTest.skip(browserName !== 'webkit', 'webkit only')
        const stored = JSON.parse(readFileSync(state, 'utf8')) as { cookies: Array<Record<string, unknown>>; origins: unknown[] }
        if (insecure) stored.cookies = stored.cookies.map((c) => ({ ...c, secure: false }))
        DIAG(`${name} ${insecure ? 'b3' : 'b2'} state cookies: ${JSON.stringify(stored.cookies.map((c) => ({ name: c.name, domain: c.domain, secure: c.secure, sameSite: c.sameSite })))}`)
        const context = await browser.newContext({ storageState: stored as never, baseURL: testInfo.project.use.baseURL })
        DIAG(`${name} context cookies: ${JSON.stringify((await context.cookies()).map((c) => ({ name: c.name, secure: c.secure })))}`)
        const page = await context.newPage()
        const session = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/v1/auth/session')
        await page.goto(path)
        const r = await session
        const sent = ((await r.request().allHeaders()).cookie ?? '').split(';').map((c) => (c.split('=')[0] ?? '').trim()).filter(Boolean)
        DIAG(`${name} /auth/session: ${r.status()}; cookies sent: ${JSON.stringify(sent)}`)
        await page.getByRole('heading', { level: 1 }).first().waitFor().catch(() => {})
        DIAG(`${name} url: ${new URL(page.url()).pathname}${new URL(page.url()).search}; h1: ${JSON.stringify(await page.getByRole('heading', { level: 1 }).allTextContents())}`)
        await context.close()
      })
    }
  }
})
for (const form of ['old', 'new'] as const) {
  for (let i = 1; i <= 20; i++) {
    for (const deepLink of [
      { path: '/tutor', heading: 'Hôm nay', state: TUTOR_STATE },
      { path: '/student/home', heading: 'Trang chủ', state: STUDENT_STATE },
    ]) {
      test.describe(() => {
        test.use({ storageState: deepLink.state })
        test(`diag c ${form} form ${i}: ${deepLink.path}`, async ({ page, browserName }) => {
          test.skip(browserName !== 'firefox', 'firefox only')
          const response = await page.goto(deepLink.path)
          expect(response?.status()).toBe(200)
          if (form === 'new') await fontsSettled(page, deepLink.heading)
          await page.reload()
          await expect(page.getByRole('heading', { level: 1, name: deepLink.heading })).toBeVisible()
        })
      })
    }
  }
}
