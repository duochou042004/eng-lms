import type { Page } from '@playwright/test'
import { ANONYMOUS, STUDENT_STATE, TUTOR_STATE } from '../support/auth'
import { evidenceRecord, evidenceShot } from '../support/evidence'
import { expect, test } from '../support/fixtures'
import { accountPlace } from '../support/shell'

// T-M1.9 AC4 / AC6 N3 / AC10: the route loading state on a slow first load. The lazy route chunk (and /api/v1/meta) are
// held back, so the loading region is visible long enough to check and photograph; then the layout-shift total of the
// whole first load is measured (design-system §6 item 7: CLS ≤ 0.05). T-M1.16 AC1: the language-switcher skeleton is as
// wide as the switcher (≤ 8 px) and ends where it ends (≤ 1 px).
// T-M2.4: the landing case is now the sign-in page (the anonymous start page, with the switcher in its toolbar row);
// the shell cases run with the stored E2E tutor and student sessions.
// T-M2.11 (DEC-112 (5), packet scope 11 (b)): the shell's language switcher moved into the account section, so the shell
// case of T-M1.16 AC1 checks the skeleton of the top bar's end control against that control: the account menu button
// (tutor ≥ 1024 px, student ≥ 768 px), the tutor's menu button below 1024 px, nothing for the student below 768 px. The
// public-page case is unchanged.

const LOADING_LABEL = { vi: 'Đang tải trang', en: 'Loading the page' } as const
const PAGES = [
  {
    name: 'tutor',
    path: '/tutor',
    chunk: /\/assets\/TutorShell-[^/]+\.js$/,
    h1: 'Hôm nay',
    shell: true,
    state: TUTOR_STATE,
  },
  {
    name: 'student',
    path: '/student',
    chunk: /\/assets\/StudentShell-[^/]+\.js$/,
    h1: 'Trang chủ',
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

/** The top-bar control whose skeleton T-M1.16 AC1 compares, with its skeleton's test id, at this viewport. */
function endControl(page: Page, target: (typeof PAGES)[number]) {
  if (!target.shell)
    return { skeleton: 'route-loading-switcher', control: page.getByRole('radiogroup', { name: 'Ngôn ngữ' }) }
  const place = accountPlace(page, target.name === 'tutor' ? 'tutor' : 'student')
  if (place === 'popover')
    return {
      skeleton: 'route-loading-account',
      control: page.getByRole('banner').locator('button[aria-haspopup="dialog"]'),
    }
  if (place === 'drawer')
    return { skeleton: 'route-loading-menu', control: page.getByRole('button', { name: 'Mở điều hướng' }) }
  return null // the student's top bar below 768 px has no control (the bottom tabs hold More)
}
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
      // AC11 (d): the tutor sidebar skeleton (≥ 1024 px) runs to the bottom of the viewport, like the sidebar.
      const sidebar = region.getByTestId('route-loading-sidebar')
      if (await sidebar.count()) {
        const bottom = (await sidebar.boundingBox())!
        expect(
          Math.abs(bottom.y + bottom.height - page.viewportSize()!.height),
          'sidebar skeleton bottom',
        ).toBeLessThanOrEqual(1)
      }
      // T-M1.16 AC1: the language-switcher skeleton (public toolbar row) or the shell top bar's end control (T-M2.11).
      const end = endControl(page, target)
      const switcherSkeleton = end ? await region.getByTestId(end.skeleton).getByTestId('skeleton').boundingBox() : null
      await evidenceShot(page, testInfo, `route-loading-${target.name}-vi`)
      release()

      await expect(page.getByRole('heading', { level: 1, name: target.h1 })).toBeVisible()
      // The shells' workspace name (GET /api/v1/meta, delayed) has replaced its loading region.
      await expect(page.getByRole('status', { name: 'Đang tải thông tin không gian dạy học' })).toHaveCount(0)
      await page.evaluate(() => document.fonts.ready)
      const switcher = end ? await end.control.boundingBox() : null
      const cls = await layoutShiftTotal(page)
      const ac1 = end
        ? {
            control: end.skeleton.replace('route-loading-', ''),
            skeleton: switcherSkeleton,
            switcher,
            inlineSizeDeltaPx: round(Math.abs(switcher!.width - switcherSkeleton!.width)),
            inlineSizeLimitPx: 8,
            inlineEndDeltaPx: round(
              Math.abs(switcher!.x + switcher!.width - (switcherSkeleton!.x + switcherSkeleton!.width)),
            ),
            inlineEndLimitPx: 1,
          }
        : { control: 'none (no top-bar control at this viewport)' }
      await evidenceRecord(testInfo, `t-m1.16-ac1-switcher-${target.name}`, {
        viewport: page.viewportSize(),
        ...ac1,
        layoutShift: cls,
        clsLimit: 0.05,
      })
      if ('inlineSizeDeltaPx' in ac1) {
        expect(ac1.inlineSizeDeltaPx, 'switcher skeleton inline size vs the switcher').toBeLessThanOrEqual(8)
        expect(ac1.inlineEndDeltaPx, 'switcher skeleton inline end vs the switcher').toBeLessThanOrEqual(1)
      }
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
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
  })
})
