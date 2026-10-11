import type { Page } from '@playwright/test'
import { ANONYMOUS, STUDENT_STATE, TUTOR_STATE } from '../support/auth'
import { evidenceRecord, evidenceShot } from '../support/evidence'
import { expect, test } from '../support/fixtures'

// T-M1.9 AC4 / AC6 N3 / AC10: the route loading state on a slow first load. The lazy route chunk (and /api/v1/meta) are
// held back, so the loading region is visible long enough to check and photograph; then the layout-shift total of the
// whole first load is measured (design-system §6 item 7: CLS ≤ 0.05). T-M1.16 AC1: the language-switcher skeleton is as
// wide as the switcher (≤ 8 px) and ends where it ends (≤ 1 px).
// T-M2.4: the landing case is now the sign-in page (the anonymous start page, with the switcher in its toolbar row);
// the shell cases run with the stored E2E tutor and student sessions.

const LOADING_LABEL = { vi: 'Đang tải trang', en: 'Loading the page' } as const
const PAGES = [
  {
    name: 'tutor',
    path: '/tutor',
    chunk: /\/assets\/TutorShell-[^/]+\.js$/,
    h1: 'Không gian gia sư',
    shell: true,
    state: TUTOR_STATE,
  },
  {
    name: 'student',
    path: '/student',
    chunk: /\/assets\/StudentShell-[^/]+\.js$/,
    h1: 'Trang của học viên',
    shell: true,
    state: STUDENT_STATE,
  },
  {
    name: 'login',
    path: '/login',
    chunk: /\/assets\/LoginPage-[^/]+\.js$/,
    h1: 'Đăng nhập',
    shell: false,
    state: ANONYMOUS,
  },
] as const
const DELAY_MS = 700
const round = (n: number) => Math.round(n * 100) / 100

/** Delays matching requests by DELAY_MS, or until `release()` when held. */
async function slowDown(page: Page, pattern: RegExp | string, hold = false) {
  let release: () => void = () => {}
  const released = new Promise<void>((resolve) => (release = resolve))
  await page.route(pattern, async (route) => {
    await (hold ? released : new Promise((resolve) => setTimeout(resolve, DELAY_MS)))
    await route.continue()
  })
  return release
}

/** Sum of all layout-shift entries without recent input (an upper bound of CLS). */
async function layoutShiftTotal(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ total: number; entries: number }>((resolve) => {
        let total = 0
        let entries = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as Array<
            PerformanceEntry & { value: number; hadRecentInput: boolean }
          >) {
            if (!entry.hadRecentInput) {
              total += entry.value
              entries++
            }
          }
        }).observe({ type: 'layout-shift', buffered: true })
        setTimeout(() => resolve({ total, entries }), 250)
      }),
  )
}

for (const target of PAGES) {
  test.describe(() => {
    test.use({ storageState: target.state })
    test(`${target.name}: the loading region is busy at once, shows its skeleton later, and the first load does not shift (CLS)`, async ({
      page,
    }, testInfo) => {
      const release = await slowDown(page, target.chunk, true)
      await slowDown(page, '**/api/v1/meta')
      await page.goto(target.path, { waitUntil: 'commit' })
      const region = page.getByRole('status', { name: LOADING_LABEL.vi })
      await expect(region).toHaveAttribute('aria-busy', 'true')
      const topBar = page.getByTestId('route-loading-topbar')
      if (target.shell) await expect(topBar).toHaveCount(1)
      else await expect(topBar).toHaveCount(0)
      // After the 150 ms delay the skeletons are visible (DelayedSkeleton sets data-shown).
      await expect(region.locator('[data-shown]')).toHaveCount(1)
      await expect(region.getByTestId('skeleton').first()).toBeVisible()
      const box = await region.boundingBox()
      // T-M1.16 AC1: the language-switcher skeleton (landing toolbar row or shell header).
      const switcherSkeleton = await region.getByTestId('route-loading-switcher').getByTestId('skeleton').boundingBox()
      await evidenceShot(page, testInfo, `route-loading-${target.name}-vi`)
      release()

      await expect(page.getByRole('heading', { level: 1, name: target.h1 })).toBeVisible()
      // The shells' workspace name (GET /api/v1/meta, delayed) has replaced its loading region.
      await expect(page.getByRole('status', { name: 'Đang tải thông tin không gian dạy học' })).toHaveCount(0)
      await page.evaluate(() => document.fonts.ready)
      const switcher = await page.getByRole('radiogroup', { name: 'Ngôn ngữ' }).boundingBox()
      const cls = await layoutShiftTotal(page)
      const ac1 = {
        skeleton: switcherSkeleton,
        switcher,
        inlineSizeDeltaPx: round(Math.abs(switcher!.width - switcherSkeleton!.width)),
        inlineSizeLimitPx: 8,
        inlineEndDeltaPx: round(
          Math.abs(switcher!.x + switcher!.width - (switcherSkeleton!.x + switcherSkeleton!.width)),
        ),
        inlineEndLimitPx: 1,
      }
      await evidenceRecord(testInfo, `t-m1.16-ac1-switcher-${target.name}`, {
        viewport: page.viewportSize(),
        ...ac1,
        layoutShift: cls,
        clsLimit: 0.05,
      })
      expect(ac1.inlineSizeDeltaPx, 'switcher skeleton inline size vs the switcher').toBeLessThanOrEqual(8)
      expect(ac1.inlineEndDeltaPx, 'switcher skeleton inline end vs the switcher').toBeLessThanOrEqual(1)
      await evidenceRecord(testInfo, `ac4-cls-${target.name}`, {
        viewport: page.viewportSize(),
        heldChunkUntilScreenshot: true,
        metaDelayMs: DELAY_MS,
        loadingRegionBox: box,
        layoutShift: cls,
        limit: 0.05,
      })
      expect(cls.total, 'layout shift total of the first load').toBeLessThanOrEqual(0.05)
    })
  })
}

test.describe(() => {
  test.use({ storageState: TUTOR_STATE })
  test('the loading region in English', async ({ page }, testInfo) => {
    await page.addInitScript(() => localStorage.setItem('englms.locale', 'en'))
    const release = await slowDown(page, PAGES[0].chunk, true)
    await page.goto('/tutor', { waitUntil: 'commit' })
    const region = page.getByRole('status', { name: LOADING_LABEL.en })
    await expect(region.locator('[data-shown]')).toHaveCount(1)
    await evidenceShot(page, testInfo, 'route-loading-tutor-en')
    release()
    await expect(page.getByRole('heading', { level: 1, name: 'Tutor workspace' })).toBeVisible()
  })
})
