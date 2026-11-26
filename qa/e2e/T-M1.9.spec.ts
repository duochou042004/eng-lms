import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { STATE } from '../support/global-setup'

// Independent black-box QA for T-M1.9 (web a11y/UX follow-ups). Written from the packet ACs only.
// Run: QA_BASE_URL=http://localhost:8080 pnpm test e2e/T-M1.9.spec.ts --project=phone-small --project=tablet --project=laptop
const SHOTS = process.env.QA_SHOTS_DIR ?? 'qa-shots'
const SUFFIX = ' · Eng-LMS'
const LOCALES = ['vi', 'en'] as const
type Locale = (typeof LOCALES)[number]
// Since T-M2.4: no anonymous landing page (`/` redirects; anonymous → /login), the shells need a session of their role and
// the shell's language switcher sits in the account section (D3 of T-M2.7). Sessions: support/global-setup.ts.
type Who = 'anonymous' | 'tutor' | 'student'
const WHO = ['anonymous', 'tutor', 'student'] as const
const AS: Record<Who, string | { cookies: []; origins: [] }> = { anonymous: { cookies: [], origins: [] }, ...STATE }
const ROUTES: Record<Who, readonly string[]> = { anonymous: ['/login', '/qa-no-such-page'], tutor: ['/tutor'], student: ['/student'] }
const SHELL = (r: string) => r.startsWith('/tutor') || r.startsWith('/student')
// A public page with the switcher in its toolbar, for every caller (a signed-in /login would log out first).
const SWITCHER_PAGE: Record<Who, string> = { anonymous: '/login', tutor: '/forbidden', student: '/forbidden' }

const secretHits: string[] = []
const consoleErrors: string[] = []
test.beforeEach(async ({ page }) => {
  page.on('response', async (res) => {
    try {
      const body = await res.text()
      if (body.includes('SECRET-')) secretHits.push(res.url())
    } catch {
      /* redirects, aborted */
    }
  })
  page.on('console', (m) => {
    // An anonymous visit answers GET /auth/session with 401 by design (T-M2.4): the only status error accepted.
    if (m.type() === 'error' && !(/status of 401/.test(m.text()) && m.location().url.endsWith('/api/v1/auth/session')))
      consoleErrors.push(`${page.url()} ${m.text()}`)
  })
  page.on('pageerror', (e) => consoleErrors.push(`${page.url()} pageerror ${e.message}`))
})
test.afterEach(async ({ page }) => {
  await page.waitForTimeout(400) // late errors
  expect(secretHits, 'SECRET-* marker in a response').toEqual([])
  expect(consoleErrors, 'console errors').toEqual([])
  consoleErrors.length = 0
})

async function setLocale(page: Page, locale: Locale, who: Who = 'anonymous') {
  await page.goto(SWITCHER_PAGE[who])
  const target = locale === 'vi' ? 'Tiếng Việt' : 'English'
  const radio = page.getByRole('radio', { name: target })
  if ((await radio.getAttribute('aria-checked')) !== 'true') await radio.click()
  await expect(page.locator('html')).toHaveAttribute('lang', locale)
}
const active = (page: Page) =>
  page.evaluate(() => {
    const a = document.activeElement as HTMLElement
    return { tag: a.tagName, text: (a.textContent ?? '').trim().slice(0, 60), role: a.getAttribute('role'), href: a.getAttribute('href') }
  })
async function expectH1Focused(page: Page) {
  const h1 = page.locator('main h1')
  await expect(h1).toBeFocused()
  const text = (await h1.textContent())!.trim()
  await expect(page).toHaveTitle(text + SUFFIX)
  return text
}
const shot = async (page: Page, name: string) => {
  const dir = path.join(SHOTS, test.info().project.name)
  fs.mkdirSync(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true })
}

// The shell's switcher is in the account section (menu popover, More sheet or drawer, by viewport).
async function openAccountSection(page: Page) {
  await page.locator('button[aria-haspopup="dialog"]').first().click()
  const section = page.getByRole('dialog').last()
  await expect(section.getByRole('radiogroup')).toBeVisible()
  return section
}

for (const who of WHO) {
  test.describe(who, () => {
    test.use({ storageState: AS[who] })
    for (const locale of LOCALES) {
      test(`[${locale}] AC1 first load: focus stays on body, title set, first Tab stop`, async ({ page }) => {
        await setLocale(page, locale, who)
        const titles = new Set<string>()
        for (const r of ROUTES[who]) {
          await page.goto(r)
          await page.waitForLoadState('networkidle')
          const h1 = (await page.locator('main h1').textContent())!.trim()
          await expect(page).toHaveTitle(h1 + SUFFIX)
          titles.add(await page.title())
          expect((await active(page)).tag, `${r} active on first load`).toBe('BODY')
          await page.keyboard.press('Tab')
          const a = await active(page)
          if (SHELL(r)) {
            expect(a.href, `${r} first Tab = skip link`).toBe('#main')
            const box = (await page.locator(':focus').boundingBox())!
            expect(box.height, 'skip link block size').toBeGreaterThanOrEqual(44)
          } else {
            expect(a.tag, `${r} first Tab reaches a control`).not.toBe('BODY')
          }
          // no horizontal scroll
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
          expect(overflow, `${r} horizontal overflow`).toBeLessThanOrEqual(0)
          await shot(page, `${locale}-first-load-${r.replace(/\//g, '_') || 'root'}`)
        }
        expect(titles.size).toBe(ROUTES[who].length)
      })

      test(`[${locale}] axe clean on every route`, async ({ page }) => {
        await setLocale(page, locale, who)
        for (const r of ROUTES[who]) {
          await page.goto(r)
          await page.waitForLoadState('networkidle')
          const axe = await new AxeBuilder({ page }).analyze()
          const bad = axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
          expect(bad.map((v) => `${r}: ${v.id}`)).toEqual([])
        }
      })

      if (who === 'anonymous') continue
      const shell = `/${who}`

      test(`[${locale}] AC1 client navigation (keyboard, back, forward, 404) focuses the h1 and sets the title`, async ({ page }) => {
        await setLocale(page, locale, who)
        await page.goto(shell)
        await expect(page.locator('main h1')).toBeVisible()
        const home = new URL(page.url()).pathname
        await page.evaluate((p) => {
          history.pushState({}, '', `${p}/qa-missing`)
          window.dispatchEvent(new PopStateEvent('popstate'))
        }, shell)
        await expect(page).toHaveURL(/qa-missing$/)
        await expectH1Focused(page)
        // the shell's home link by keyboard
        await page.locator(`a[href="${home}"]`).first().focus()
        await page.keyboard.press('Enter')
        await expect(page).toHaveURL(new RegExp(`${home}$`))
        await expectH1Focused(page)
        // keyboard-driven focus shows a visible ring on the h1
        const ring = await page.locator('main h1').evaluate((e) => {
          const s = getComputedStyle(e)
          return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), fv: e.matches(':focus-visible') }
        })
        test.info().annotations.push({ type: 'h1-ring-after-keyboard-nav', description: JSON.stringify(ring) })
        await shot(page, `${locale}-${who}-after-keyboard-nav`)
        expect(ring.style).not.toBe('none')
        expect(ring.width).toBeGreaterThanOrEqual(2)
        await page.goBack()
        await expect(page).toHaveURL(/qa-missing$/)
        await expectH1Focused(page)
        await page.goForward()
        await expect(page).toHaveURL(new RegExp(`${home}$`))
        await expectH1Focused(page)
        // the top-level 404, then its start-page link (pointer): `/` redirects to the role's home
        await page.goto('/qa-missing')
        const back404 = page.locator('main a[href="/"]')
        expect((await back404.boundingBox())!.height, '404 link block size').toBeGreaterThanOrEqual(44)
        await back404.click()
        await expect(page).toHaveURL(new RegExp(`${home}$`))
        await expectH1Focused(page)
      })

      test(`[${locale}] AC1 reload after a client navigation keeps focus on body; skip link first and reaches main`, async ({ page }) => {
        await setLocale(page, locale, who)
        await page.goto('/qa-missing')
        await page.locator('main a[href="/"]').click()
        await expectH1Focused(page)
        await page.reload()
        await page.waitForLoadState('networkidle')
        expect((await active(page)).tag).toBe('BODY')
        await page.keyboard.press('Tab')
        expect((await active(page)).href).toBe('#main')
        await page.keyboard.press('Enter')
        const inMain = await page.evaluate(() => {
          const a = document.activeElement!
          return a.id === 'main' || !!a.closest('main')
        })
        expect(inMain, 'skip link moves focus to main').toBe(true)
        await expect(page).toHaveTitle(/ · Eng-LMS$/)
      })

      test(`[${locale}] AC1/AC3 language change in the account section: title follows without navigation, focus stays on the switcher, persists on reload`, async ({ page }) => {
        await setLocale(page, locale, who)
        const other: Locale = locale === 'vi' ? 'en' : 'vi'
        await page.goto(shell)
        await page.waitForLoadState('networkidle')
        const before = await page.title()
        const url = page.url()
        const section = await openAccountSection(page)
        await expect(section.getByRole('radiogroup')).toHaveAccessibleName(/.+/)
        await expect(section.getByRole('radio', { name: 'Tiếng Việt' })).toHaveAttribute('lang', 'vi')
        await expect(section.getByRole('radio', { name: 'English' })).toHaveAttribute('lang', 'en')
        for (const seg of await section.getByRole('radio').all()) expect((await seg.boundingBox())!.height).toBeGreaterThanOrEqual(44)
        // keyboard: Tab until a radio has focus, arrow to the other, Space
        for (let i = 0; i < 6 && (await active(page)).role !== 'radio'; i++) await page.keyboard.press('Tab')
        expect((await active(page)).role).toBe('radio')
        const targetName = other === 'vi' ? 'Tiếng Việt' : 'English'
        // the segment's text holds its label twice (a hidden copy keeps the width); its accessible name is the label
        for (let i = 0; i < 2 && !(await active(page)).text.startsWith(targetName); i++) await page.keyboard.press('ArrowRight')
        await expect(page.locator(':focus')).toHaveAccessibleName(targetName)
        await page.keyboard.press('Space')
        await expect(page.locator('html')).toHaveAttribute('lang', other)
        await expect(section.getByRole('radio', { name: targetName })).toHaveAttribute('aria-checked', 'true')
        expect(page.url()).toBe(url)
        const after = await page.title()
        expect(after).not.toBe(before)
        const h1 = (await page.locator('main h1').textContent())!.trim()
        expect(after).toBe(h1 + SUFFIX)
        expect((await active(page)).role, 'focus stays on the switcher').toBe('radio')
        await shot(page, `${locale}-switched-to-${other}-${who}`)
        await page.reload()
        await expect(page.locator('html')).toHaveAttribute('lang', other)
        await expect(page).toHaveTitle(after)
        // switch back with the pointer
        await (await openAccountSection(page)).getByRole('radio', { name: locale === 'vi' ? 'Tiếng Việt' : 'English' }).click()
        await expect(page).toHaveTitle(before)
      })
    }
  })
}

test.describe('anonymous: language change on /login', () => {
  for (const locale of LOCALES) {
    test(`[${locale}] AC3 the switcher on /login: title follows, focus stays, persists on reload`, async ({ page }) => {
      await setLocale(page, locale)
      const other: Locale = locale === 'vi' ? 'en' : 'vi'
      const before = await page.title()
      await page.getByRole('radio', { name: other === 'vi' ? 'Tiếng Việt' : 'English' }).focus()
      await page.keyboard.press('Space')
      await expect(page.locator('html')).toHaveAttribute('lang', other)
      expect((await active(page)).role, 'focus stays on the switcher').toBe('radio')
      expect(await page.title()).not.toBe(before)
      await page.reload()
      await expect(page.locator('html')).toHaveAttribute('lang', other)
      await page.getByRole('radio', { name: locale === 'vi' ? 'Tiếng Việt' : 'English' }).click()
      await expect(page).toHaveTitle(before)
    })
  }
})

test.describe('student: failed lazy load', () => {
  test.use({ storageState: STATE.student })
  for (const locale of LOCALES) {
    test(`[${locale}] AC1 failed lazy load on client navigation: error page h1 focused, titled, request-ID sentence absent`, async ({ page }) => {
      await setLocale(page, locale, 'student')
      await page.goto('/qa-no-such-page')
      await page.route(/\/assets\/StudentShell[^/]*\.js$/, (r) => r.abort())
      consoleErrors.length = 0
      await page.locator('main a[href="/"]').click() // `/` → /student/home: its chunk fails
      const text = await expectH1Focused(page)
      expect(text.length).toBeGreaterThan(0)
      await expect(page.getByText(/request ID|mã yêu cầu/i)).toHaveCount(0)
      await expect(page.getByRole('button')).toHaveCount(1)
      await shot(page, `${locale}-error-page`)
      const axe = await new AxeBuilder({ page }).analyze()
      expect(axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([])
      consoleErrors.length = 0 // the aborted chunk logs a resource error by design
    })
  }
})

const FIRST_LOAD = [['anonymous', '/login'], ['tutor', '/tutor'], ['student', '/student'], ['anonymous', '/qa-no-such-page']] as const
const CHUNKS = /\/assets\/(TutorShell|StudentShell|Login[A-Za-z]*|NotFound|ShellLayout)[^/]*\.js$/
test.describe('AC4 throttled first load: 150 ms skeleton delay and CLS', () => {
  for (const [who, r] of FIRST_LOAD) {
    test.describe(who, () => {
      test.use({ storageState: AS[who] })
      test(`delayed chunk + meta: ${r}`, async ({ page }) => {
      await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>
        w.__cls = 0
        w.__busyAt = null
        w.__skelAt = null
        new PerformanceObserver((l) => {
          for (const e of l.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) (w.__cls as number) += e.value
        }).observe({ type: 'layout-shift', buffered: true })
        const tick = () => {
          const busy = document.querySelector('[aria-busy="true"]')
          if (busy && w.__busyAt === null) w.__busyAt = performance.now()
          if (busy && w.__skelAt === null) {
            const sk = busy.querySelector('[data-testid="skeleton"]')
            if (sk && getComputedStyle(sk).visibility === 'visible' && sk.getBoundingClientRect().height > 0) w.__skelAt = performance.now()
          }
          if (w.__skelAt === null || w.__busyAt === null) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
      await page.route(CHUNKS, async (x) => {
        await new Promise((s) => setTimeout(s, 900))
        await x.continue()
      })
      await page.route('**/api/v1/meta', async (x) => {
        await new Promise((s) => setTimeout(s, 700))
        await x.continue()
      })
      await page.goto(r, { waitUntil: 'commit' })
      const busy = page.locator('[aria-busy="true"]').first()
      await expect(busy).toBeAttached()
      await expect(busy).toHaveAccessibleName(/.+/)
      await page.waitForTimeout(250)
      await shot(page, `loading-${r.replace(/\//g, '_')}`)
      await expect(page.locator('main h1')).toBeVisible({ timeout: 10000 })
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(600)
      const m = await page.evaluate(() => {
        const w = window as unknown as Record<string, number>
        return { cls: w.__cls, busyAt: w.__busyAt, skelAt: w.__skelAt, delay: w.__skelAt! - w.__busyAt! }
      })
      test.info().annotations.push({ type: `ac4 ${r}`, description: JSON.stringify(m) })
      fs.mkdirSync(SHOTS, { recursive: true })
      fs.appendFileSync(path.join(SHOTS, 'ac4-measurements.jsonl'), JSON.stringify({ project: test.info().project.name, route: r, ...m }) + '\n')
      expect(m.delay, 'skeleton not before 150 ms').toBeGreaterThanOrEqual(140) // rAF granularity
      expect(m.delay, 'skeleton shows soon after 150 ms').toBeLessThan(400)
      expect(m.cls).toBeLessThanOrEqual(0.05)
      // header-shaped skeleton on shell paths only (N3)
      })
    })
  }
  test('N3: shell paths reserve a header-shaped loading region, other paths page-only', async ({ browser, baseURL }) => {
    const res: Record<string, unknown> = {}
    for (const [who, r] of FIRST_LOAD) {
      const context = await browser.newContext({ baseURL, storageState: AS[who] })
      const page = await context.newPage()
      await page.route(CHUNKS, async (x) => {
        await new Promise((s) => setTimeout(s, 1500))
        await x.continue()
      })
      await page.goto(r, { waitUntil: 'commit' })
      const busy = page.locator('[aria-busy="true"]').first()
      await expect(busy).toBeAttached()
      await page.waitForTimeout(300)
      res[r] = await busy.evaluate((e) => ({
        display: getComputedStyle(e).display,
        topbar: !!e.querySelector('[data-testid="route-loading-topbar"]'),
        width: Math.round(e.getBoundingClientRect().width),
        vw: document.documentElement.clientWidth,
      }))
      await expect(page.locator('main h1')).toBeVisible({ timeout: 10000 })
      await context.close()
    }
    test.info().annotations.push({ type: 'n3', description: JSON.stringify(res) })
    for (const [r, v] of Object.entries(res) as [string, { display: string; topbar: boolean }][]) {
      expect(v.display, `${r} block-level`).not.toMatch(/^inline$/)
      expect(v.topbar, `${r} header-shaped skeleton`).toBe(SHELL(r))
    }
  })
})

test('isolation: student API paths take no studentId and return no data; no SECRET-* marker', async ({ request }) => {
  for (const p of ['/api/v1/student/lessons', '/api/v1/student/students/00000000-0000-0000-0000-000000000001', '/api/v1/tutor/students']) {
    const res = await request.get(p)
    expect([401, 403, 404], `${p} -> ${res.status()}`).toContain(res.status())
    expect(await res.text()).not.toContain('SECRET-')
  }
})
