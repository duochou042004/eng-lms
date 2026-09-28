import type { Page } from '@playwright/test'
import { expectNoAxeViolations, expectNoHorizontalScroll } from '../support/checks'
import { expect, LATE_ERROR_SETTLE_MS, test } from '../support/fixtures'

// Self-tests of the harness guards (T-M1.6 AC4): each one must FAIL on a page broken on purpose. The page is the real
// served /tutor with the real CSP header; only this test's copy of the HTML is altered (nothing ships in the bundle).
// Browser-level guards run on one project; the overflow guard depends on the viewport emulation (isMobile widens
// window.innerWidth, QA F1), so it also runs on the mobile/touch mandatory projects.
const OVERFLOW_PROJECTS = ['phone-small', 'tablet', 'laptop']
test.beforeEach(({ page: _page }, testInfo) => {
  const overflowTest = testInfo.title.startsWith('the layout check')
  const runsHere = overflowTest ? OVERFLOW_PROJECTS.includes(testInfo.project.name) : testInfo.project.name === 'laptop'
  test.skip(!runsHere, 'not a target project for this guard self-test')
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

for (const extra of [40, 3000]) {
  test(`the layout check fails on horizontal overflow (+${extra}px)`, async ({ page }) => {
    await openTutorWith(page, '')
    await page.evaluate((px) => {
      const wide = document.createElement('div')
      wide.style.width = `${document.documentElement.clientWidth + px}px`
      wide.textContent = 'overflow'
      document.querySelector('main')?.append(wide)
    }, extra)
    await expect(expectNoHorizontalScroll(page)).rejects.toThrow(/horizontal scroll/)
  })
}

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

test('the console guard also watches a second page of the same context', async ({ context, consoleGuard }) => {
  const second = await context.newPage()
  await second.goto('/student')
  await second.evaluate(() => console.error('error in a second page'))
  await expect.poll(() => consoleGuard.join('\n')).toContain('error in a second page')
  consoleGuard.length = 0
})

// T-M1.6 QA F3 / DEC-058 (QA probe P15): an error raised 300 ms after the body's last action must fail the test. The
// guard asserts in its teardown, after the body, so this self-test is an expected failure: Playwright reports it as
// passed only if the guard fails it. The body checks that nothing was logged yet, so the failure can only be the late
// error. Without the settle (and without the on-failure screenshot that happens to delay teardown) this test "unexpectedly
// passes" and the run fails: evidence/T-M1.9/ac9-late-error.log.
test('the console guard fails on an error raised 300 ms after the test body ends (expected failure)', async ({
  page,
  consoleGuard,
}) => {
  test.fail(true, 'expected: the console guard fails this test in teardown with "console.error: late"')
  expect(LATE_ERROR_SETTLE_MS).toBeLessThanOrEqual(500)
  await openTutorWith(page, '')
  await page.evaluate(() => {
    setTimeout(() => console.error('late'), 300)
  })
  expect(consoleGuard).toEqual([])
})
