import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// Independent black-box QA for T-M1.9 (web a11y/UX follow-ups). Written from the packet ACs only.
// Run: QA_BASE_URL=http://localhost:8080 pnpm test e2e/T-M1.9.spec.ts --project=phone-small --project=tablet --project=laptop
const SHOTS = process.env.QA_SHOTS_DIR ?? 'qa-shots'
const SUFFIX = ' · Eng-LMS'
const LOCALES = ['vi', 'en'] as const
type Locale = (typeof LOCALES)[number]
const ROUTES = ['/', '/tutor', '/student', '/qa-no-such-page'] as const
const SHELL = (r: string) => r.startsWith('/tutor') || r.startsWith('/student')

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
    if (m.type() === 'error') consoleErrors.push(`${page.url()} ${m.text()}`)
  })
  page.on('pageerror', (e) => consoleErrors.push(`${page.url()} pageerror ${e.message}`))
})
test.afterEach(async ({ page }) => {
  await page.waitForTimeout(400) // late errors
  expect(secretHits, 'SECRET-* marker in a response').toEqual([])
  expect(consoleErrors, 'console errors').toEqual([])
  consoleErrors.length = 0
})

async function setLocale(page: Page, locale: Locale) {
  await page.goto('/')
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

for (const locale of LOCALES) {
  test.describe(`[${locale}]`, () => {
    test('AC1 first load: focus stays on body, title set, first Tab stop', async ({ page }) => {
      await setLocale(page, locale)
      const titles = new Set<string>()
      for (const r of ROUTES) {
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
          const inMain = await page.evaluate(() => !!document.activeElement?.closest('main'))
          expect(inMain, `${r} first Tab inside main`).toBe(true)
        }
        // no horizontal scroll
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `${r} horizontal overflow`).toBeLessThanOrEqual(0)
        await shot(page, `${locale}-first-load-${r.replace(/\//g, '_') || 'root'}`)
      }
      expect(titles.size).toBe(ROUTES.length)
    })

    test('AC1 client navigation (links, keyboard, back, forward, 404) focuses the h1 and sets the title', async ({ page }) => {
      await setLocale(page, locale)
      const tutorLink = page.locator('main a[href="/tutor"]')
      await tutorLink.focus()
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(/\/tutor$/)
      await expectH1Focused(page)
      // keyboard-driven focus shows a visible ring on the h1
      const ring = await page.locator('main h1').evaluate((e) => {
        const s = getComputedStyle(e)
        return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), fv: e.matches(':focus-visible') }
      })
      test.info().annotations.push({ type: 'h1-ring-after-keyboard-nav', description: JSON.stringify(ring) })
      await shot(page, `${locale}-tutor-after-keyboard-nav`)
      expect(ring.style).not.toBe('none')
      expect(ring.width).toBeGreaterThanOrEqual(2)

      await page.goBack()
      await expect(page).toHaveURL(/\/$/)
      await expectH1Focused(page)
      await page.goForward()
      await expect(page).toHaveURL(/\/tutor$/)
      await expectH1Focused(page)
      // shell home link (pointer) -> landing
      const home = page.getByRole('banner').getByRole('link').first()
      expect((await home.boundingBox())!.height, 'shell home link block size').toBeGreaterThanOrEqual(44)
      await home.click()
      await expect(page).toHaveURL(/\/$/)
      await expectH1Focused(page)
      await page.locator('main a[href="/student"]').click()
      await expect(page).toHaveURL(/\/student$/)
      await expectH1Focused(page)
      // any -> 404 as a client navigation (history API + popstate, the router's own listener)
      await page.evaluate(() => {
        history.pushState({}, '', '/qa-missing')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
      await expect(page).toHaveURL(/qa-missing$/)
      await expectH1Focused(page)
      const back404 = page.locator('main a[href="/"]')
      expect((await back404.boundingBox())!.height, '404 link block size').toBeGreaterThanOrEqual(44)
      await back404.click()
      await expectH1Focused(page)
      await page.goBack() // back to the 404
      await expect(page).toHaveURL(/qa-missing$/)
      await expectH1Focused(page)
    })

    test('AC1 reload after a client navigation keeps focus on body; skip link first and reaches main', async ({ page }) => {
      await setLocale(page, locale)
      await page.locator('main a[href="/tutor"]').click()
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
      // the hash change must not be treated as a route change (focus is not pulled to the h1 via the announcer title reset)
      await expect(page).toHaveTitle(/ · Eng-LMS$/)
    })

    test('AC1/AC3 language change: title follows without navigation, focus stays on the switcher, persists on reload', async ({ page }) => {
      await setLocale(page, locale)
      const other: Locale = locale === 'vi' ? 'en' : 'vi'
      // the switcher lives on the landing page and both shells (AC3); the 404 has none
      for (const r of ['/', '/tutor', '/student']) {
        await page.goto(r)
        await page.waitForLoadState('networkidle')
        const before = await page.title()
        const url = page.url()
        const group = page.getByRole('radiogroup')
        await expect(group).toHaveAccessibleName(/.+/)
        // endonyms keep their lang attribute
        await expect(page.getByRole('radio', { name: 'Tiếng Việt' })).toHaveAttribute('lang', 'vi')
        await expect(page.getByRole('radio', { name: 'English' })).toHaveAttribute('lang', 'en')
        for (const seg of await page.getByRole('radio').all()) expect((await seg.boundingBox())!.height).toBeGreaterThanOrEqual(44)
        // keyboard: Tab until a radio has focus, arrow to the other, Space
        await page.locator('body').focus()
        for (let i = 0; i < 6 && (await active(page)).role !== 'radio'; i++) await page.keyboard.press('Tab')
        expect((await active(page)).role).toBe('radio')
        const targetName = other === 'vi' ? 'Tiếng Việt' : 'English'
        for (let i = 0; i < 2 && (await active(page)).text !== targetName; i++) await page.keyboard.press('ArrowRight')
        expect((await active(page)).text).toBe(targetName)
        await page.keyboard.press('Space')
        await expect(page.locator('html')).toHaveAttribute('lang', other)
        await expect(page.getByRole('radio', { name: targetName })).toHaveAttribute('aria-checked', 'true')
        expect(page.url()).toBe(url)
        const after = await page.title()
        expect(after).not.toBe(before)
        const h1 = (await page.locator('main h1').textContent())!.trim()
        expect(after).toBe(h1 + SUFFIX)
        expect((await active(page)).role, 'focus stays on the switcher').toBe('radio')
        await shot(page, `${locale}-switched-to-${other}-${r.replace(/\//g, '_')}`)
        await page.reload()
        await expect(page.locator('html')).toHaveAttribute('lang', other)
        await expect(page).toHaveTitle(after)
        // switch back with the pointer
        await page.getByRole('radio', { name: locale === 'vi' ? 'Tiếng Việt' : 'English' }).click()
        await expect(page).toHaveTitle(before)
      }
    })

    test('AC1 failed lazy load on client navigation: error page h1 focused, titled, request-ID sentence absent', async ({ page }) => {
      await setLocale(page, locale)
      await page.route(/\/assets\/StudentShell[^/]*\.js$/, (r) => r.abort())
      consoleErrors.length = 0
      await page.locator('main a[href="/student"]').click()
      const text = await expectH1Focused(page)
      expect(text.length).toBeGreaterThan(0)
      await expect(page.getByText(/request ID|mã yêu cầu/i)).toHaveCount(0)
      await expect(page.getByRole('button')).toHaveCount(1)
      await shot(page, `${locale}-error-page`)
      const axe = await new AxeBuilder({ page }).analyze()
      expect(axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([])
      consoleErrors.length = 0 // the aborted chunk logs a resource error by design
    })

    test('axe clean on every route', async ({ page }) => {
      await setLocale(page, locale)
      for (const r of ROUTES) {
        await page.goto(r)
        await page.waitForLoadState('networkidle')
        const axe = await new AxeBuilder({ page }).analyze()
        const bad = axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
        expect(bad.map((v) => `${r}: ${v.id}`)).toEqual([])
      }
    })
  })
}

test.describe('AC4 throttled first load: 150 ms skeleton delay and CLS', () => {
  for (const r of ['/', '/tutor', '/student', '/qa-no-such-page']) {
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
      await page.route(/\/assets\/(TutorShell|StudentShell|Landing|NotFound|ShellLayout)[^/]*\.js$/, async (x) => {
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
  }
  test('N3: shell paths reserve a header-shaped loading region, other paths page-only', async ({ page }) => {
    await page.route(/\/assets\/(TutorShell|StudentShell|Landing|NotFound|ShellLayout)[^/]*\.js$/, async (x) => {
      await new Promise((s) => setTimeout(s, 1500))
      await x.continue()
    })
    const res: Record<string, unknown> = {}
    for (const r of ['/tutor', '/student', '/', '/qa-no-such-page']) {
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
