import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { STATE } from '../support/global-setup'

// M1 milestone regression (qa-protocol §5, quality-gates G5). Black-box, engine-neutral (no CDP), no retries, no sleeps.
// Journeys: landing + language switch (vi default, en, persistence), tutor/student shells + skip link, 404 + start-page link,
// deep links (SPA fallback), title/focus on client navigation, route error page, meta loading/error states, responsive (no
// horizontal overflow, 44 px targets), axe, security headers, API/actuator exclusions, isolation, no console errors.
// Run: QA_ENGINES=all pnpm test regression/
// Since T-M2.4 there is no anonymous landing page: `/` redirects (anonymous → /login), the shells need a session of their
// role and the shell's language switcher sits in the account section (D3 of T-M2.7). Sessions: support/global-setup.ts.
const SUFFIX = ' · Eng-LMS'
const LOCALES = ['vi', 'en'] as const
type Locale = (typeof LOCALES)[number]
type Who = 'anonymous' | 'tutor' | 'student'
const AS: Record<Who, string | { cookies: []; origins: [] }> = { anonymous: { cookies: [], origins: [] }, ...STATE }
const ROUTES: Record<Who, readonly string[]> = { anonymous: ['/login', '/qa-no-such-page'], tutor: ['/tutor'], student: ['/student'] }
const SHELLS = ['tutor', 'student'] as const
// A public page with the switcher in its toolbar, for every caller (a signed-in /login would log out first).
const SWITCHER_PAGE: Record<Who, string> = { anonymous: '/login', tutor: '/forbidden', student: '/forbidden' }
const NAME: Record<Locale, string> = { vi: 'Tiếng Việt', en: 'English' }

let consoleErrors: string[] = []
let secretHits: string[] = []
test.beforeEach(async ({ page, context, browserName }) => {
  // Harness workaround, Firefox only: Playwright 1.63's Firefox loses track of a navigation from about:blank to a page sent with
  // Cross-Origin-Opener-Policy: same-origin (~10 % on a static control page with COOP, 0 % without; the document itself loads).
  // Strip COOP from document responses in Firefox; the header itself is asserted below with the request fixture, unmodified.
  if (browserName === 'firefox')
    await context.route('**/*', async (route) => {
      if (!route.request().isNavigationRequest()) return route.fallback()
      const res = await route.fetch()
      const headers = { ...res.headers() }
      delete headers['cross-origin-opener-policy']
      await route.fulfill({ response: res, headers })
    })
  consoleErrors = []
  secretHits = []
  page.on('console', (m) => {
    // An anonymous visit answers GET /auth/session with 401 by design (T-M2.4): the only status error accepted.
    if (m.type() === 'error' && !(/status of 401/.test(m.text()) && m.location().url.endsWith('/api/v1/auth/session')))
      consoleErrors.push(`${page.url()} ${m.text()}`)
  })
  page.on('pageerror', (e) => consoleErrors.push(`${page.url()} pageerror ${e.message}`))
  page.on('response', async (res) => {
    const body = await res.text().catch(() => '')
    if (body.includes('SECRET-')) secretHits.push(res.url())
  })
})
test.afterEach(async ({ page }) => {
  await page.waitForLoadState('networkidle').catch(() => {})
  expect(secretHits, 'SECRET-* marker in a response').toEqual([])
  expect(consoleErrors, 'console errors').toEqual([])
})

async function open(page: Page, path: string) {
  await page.goto(path)
  await expect(page.locator('main h1')).toBeVisible()
  await page.waitForLoadState('networkidle')
}
async function setLocale(page: Page, locale: Locale, who: Who = 'anonymous') {
  await open(page, SWITCHER_PAGE[who])
  const radio = page.getByRole('radio', { name: NAME[locale], exact: true })
  if ((await radio.getAttribute('aria-checked')) !== 'true') await radio.click()
  await expect(page.locator('html')).toHaveAttribute('lang', locale)
}
const activeInfo = (page: Page) =>
  page.evaluate(() => {
    const a = document.activeElement as HTMLElement
    return { tag: a.tagName, href: a.getAttribute('href'), inMain: !!a.closest('main') || a.id === 'main' }
  })
// The shell's switcher is in the account section (menu popover, More sheet or drawer, by viewport).
async function openAccountSection(page: Page) {
  await page.locator('button[aria-haspopup="dialog"]').first().click()
  const section = page.getByRole('dialog').last()
  await expect(section.getByRole('radiogroup')).toBeVisible()
  return section
}
async function expectH1FocusedAndTitled(page: Page) {
  const h1 = page.locator('main h1')
  await expect(h1).toBeFocused()
  await expect(page).toHaveTitle(((await h1.textContent()) ?? '').trim() + SUFFIX)
}
async function noHorizontalOverflow(page: Page, what: string) {
  const r = await page.evaluate(() => ({ sw: document.scrollingElement!.scrollWidth, iw: window.innerWidth }))
  expect(r.sw, `${what} horizontal overflow ${JSON.stringify(r)}`).toBeLessThanOrEqual(r.iw)
}
async function targetsAtLeast44(page: Page, what: string) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('a[href], button, [role="radio"], [role="button"], input, select, textarea')]
      .filter((e) => {
        const s = getComputedStyle(e)
        const r = e.getBoundingClientRect()
        return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0
      })
      // a checkbox or radio input's target includes its label (e.g. "Remember me" on /login)
      .map((e) => (/^(checkbox|radio)$/.test((e as HTMLInputElement).type) ? ((e as HTMLInputElement).labels?.[0] ?? e) : e) as HTMLElement)
      .map((e) => {
        const r = e.getBoundingClientRect()
        return { t: (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) }
      })
      .filter((x) => x.w < 44 || x.h < 44),
  )
  expect(small, `${what} targets below 44x44`).toEqual([])
}
async function axeClean(page: Page, what: string) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  expect(r.violations.map((v) => `${what}: ${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(',')}`)).toEqual([])
}

test('fresh visit starts in Vietnamese (anonymous / lands on /login)', async ({ page }) => {
  await open(page, '/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
  await expect(page.getByRole('radio', { name: NAME.vi, exact: true })).toHaveAttribute('aria-checked', 'true')
})

for (const who of ['anonymous', 'tutor', 'student'] as const) {
  test.describe(who, () => {
    test.use({ storageState: AS[who] })
    for (const locale of LOCALES) {
      test(`[${locale}] every route: titled, focus on body, no overflow, 44 px targets, axe clean, localised`, async ({ page }) => {
        await setLocale(page, locale, who)
        const titles = new Set<string>()
        for (const r of ROUTES[who]) {
          await open(page, r)
          await expect(page.locator('html')).toHaveAttribute('lang', locale)
          const h1 = ((await page.locator('main h1').textContent()) ?? '').trim()
          expect(h1.length, `${r} h1`).toBeGreaterThan(0)
          await expect(page).toHaveTitle(h1 + SUFFIX)
          titles.add(h1)
          expect((await activeInfo(page)).tag, `${r} focus on first load`).toBe('BODY')
          // no raw i18n keys leak (e.g. "landing.title")
          const text = await page.locator('body').innerText()
          expect(text, `${r} raw i18n key`).not.toMatch(/\b[a-z]+\.[a-z][A-Za-z]+(\.[A-Za-z]+)*\b/)
          await noHorizontalOverflow(page, r)
          await targetsAtLeast44(page, r)
          await axeClean(page, r)
        }
        expect(titles.size, 'distinct h1 per route').toBe(ROUTES[who].length)
      })

      if (who === 'anonymous') continue
      const shell = `/${who}`

      test(`[${locale}] shell: banner, skip link is the first Tab stop and moves focus into main, workspace name shown`, async ({ page }) => {
        await setLocale(page, locale, who)
        await open(page, shell)
        await expect(page.getByRole('banner')).toBeVisible()
        await page.keyboard.press('Tab')
        const a = await activeInfo(page)
        expect(a.href, `${shell} first Tab = skip link`).toBe('#main')
        await expect(page.locator(':focus')).toBeVisible()
        await page.keyboard.press('Enter')
        expect((await activeInfo(page)).inMain, `${shell} skip link lands in main`).toBe(true)
        // the shell header shows the workspace name from /api/v1/meta (no skeleton or alert left)
        await expect(page.getByRole('banner').locator('[aria-busy="true"]')).toHaveCount(0)
        await expect(page.getByRole('alert')).toHaveCount(0)
      })

      test(`[${locale}] client navigation: h1 focused + title, back/forward, 404 and its start-page link (keyboard)`, async ({ page }) => {
        await setLocale(page, locale, who)
        await open(page, shell)
        const home = page.url()
        // a shell 404 (inside the shell), then the shell's home link by keyboard
        await page.evaluate(() => {
          history.pushState({}, '', `${location.pathname.split('/').slice(0, 2).join('/')}/qa-missing`)
          window.dispatchEvent(new PopStateEvent('popstate'))
        })
        await expect(page).toHaveURL(/\/qa-missing$/)
        await expectH1FocusedAndTitled(page)
        const homeLink = page.locator(`a[href="${new URL(home).pathname}"]`).first()
        await homeLink.focus()
        await page.keyboard.press('Enter')
        await expect(page).toHaveURL(home)
        await expectH1FocusedAndTitled(page)
        await page.goBack()
        await expect(page).toHaveURL(/\/qa-missing$/)
        await expectH1FocusedAndTitled(page)
        await page.goForward()
        await expect(page).toHaveURL(home)
        await expectH1FocusedAndTitled(page)
        // the top-level 404 on a direct load, then its start-page link by keyboard: `/` redirects to the role's home
        await open(page, '/qa/deep/missing?x=1#y')
        await expect(page.getByRole('banner')).toHaveCount(0)
        const start = page.locator('main a[href="/"]')
        await expect(start).toBeVisible()
        await start.focus()
        await page.keyboard.press('Enter')
        await expect(page).toHaveURL(home)
        await expectH1FocusedAndTitled(page)
        await expect(page.locator('html')).toHaveAttribute('lang', locale)
      })

      test(`[${locale}] language switch in the shell's account section: strings, lang, title, persistence over reload and navigation`, async ({ page }) => {
        await setLocale(page, locale, who)
        const other: Locale = locale === 'vi' ? 'en' : 'vi'
        await open(page, shell)
        const before = { title: await page.title(), h1: await page.locator('main h1').textContent() }
        let section = await openAccountSection(page)
        await expect(section.getByRole('radiogroup')).toHaveAccessibleName(/.+/)
        await expect(section.getByRole('radio', { name: NAME.vi, exact: true })).toHaveAttribute('lang', 'vi')
        await expect(section.getByRole('radio', { name: NAME.en, exact: true })).toHaveAttribute('lang', 'en')
        await section.getByRole('radio', { name: NAME[other], exact: true }).click()
        await expect(page.locator('html')).toHaveAttribute('lang', other)
        await expect(page.locator('main h1')).not.toHaveText(before.h1 ?? '')
        await expect(page).not.toHaveTitle(before.title)
        await page.reload()
        await expect(page.locator('html')).toHaveAttribute('lang', other)
        section = await openAccountSection(page)
        await expect(section.getByRole('radio', { name: NAME[other], exact: true })).toHaveAttribute('aria-checked', 'true')
        // the choice carries over to a fresh tab (same origin storage)
        const tab = await page.context().newPage()
        await tab.goto('/qa-no-such-page')
        await expect(tab.locator('html')).toHaveAttribute('lang', other)
        await tab.close()
        await section.getByRole('radio', { name: NAME[locale], exact: true }).click()
        await expect(page.locator('html')).toHaveAttribute('lang', locale)
        await expect(page).toHaveTitle(before.title)
      })
    }
  })
}

test.describe('anonymous: language switch on /login', () => {
  for (const locale of LOCALES) {
    test(`[${locale}] strings, lang, title, persistence over reload and a fresh tab`, async ({ page }) => {
      await setLocale(page, locale)
      const other: Locale = locale === 'vi' ? 'en' : 'vi'
      const before = { title: await page.title(), h1: await page.locator('main h1').textContent() }
      await expect(page.getByRole('radiogroup')).toHaveAccessibleName(/.+/)
      await page.getByRole('radio', { name: NAME[other], exact: true }).click()
      await expect(page.locator('html')).toHaveAttribute('lang', other)
      await expect(page.locator('main h1')).not.toHaveText(before.h1 ?? '')
      await page.reload()
      await expect(page.getByRole('radio', { name: NAME[other], exact: true })).toHaveAttribute('aria-checked', 'true')
      const tab = await page.context().newPage()
      await tab.goto('/qa-no-such-page')
      await expect(tab.locator('html')).toHaveAttribute('lang', other)
      await tab.close()
      await page.getByRole('radio', { name: NAME[locale], exact: true }).click()
      await expect(page).toHaveTitle(before.title)
    })
  }
})

test.describe('student: route error page and shell header', () => {
  test.use({ storageState: STATE.student })
  for (const locale of LOCALES) {
    test(`[${locale}] route error page: failed lazy chunk shows a titled error with a working start-page link`, async ({ page }) => {
      await setLocale(page, locale, 'student')
      await open(page, '/qa-no-such-page')
      await page.route(/\/assets\/StudentShell[^/]*\.js$/, (r) => r.abort())
      await page.locator('main a[href="/"]').click() // `/` → /student/home: its chunk fails
      await expectH1FocusedAndTitled(page)
      await expect(page.locator('main a[href="/"]')).toBeVisible()
      await noHorizontalOverflow(page, 'error page')
      await targetsAtLeast44(page, 'error page')
      await axeClean(page, 'error page')
      await page.unroute(/\/assets\/StudentShell[^/]*\.js$/)
      // The start page is the same failed shell for a student; the page's own retry button recovers.
      await page.locator('main').getByRole('button').click()
      await expect(page).toHaveURL(/\/student\/home$/)
      await expect(page.getByRole('banner')).toBeVisible()
      consoleErrors = consoleErrors.filter((e) => !/StudentShell|net::ERR_FAILED|dynamically imported module|Failed to fetch|Importing a module script failed|error loading dynamically/i.test(e))
    })
  }
})

test.describe('tutor: shell header', () => {
  test.use({ storageState: STATE.tutor })
  for (const locale of LOCALES) {
    test(`[${locale}] /api/v1/meta failure shows an alert, not a blank or a crash`, async ({ page }) => {
      await setLocale(page, locale, 'tutor')
      await page.route('**/api/v1/meta', (r) =>
        r.fulfill({ status: 500, contentType: 'application/problem+json', body: JSON.stringify({ status: 500, title: 'x', code: 'INTERNAL' }) }),
      )
      await open(page, '/tutor')
      await expect(page.getByRole('banner').getByRole('alert').or(page.getByRole('alert')).first()).toBeVisible({ timeout: 15000 })
      await noHorizontalOverflow(page, 'meta error')
      await axeClean(page, 'meta error')
      consoleErrors = consoleErrors.filter((e) => !/500|api\/v1\/meta/i.test(e))
    })
  }
})

for (const who of SHELLS) {
  test.describe(`${who}: deep links`, () => {
    test.use({ storageState: STATE[who] })
    test('deep links survive reload (SPA fallback)', async ({ page }) => {
      for (const r of [`/${who}`, `/${who}/a/b`, `/${who}/x?q=1`]) {
        await open(page, r)
        const path = new URL(page.url()).pathname // `/tutor` and `/student` redirect to the role's home first
        await page.reload()
        await expect(page.locator('main h1')).toBeVisible()
        expect(new URL(page.url()).pathname).toBe(path)
      }
    })
  })
}

test('anonymous: a shell deep link goes to /login with next; /dev/ui is not in the production build', async ({ page }) => {
  await page.goto('/student/x?q=1')
  await expect(page).toHaveURL(/\/login\?next=%2Fstudent%2Fx%3Fq%3D1$/)
  await open(page, '/dev/ui')
  await expect(page.locator('main a[href="/"]')).toBeVisible() // the 404 page
  await expect(page.getByRole('radiogroup')).toHaveCount(0)
})

test.describe('HTTP surface', () => {
  const CSP = /default-src 'self'.*script-src 'self'.*style-src 'self'.*object-src 'none'.*base-uri 'none'.*frame-ancestors 'none'/
  for (const p of ['/', '/tutor', '/qa-missing', '/api/v1/meta', '/api/v1/qa-unknown']) {
    test(`security headers on ${p}`, async ({ request }) => {
      const res = await request.get(p, { headers: { Accept: p.startsWith('/api') ? 'application/json' : 'text/html' } })
      const h = res.headers()
      expect(h['content-security-policy']).toMatch(CSP)
      expect(h['content-security-policy']).not.toContain('unsafe-inline')
      expect(h['x-content-type-options']).toBe('nosniff')
      expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
      expect(h['permissions-policy']).toMatch(/camera=\(\).*geolocation=\(\).*payment=\(\)/)
      expect(h['cross-origin-opener-policy']).toBe('same-origin')
      if (!p.startsWith('/api')) {
        expect(res.status()).toBe(200)
        expect(h['content-type']).toContain('text/html')
        expect(h['cache-control']).toContain('no-cache')
      }
    })
  }
  // Since T-M2.1 the API is deny-by-default: an unknown path answers an anonymous caller 401 (T-M2.4 QA, DEC-111).
  test('API: meta JSON, unknown API path is Problem Details 401 for an anonymous caller (not the SPA), actuator not on :8080', async ({ request }) => {
    const meta = await request.get('/api/v1/meta')
    expect(meta.status()).toBe(200)
    expect(meta.headers()['content-type']).toContain('application/json')
    expect(await meta.json()).toEqual(expect.objectContaining({}))
    const unknown = await request.get('/api/v1/qa-unknown', { headers: { Accept: 'text/html' } })
    expect(unknown.status()).toBe(401)
    expect(unknown.headers()['content-type']).toContain('application/problem+json')
    expect(await unknown.text()).not.toContain('<html')
    const act = await request.get('/actuator/health', { headers: { Accept: 'text/html' } })
    expect(act.status()).toBe(404)
    expect(await act.text()).not.toContain('<div id="root"')
  })
  test('hashed assets are immutable (signed in: no anonymous session 401 in the console)', async ({ browser, request }) => {
    const context = await browser.newContext({ baseURL: process.env.QA_BASE_URL ?? 'http://localhost:8080', storageState: STATE.tutor })
    const page = await context.newPage()
    const urls: string[] = []
    page.on('request', (r) => {
      if (/\/assets\/.+\.(js|css)$/.test(r.url())) urls.push(r.url())
    })
    await open(page, '/tutor')
    await context.close()
    expect(urls.length).toBeGreaterThan(0)
    const res = await request.get(urls[0]!)
    expect(res.headers()['cache-control']).toMatch(/max-age=31536000.*immutable|immutable.*max-age=31536000/)
  })
  test('isolation: student/tutor API paths return no data and no SECRET-* marker', async ({ request }) => {
    for (const p of ['/api/v1/student/lessons', '/api/v1/student/students/00000000-0000-0000-0000-000000000001', '/api/v1/tutor/students']) {
      const res = await request.get(p)
      expect([401, 403, 404], `${p} -> ${res.status()}`).toContain(res.status())
      expect(await res.text()).not.toContain('SECRET-')
    }
  })
})
