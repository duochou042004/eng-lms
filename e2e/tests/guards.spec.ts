import type { Page } from '@playwright/test'
import { expectNoAxeViolations, expectNoHorizontalScroll } from '../support/checks'
import { expect, test } from '../support/fixtures'

// Self-tests of the harness guards (T-M1.6 AC4): each one must FAIL on a page broken on purpose. The page is the real
// served /tutor with the real CSP header; only this test's copy of the HTML is altered (nothing ships in the bundle).
test.beforeEach(({ page: _page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop', 'guards are browser-level: one project is enough')
})

async function openTutorWith(page: Page, injectIntoHead: string) {
  await page.route('**/tutor', async (route) => {
    const response = await route.fetch()
    const html = (await response.text()).replace('</head>', `${injectIntoHead}</head>`)
    await route.fulfill({ response, body: html })
  })
  await page.goto('/tutor')
  await expect(page.getByRole('heading', { level: 1, name: 'Không gian gia sư' })).toBeVisible()
}

test('the axe check fails on an image without alt text', async ({ page }) => {
  await openTutorWith(page, '')
  await page.evaluate(() => {
    const img = document.createElement('img')
    img.src = '/favicon.svg'
    document.querySelector('main')?.append(img)
  })
  await expect(expectNoAxeViolations(page)).rejects.toThrow(/image-alt/)
})

test('the layout check fails on horizontal overflow', async ({ page }) => {
  await openTutorWith(page, '')
  await page.evaluate(() => {
    const wide = document.createElement('div')
    wide.style.width = '3000px'
    wide.textContent = 'overflow'
    document.body.append(wide)
  })
  await expect(expectNoHorizontalScroll(page)).rejects.toThrow(/horizontal scroll/)
})

test('the console guard fails on a CSP violation (an inline <style> under style-src self)', async ({ page, consoleGuard }) => {
  await openTutorWith(page, '<style>body { outline: 1px solid red; }</style>')
  await expect.poll(() => consoleGuard.join('\n')).toMatch(/style-src/)
  // The guard would now fail this test in teardown; clear it so the self-test itself can pass.
  consoleGuard.length = 0
})

test('the console guard fails on a console error', async ({ page, consoleGuard }) => {
  await openTutorWith(page, '')
  await page.evaluate(() => console.error('deliberate error'))
  await expect.poll(() => consoleGuard.join('\n')).toContain('deliberate error')
  consoleGuard.length = 0
})
