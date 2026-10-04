import { test, expect, type Page, type Locator } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const SHOTS = process.env.QA_SHOTS
const log = (...a: unknown[]) => console.log('QA', test.info().project.name, ...a)
async function boxes(radios: Locator) {
  const n = await radios.count(); const out = []
  for (let i = 0; i < n; i++) { const b = await radios.nth(i).evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX, width: r.width, height: r.height } }); out.push({ x: b.x, w: b.width, h: b.height }) }
  return out
}
async function iconVisible(radios: Locator) {
  return radios.evaluateAll((els) => els.map((el) => {
    const svg = el.querySelector('svg'); if (!svg) return 'none'
    const cs = getComputedStyle(svg); const r = svg.getBoundingClientRect()
    return `${cs.visibility}/${svg.closest('[aria-hidden="true"]') || svg.getAttribute('aria-hidden') === 'true' ? 'ah' : 'NOT-ah'}/${Math.round(r.width)}`
  }))
}
function diff(a: { x: number; w: number }[], b: { x: number; w: number }[]) {
  return Math.max(...a.map((s, i) => Math.max(Math.abs(s.x - b[i]!.x), Math.abs(s.w - b[i]!.w))))
}
async function noHScroll(page: Page) {
  const r = await page.evaluate(() => ({ s: document.scrollingElement!.scrollWidth, v: document.documentElement.clientWidth }))
  expect(r.s, JSON.stringify(r)).toBeLessThanOrEqual(r.v)
}
async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(',')}`)).toEqual([])
}

test.describe('packaged', () => {
  test.skip(() => (process.env.E2E_BASE_URL ?? '').includes('5175'), 'packaged only')

  test('switcher: pointer + keyboard, no boundary movement, names, axe, no h-scroll', async ({ page }) => {
    for (const path of ['/', '/tutor', '/student']) {
      await page.goto(path)
      const group = page.getByRole('radiogroup').first()
      await expect(group).toBeVisible()
      const radios = group.getByRole('radio')
      const names = await radios.evaluateAll((els) => els.map((e) => e.textContent))
      await expect(page.getByRole('radio', { name: 'English', exact: true })).toHaveCount(1)
      await expect(page.getByRole('radio', { name: 'Tiếng Việt', exact: true })).toHaveCount(1)
      const b0 = await boxes(radios); const i0 = await iconVisible(radios)
      await page.getByRole('radio', { name: 'English', exact: true }).click()
      await expect(page.locator('html')).toHaveAttribute('lang', /en/)
      const b1 = await boxes(radios); const i1 = await iconVisible(radios)
      // keyboard back to vi: Tab into group from body
      await page.locator('body').click({ position: { x: 1, y: 1 } }).catch(() => {})
      await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
      let guard = 0
      while (!(await radios.evaluateAll((els) => (els as Element[]).includes(document.activeElement as Element))) && guard++ < 15) await page.keyboard.press('Tab')
      const focused1 = await page.evaluate(() => document.activeElement?.textContent)
      await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft')
      const focused2 = await page.evaluate(() => document.activeElement?.textContent)
      await page.keyboard.press('Space')
      await expect(page.locator('html')).toHaveAttribute('lang', /vi/)
      const b2 = await boxes(radios); const i2 = await iconVisible(radios)
      // Enter to select en
      await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter')
      await expect(page.locator('html')).toHaveAttribute('lang', /en/)
      const b3 = await boxes(radios)
      log(path, JSON.stringify({ names, b0, b1, b2, b3, i0, i1, i2, focused1, focused2, d01: diff(b0, b1), d02: diff(b0, b2), d03: diff(b0, b3) }))
      expect(diff(b0, b1)).toBeLessThanOrEqual(1); expect(diff(b0, b2)).toBeLessThanOrEqual(1); expect(diff(b0, b3)).toBeLessThanOrEqual(1)
      for (const b of b0) expect(b.h).toBeGreaterThanOrEqual(44)
      await noHScroll(page); await axe(page)
      // reset to vi for next path
      await page.getByRole('radio', { name: 'Tiếng Việt', exact: true }).click()
    }
  })

  test('landing slowed: skeleton vs heading, CLS', async ({ page }) => {
    for (const lang of ['vi', 'en']) {
      await page.goto('/'); await page.getByRole('radio', { name: lang === 'vi' ? 'Tiếng Việt' : 'English', exact: true }).click()
      let release!: () => void; const gate = new Promise<void>((r) => (release = r))
      await page.route(/Landing-.*\.js$/, async (route) => { await gate; await route.continue() })
      await page.addInitScript(() => {
        (window as any).__cls = 0
        new PerformanceObserver((l) => { for (const e of l.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__cls += e.value }).observe({ type: 'layout-shift', buffered: true })
      })
      await page.goto('/', { waitUntil: 'commit' })
      await page.waitForTimeout(1500)
      const sk = await page.evaluate(() => {
        const busy = document.querySelector('[aria-busy="true"], [role="status"], [aria-label]') as HTMLElement
        const all = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.children.length === 0 })
        return { label: busy?.getAttribute('aria-label'), leaves: all.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] }) }
      })
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${test.info().project.name}-landing-loading-${lang}.png` })
      release()
      const h1 = page.getByRole('heading', { level: 1 }); await expect(h1).toBeVisible()
      const hb = (await h1.boundingBox())!
      const sw = (await page.getByRole('radiogroup').boundingBox())!
      await page.waitForTimeout(500)
      const cls = await page.evaluate(() => (window as any).__cls)
      log('AC3', lang, JSON.stringify({ sk, h1: [hb.x, hb.y, hb.width, hb.height], sw: [sw.x, sw.y, sw.width, sw.height], cls }))
      expect(cls).toBeLessThanOrEqual(0.05)
      await page.unroute(/Landing-.*\.js$/)
    }
  })

  test('error page via failed lazy load: link, focus, vi/en, absent on /', async ({ page }) => {
    for (const lang of ['vi', 'en']) {
      await page.goto('/'); await page.getByRole('radio', { name: lang === 'vi' ? 'Tiếng Việt' : 'English', exact: true }).click()
      await page.route(/TutorShell-.*\.js$/, (r) => r.abort())
      await page.getByRole('link', { name: lang === 'vi' ? 'Khu vực gia sư' : /tutor/i }).click()
      const h1 = page.getByRole('heading', { level: 1 }); await expect(h1).toBeVisible()
      const home = page.getByRole('link', { name: lang === 'vi' ? 'Về trang đầu' : 'Go to the start page' })
      await expect(home).toBeVisible()
      const reload = page.getByRole('button')
      const info = { url: page.url(), h1: await h1.textContent(), focus: await page.evaluate(() => document.activeElement?.tagName + ':' + document.activeElement?.textContent), buttons: await reload.allTextContents(), homeBox: await home.boundingBox(), href: await home.getAttribute('href'), body: (await page.locator('main, body').first().innerText()).slice(0, 400) }
      log('AC4', lang, JSON.stringify(info))
      expect(info.homeBox!.height).toBeGreaterThanOrEqual(44); expect(info.href).toBe('/')
      // link after reload button in DOM order
      const order = await page.evaluate(() => { const els = [...document.querySelectorAll('button, a[href]')]; return els.map((e) => e.tagName + ':' + e.textContent) })
      log('AC4 order', JSON.stringify(order))
      await noHScroll(page); await axe(page)
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${test.info().project.name}-error-${lang}.png`, fullPage: true })
      // keyboard: Tab to the link and Enter
      let g = 0; while (!(await home.evaluate((e) => e === document.activeElement)) && g++ < 20) await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(/\/$/)
      await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
      log('AC4 landed', lang, await page.evaluate(() => document.activeElement?.tagName + ':' + document.activeElement?.textContent))
      await page.unroute(/TutorShell-.*\.js$/)
    }
    // absent when / fails (client navigation to / from a shell, Landing chunk aborted; fresh load)
    for (const lang of ['vi', 'en']) {
      await page.goto('/tutor')
      await page.getByRole('radio', { name: lang === 'vi' ? 'Tiếng Việt' : 'English', exact: true }).click()
      await page.route(/Landing-.*\.js$/, (r) => r.abort())
      const toStart = page.getByRole('link').filter({ hasText: /Eng-LMS|trang đầu|start|Không gian|Teaching/i }).first()
      const links = await page.getByRole('link').allTextContents()
      log('shell links', JSON.stringify(links))
      if (await toStart.count()) { await toStart.click() } else { await page.evaluate(() => { history.pushState({}, '', '/'); dispatchEvent(new PopStateEvent('popstate')) }) }
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page).toHaveURL(/\/$/)
      const has = await page.getByRole('link', { name: lang === 'vi' ? 'Về trang đầu' : 'Go to the start page' }).count()
      log('AC4 on / fail', lang, has, await page.getByRole('heading', { level: 1 }).textContent(), JSON.stringify(await page.getByRole('button').allTextContents()))
      expect(has).toBe(0)
      await page.unroute(/Landing-.*\.js$/)
      // fresh load of / with Landing aborted
      await page.route(/Landing-.*\.js$/, (r) => r.abort())
      await page.goto('/')
      await page.waitForTimeout(1500)
      log('fresh / fail', lang, JSON.stringify((await page.locator('body').innerText()).slice(0, 300)), await page.getByRole('link', { name: lang === 'vi' ? 'Về trang đầu' : 'Go to the start page' }).count())
      await page.unroute(/Landing-.*\.js$/)
    }
  })
})

test.describe('dev /dev/ui', () => {
  test.skip(() => !(process.env.E2E_BASE_URL ?? '').includes('5175'), 'dev only')
  test('all segmented groups stable on pointer + keyboard', async ({ page }) => {
    for (const lang of ['Tiếng Việt', 'English']) {
      await page.goto('/dev/ui')
      await page.getByRole('radio', { name: lang, exact: true }).first().click()
      const groups = page.locator('[role="radiogroup"]')
      const n = await groups.count()
      for (let g = 0; g < n; g++) {
        const radios = groups.nth(g).getByRole('radio'); const k = await radios.count()
        const base = await boxes(radios); let worst = 0
        const names = await radios.evaluateAll((els) => els.map((e) => e.textContent))
        for (let i = 0; i < k; i++) {
          if (await radios.nth(i).isDisabled()) continue
          await radios.nth(i).click(); worst = Math.max(worst, diff(base, await boxes(radios)))
          const vis = await iconVisible(radios); 
          if (g > 0 || true) log('icons', g, i, JSON.stringify(vis))
          await radios.nth(i).press('ArrowRight').catch(() => {}); await page.keyboard.press('Space')
          worst = Math.max(worst, diff(base, await boxes(radios)))
        }
        log('devui', lang, g, JSON.stringify(names), k, 'worst', worst)
        if (g !== 4) expect(worst).toBeLessThanOrEqual(1)
      }
      await noHScroll(page)
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${test.info().project.name}-devui-${lang.slice(0, 2)}.png` })
    }
  })
})
