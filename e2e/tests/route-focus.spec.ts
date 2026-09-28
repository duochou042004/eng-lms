import type { Locator, Page } from '@playwright/test'
import { evidenceRecord, evidenceShot } from '../support/evidence'
import { expect, test } from '../support/fixtures'
import { StepCounter } from '../support/steps'

// T-M1.9: route focus and titles (AC1), 44 px targets (AC6) and the UX step budgets (AC10) at the mandatory viewports.

const COPY = {
  vi: {
    landing: 'Không gian dạy học',
    tutor: 'Không gian gia sư',
    student: 'Trang của học viên',
    notFound: 'Không tìm thấy trang',
    toTutor: 'Khu vực gia sư',
    toStudent: 'Khu vực học viên',
    home: 'Về trang đầu',
    skip: 'Chuyển đến nội dung chính',
    language: 'Ngôn ngữ',
  },
  en: {
    landing: 'Teaching workspace',
    tutor: 'Tutor workspace',
    student: 'Student home',
    notFound: 'Page not found',
    toTutor: 'Tutor area',
    toStudent: 'Student area',
    home: 'Go to the start page',
    skip: 'Skip to main content',
    language: 'Language',
  },
} as const
type Lang = keyof typeof COPY

const h1 = (page: Page, name: string) => page.getByRole('heading', { level: 1, name })

async function expectFocusedPage(page: Page, title: string) {
  await expect(h1(page, title)).toBeFocused()
  await expect(page).toHaveTitle(`${title} · Eng-LMS`)
}

async function expectBodyFocused(page: Page) {
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)
}

async function useLanguage(page: Page, lang: Lang) {
  await page.addInitScript((l) => {
    if (!sessionStorage.getItem('t-m1.9-locale-set')) {
      localStorage.setItem('englms.locale', l)
      sessionStorage.setItem('t-m1.9-locale-set', '1')
    }
  }, lang)
}

for (const lang of ['vi', 'en'] as const) {
  const c = COPY[lang]

  test(`[${lang}] client-side navigation moves focus to the h1 and sets the title; a first load does not`, async ({
    page,
  }) => {
    await useLanguage(page, lang)
    await page.goto('/')
    await expect(h1(page, c.landing)).toBeVisible()
    await expect(page).toHaveTitle(`${c.landing} · Eng-LMS`)
    await expectBodyFocused(page)

    await page.getByRole('link', { name: c.toTutor }).click()
    await expectFocusedPage(page, c.tutor)
    await page.goBack()
    await expectFocusedPage(page, c.landing)
    await page.getByRole('link', { name: c.toStudent }).click()
    await expectFocusedPage(page, c.student)
    await page.goBack()
    await expectFocusedPage(page, c.landing)

    // A reload of a page first reached by client navigation is a first load: focus stays on body.
    await page.getByRole('link', { name: c.toTutor }).click()
    await expectFocusedPage(page, c.tutor)
    await page.reload()
    await expect(h1(page, c.tutor)).toBeVisible()
    await expect(page).toHaveTitle(`${c.tutor} · Eng-LMS`)
    await expectBodyFocused(page)

    // Any → 404: a fresh 404, a link to the start page, then browser back to the 404.
    await page.goto('/does-not-exist')
    await expect(h1(page, c.notFound)).toBeVisible()
    await expect(page).toHaveTitle(`${c.notFound} · Eng-LMS`)
    await expectBodyFocused(page)
    await page.getByRole('link', { name: c.home }).click()
    await expectFocusedPage(page, c.landing)
    await page.goBack()
    await expectFocusedPage(page, c.notFound)
  })

  test(`[${lang}] a language change updates the title without a navigation and keeps focus on the switcher`, async ({
    page,
  }) => {
    await useLanguage(page, lang)
    await page.goto('/tutor')
    await expect(page).toHaveTitle(`${c.tutor} · Eng-LMS`)
    const other: Lang = lang === 'vi' ? 'en' : 'vi'
    const otherName = other === 'en' ? 'English' : 'Tiếng Việt'
    await page.getByRole('radiogroup', { name: c.language }).getByRole('radio', { name: otherName }).click()
    await expect(page).toHaveTitle(`${COPY[other].tutor} · Eng-LMS`)
    await expect(page.locator('html')).toHaveAttribute('lang', other)
    // The group's name is now in the other language; focus stayed on the activated segment (no jump to the h1).
    const segment = page.getByRole('radiogroup', { name: COPY[other].language }).getByRole('radio', { name: otherName })
    await expect(segment).toBeFocused()
    await expect(segment).toBeChecked()
  })
}

async function blockSize(locator: Locator) {
  const box = await locator.boundingBox()
  expect(box, 'element has a layout box').not.toBeNull()
  return Math.round(box!.height * 100) / 100
}

test('targets measure at least 44 px block size: skip link, shell home link, 404 link, switcher segments', async ({
  page,
}, testInfo) => {
  const sizes: Record<string, number> = {}
  await page.goto('/tutor')
  await expect(h1(page, COPY.vi.tutor)).toBeVisible()
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: COPY.vi.skip })
  await expect(skip).toBeFocused()
  sizes.skipLink = await blockSize(skip)
  sizes.shellHomeLink = await blockSize(page.getByRole('banner').getByRole('link', { name: 'Eng-LMS' }))
  for (const name of ['Tiếng Việt', 'English']) {
    sizes[`switcherSegment:${name}`] = await blockSize(page.getByRole('radio', { name }))
  }
  await page.goto('/does-not-exist')
  sizes.notFoundHomeLink = await blockSize(page.getByRole('link', { name: COPY.vi.home }))
  await evidenceRecord(testInfo, 'ac6-target-sizes', { viewport: page.viewportSize(), minimum: 44, sizes })
  for (const [name, size] of Object.entries(sizes)) expect(size, name).toBeGreaterThanOrEqual(44)
})

test.describe('UX step budgets (T-M1.9 design notes)', () => {
  test('switch the language from any page: 1 step (pointer), 1 step (keyboard)', async ({ page }, testInfo) => {
    const record: Record<string, number> = {}
    for (const path of ['/', '/tutor', '/student']) {
      await page.goto(path)
      const steps = new StepCounter()
      await steps.step('activate the "English" segment', () => page.getByRole('radio', { name: 'English' }).click())
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      steps.expectAtMost(1)
      record[`pointer ${path}`] = steps.count
      await page.evaluate(() => localStorage.clear())
    }
    // Keyboard on the landing page (the switcher is its first Tab stop): Tab into the group, arrow, Space.
    await page.goto('/')
    const steps = new StepCounter()
    await steps.step('Tab into the group, ArrowRight, Space', async () => {
      await page.keyboard.press('Tab')
      await expect(page.getByRole('radio', { name: 'Tiếng Việt' })).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(page.getByRole('radio', { name: 'English' })).toBeFocused()
      await page.keyboard.press('Space')
    })
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('radio', { name: 'English' })).toBeChecked()
    steps.expectAtMost(1)
    record['keyboard /'] = steps.count
    await evidenceRecord(testInfo, 'steps-switch-language', { viewport: page.viewportSize(), budget: 1, steps: record })
  })

  test('reach the main content: 1 step on a fresh shell load, 0 on landing/404, 0 after a client-side navigation', async ({
    page,
  }, testInfo) => {
    const record: Record<string, number> = {}
    for (const path of ['/tutor', '/student']) {
      await page.goto(path)
      await expect(page.getByRole('main')).toBeVisible()
      const steps = new StepCounter()
      await steps.step('Tab to the skip link, Enter', async () => {
        await page.keyboard.press('Tab')
        await expect(page.getByRole('link', { name: COPY.vi.skip })).toBeFocused()
        await page.keyboard.press('Enter')
      })
      await expect(page.getByRole('main')).toBeFocused()
      steps.expectAtMost(1)
      record[`fresh ${path}`] = steps.count
    }
    for (const path of ['/', '/does-not-exist']) {
      await page.goto(path)
      await expect(page.getByRole('main')).toBeVisible()
      const steps = new StepCounter()
      // No step: the first Tab stop is already inside main (no header before it).
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('main'))).toBe(true)
      steps.expectAtMost(0)
      record[`fresh ${path}`] = steps.count
    }
    // Keyboard-only: Tab to the "tutor area" link, Enter. Focus lands on the new page's h1 (0 further steps).
    await page.goto('/')
    const link = page.getByRole('link', { name: COPY.vi.toTutor })
    for (let i = 0; i < 5 && !(await link.evaluate((el) => el === document.activeElement)); i++)
      await page.keyboard.press('Tab')
    await expect(link).toBeFocused()
    await page.keyboard.press('Enter')
    const steps = new StepCounter()
    await expect(h1(page, COPY.vi.tutor)).toBeFocused()
    expect(await page.evaluate(() => !!document.activeElement?.closest('main'))).toBe(true)
    steps.expectAtMost(0)
    await evidenceShot(page, testInfo, 'focus-h1-after-keyboard-navigation-vi')
    record['after client-side navigation'] = steps.count
    await evidenceRecord(testInfo, 'steps-reach-main', {
      viewport: page.viewportSize(),
      budgets: { freshShell: 1, freshOther: 0, afterNavigation: 0 },
      steps: record,
    })
  })
})
