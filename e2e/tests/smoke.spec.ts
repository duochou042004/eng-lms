import { expectNoAxeViolations, expectNoHorizontalScroll } from '../support/checks'
import { evidenceShot } from '../support/evidence'
import { expect, test } from '../support/fixtures'

// T-M1.6 smoke: the packaged app serves every shell page same-origin, in vi (default) and en, accessibly, without
// horizontal scroll and without console/CSP errors (the console guard is automatic).
const PAGES = [
  { name: 'landing', path: '/', vi: 'Không gian dạy học', en: 'Teaching workspace', switcher: true },
  { name: 'tutor', path: '/tutor', vi: 'Không gian gia sư', en: 'Tutor workspace', switcher: true },
  { name: 'student', path: '/student', vi: 'Trang của học viên', en: 'Student home', switcher: true },
  // The not-found page has no language switcher: English comes from the stored choice (englms.locale).
  { name: 'not-found', path: '/does-not-exist', vi: 'Không tìm thấy trang', en: 'Page not found', switcher: false },
] as const

for (const target of PAGES) {
  test(`${target.name} renders in vi and en`, async ({ page }, testInfo) => {
    await page.goto(target.path)
    await expect(page.getByRole('heading', { level: 1, name: target.vi })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
    await expectNoAxeViolations(page)
    await expectNoHorizontalScroll(page)
    await evidenceShot(page, testInfo, `${target.name}-vi`)

    if (target.switcher) {
      await page.getByRole('button', { name: 'English' }).click()
    } else {
      await page.evaluate(() => localStorage.setItem('englms.locale', 'en'))
      await page.reload()
    }
    await expect(page.getByRole('heading', { level: 1, name: target.en })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expectNoAxeViolations(page)
    await expectNoHorizontalScroll(page)
    await evidenceShot(page, testInfo, `${target.name}-en`)
  })
}

test('a deep link survives a reload (same-origin SPA fallback)', async ({ page }) => {
  const response = await page.goto('/student/x')
  expect(response?.status()).toBe(200)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Trang của học viên' })).toBeVisible()
})
