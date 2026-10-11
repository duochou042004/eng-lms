import { ANONYMOUS, STUDENT_STATE, TUTOR_STATE } from '../support/auth'
import { expectNoAxeViolations, expectNoHorizontalScroll } from '../support/checks'
import { evidenceShot } from '../support/evidence'
import { expect, test } from '../support/fixtures'

// T-M1.6 smoke: the packaged app serves every shell page same-origin, in vi (default) and en, accessibly, without
// horizontal scroll and without console/CSP errors (the console guard is automatic).
// T-M2.4: the landing page is gone; its case is the sign-in page (the anonymous start page). The shells run signed in
// (the stored E2E tutor and student sessions).
const PAGES = [
  { name: 'login', path: '/login', vi: 'Đăng nhập', en: 'Sign in', switcher: true, state: ANONYMOUS },
  { name: 'tutor', path: '/tutor', vi: 'Không gian gia sư', en: 'Tutor workspace', switcher: true, state: TUTOR_STATE },
  {
    name: 'student',
    path: '/student',
    vi: 'Trang của học viên',
    en: 'Student home',
    switcher: true,
    state: STUDENT_STATE,
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
        // The language switcher is a SegmentedControl: a radiogroup of radio segments with aria-checked (T-M1.9 AC3).
        const switcher = page.getByRole('radiogroup', { name: 'Ngôn ngữ' })
        await expect(switcher.getByRole('radio', { name: 'Tiếng Việt' })).toBeChecked()
        await expect(switcher.getByRole('radio', { name: 'English' })).not.toBeChecked()
        await switcher.getByRole('radio', { name: 'English' }).click()
      } else {
        await page.evaluate(() => localStorage.setItem('englms.locale', 'en'))
        await page.reload()
      }
      await expect(page.getByRole('heading', { level: 1, name: target.en })).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      if (target.switcher) {
        const switcher = page.getByRole('radiogroup', { name: 'Language' })
        await expect(switcher.getByRole('radio', { name: 'English' })).toBeChecked()
        await expect(switcher.getByRole('radio', { name: 'Tiếng Việt' })).not.toBeChecked()
        await expect(switcher.getByRole('radio', { name: 'English' })).toHaveAttribute('lang', 'en')
        // The choice survives a reload (localStorage, T-M1.3 AC5).
        await page.reload()
        await expect(page.getByRole('heading', { level: 1, name: target.en })).toBeVisible()
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
  { path: '/tutor', heading: 'Không gian gia sư', state: TUTOR_STATE },
  { path: '/student/x', heading: 'Trang của học viên', state: STUDENT_STATE },
]) {
  test.describe(() => {
    test.use({ storageState: deepLink.state })
    test(`a deep link survives a reload: ${deepLink.path} (same-origin SPA fallback)`, async ({ page }) => {
      const response = await page.goto(deepLink.path)
      expect(response?.status()).toBe(200)
      await page.reload()
      await expect(page.getByRole('heading', { level: 1, name: deepLink.heading })).toBeVisible()
    })
  })
}
