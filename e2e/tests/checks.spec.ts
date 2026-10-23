import type { Page } from '@playwright/test'
import {
  expectFocusNotLost,
  expectNoAxeViolations,
  expectNoMidWordBreak,
  expectSettledAccessible,
  lineCount,
} from '../support/checks'
import { expect, test } from '../support/fixtures'

// T-M2.19 AC2: each shared check fails on a page that breaks its rule and passes on a clean one. Static fixtures
// (`page.setContent`, no app); a failure is asserted with `rejects.toThrow()` under a short timeout, never `test.fail`.

const SHORT = { timeout: 1_000 }

/** A minimal page: a `lang`, a title and a landmark, so axe only judges what the fixture adds. */
const fixture = (page: Page, body: string, head = '') =>
  page.setContent(
    `<!doctype html><html lang="en"><head><title>Fixture</title><style>body { margin: 0; font: 16px/1.5 sans-serif; } ${head}</style></head><body><main>${body}</main></body></html>`,
  )

test.describe('expectNoMidWordBreak', () => {
  test('fails on a word forced across two lines', async ({ page }) => {
    await fixture(page, '<p id="t" style="inline-size: 4ch; overflow-wrap: anywhere">Nguyễnthịphương</p>')
    await expect(expectNoMidWordBreak(page.locator('#t'), SHORT)).rejects.toThrow(/words broken/)
  })

  test('fails on a word split across inline elements and forced across two lines', async ({ page }) => {
    await fixture(page, '<p id="t" style="inline-size: 4ch; overflow-wrap: anywhere">Ng<b>uyễnthị</b>phương</p>')
    await expect(expectNoMidWordBreak(page.locator('#t'), SHORT)).rejects.toThrow(/words broken/)
  })

  test('fails on a hidden element', async ({ page }) => {
    await fixture(page, '<p id="t" hidden>Nguyễn Văn An</p>')
    await expect(page.locator('#t')).toHaveCount(1)
    await expect(expectNoMidWordBreak(page.locator('#t'), SHORT)).rejects.toThrow(/visible/)
  })

  test('fails on an empty element', async ({ page }) => {
    await fixture(page, '<p id="t" style="block-size: 1em">   </p>')
    await expect(expectNoMidWordBreak(page.locator('#t'), SHORT)).rejects.toThrow(/has text/)
  })

  test('passes on a box where every word fits its line (wrapping between words only)', async ({ page }) => {
    await fixture(page, '<p id="t" style="inline-size: 8ch">Nguyễn Thị Phương Lan Anh</p>')
    expect(await lineCount(page.locator('#t')), 'the text wraps').toBeGreaterThan(1)
    await expectNoMidWordBreak(page.locator('#t'), SHORT)
  })

  // T-M2.20 AC5 (T-M2.19 QA-5): only rendered text is measured, and a <br> is a word boundary.
  test('passes on a box whose visible words fit and that holds a display: none child with text', async ({ page }) => {
    await fixture(
      page,
      '<p id="t" style="inline-size: 16ch">Nguyễn Văn An <span style="display: none">Chữ ẩn</span></p>',
    )
    await expectNoMidWordBreak(page.locator('#t'), SHORT)
  })

  test('still fails on a forced mid-word break beside a display: none child', async ({ page }) => {
    await fixture(
      page,
      '<p id="t" style="inline-size: 4ch; overflow-wrap: anywhere">Nguyễnthịphương <span style="display: none">Chữ ẩn</span></p>',
    )
    await expect(expectNoMidWordBreak(page.locator('#t'), SHORT)).rejects.toThrow(/words broken/)
  })

  test('passes on "one<br>two" laid out on two lines', async ({ page }) => {
    await fixture(page, '<p id="t">one<br>two</p>')
    expect(await lineCount(page.locator('#t')), 'two lines').toBe(2)
    await expectNoMidWordBreak(page.locator('#t'), SHORT)
  })

  test('still fails on "one<br>" followed by a word forced across two lines', async ({ page }) => {
    await fixture(page, '<p id="t" style="inline-size: 4ch; overflow-wrap: anywhere">one<br>Nguyễnthịphương</p>')
    await expect(expectNoMidWordBreak(page.locator('#t'), SHORT)).rejects.toThrow(/words broken/)
  })

  test('measures the text of a display: contents child (it renders: a forced break there fails)', async ({ page }) => {
    await fixture(
      page,
      '<p id="t" style="inline-size: 4ch; overflow-wrap: anywhere"><span style="display: contents">Nguyễnthịphương</span></p>',
    )
    await expect(expectNoMidWordBreak(page.locator('#t'), SHORT)).rejects.toThrow(/words broken/)
  })
})

test.describe('expectFocusNotLost', () => {
  test('fails after a button that removes itself', async ({ page }) => {
    await fixture(page, '<h1 tabindex="-1">Title</h1><button onclick="this.remove()">Remove me</button>')
    await page.getByRole('button', { name: 'Remove me' }).click()
    await expect(page.getByRole('button')).toHaveCount(0)
    await expect(expectFocusNotLost(page, SHORT)).rejects.toThrow(/focus lost/)
  })

  test('fails when focus is lost to body after an inert freeze (Chromium blurs it)', async ({ page }) => {
    await fixture(
      page,
      '<h1 tabindex="-1">Title</h1><div id="r"><button onclick="document.getElementById(\'r\').inert = true">Freeze</button></div>',
    )
    await page.getByRole('button', { name: 'Freeze' }).click()
    await expect(expectFocusNotLost(page, SHORT)).rejects.toThrow(/focus lost/)
  })

  test('fails after a button that disables itself', async ({ page }) => {
    await fixture(page, '<h1 tabindex="-1">Title</h1><button onclick="this.disabled = true">Disable me</button>')
    await page.getByRole('button', { name: 'Disable me' }).click()
    await expect(page.getByRole('button', { name: 'Disable me' })).toBeDisabled()
    await expect(expectFocusNotLost(page, SHORT)).rejects.toThrow(/focus lost/)
  })

  test('fails after a button that hides itself (display: none)', async ({ page }) => {
    await fixture(page, '<h1 tabindex="-1">Title</h1><button onclick="this.style.display = \'none\'">Hide me</button>')
    await page.getByRole('button', { name: 'Hide me' }).click()
    await expect(page.locator('button')).toBeHidden()
    await expect(expectFocusNotLost(page, SHORT)).rejects.toThrow(/focus lost/)
  })

  // T-M2.20 AC6 (T-M2.19 QA-8): a control that turned visibility: hidden holds no visible focus. The Chromium of
  // Playwright 1.64 already moves focus to body here (so the old helper failed too); the visibilityProperty test covers
  // an engine that keeps activeElement on the hidden control.
  test('fails after a button that hides itself (visibility: hidden)', async ({ page }) => {
    await fixture(
      page,
      '<h1 tabindex="-1">Title</h1><button onclick="this.style.visibility = \'hidden\'">Hide me</button>',
    )
    await page.getByRole('button', { name: 'Hide me' }).click()
    await expect(page.locator('button')).toBeHidden()
    await expect(expectFocusNotLost(page, SHORT)).rejects.toThrow(/focus lost/)
  })

  test('passes after a button that moves focus to a heading before its removal', async ({ page }) => {
    await fixture(
      page,
      '<h1 tabindex="-1">Title</h1><button onclick="document.querySelector(\'h1\').focus(); this.remove()">Remove me</button>',
    )
    await page.getByRole('button', { name: 'Remove me' }).click()
    await expect(page.getByRole('button')).toHaveCount(0)
    await expectFocusNotLost(page, SHORT)
    await expect(page.getByRole('heading', { name: 'Title' })).toBeFocused()
  })
})

test.describe('expectSettledAccessible', () => {
  // A grey that passes on white at full opacity (#595959, 7:1) and fails at 0.3; another that always fails (#aaa, 2.3:1).
  const settle = (ms: number) =>
    `<script>setTimeout(() => document.getElementById('t').removeAttribute('data-entering'), ${ms})</script>`

  test('(a) waits for data-entering to go, then fails on the low contrast left behind', async ({ page }) => {
    await fixture(page, `<p id="t" data-entering style="color: #aaa">Low contrast once settled</p>${settle(300)}`)
    await expect(expectSettledAccessible(page)).rejects.toThrow(/color-contrast/)
    await expect(page.locator('[data-entering]')).toHaveCount(0)
  })

  // A longer fade, so the immediate axe run below is surely taken mid-fade.
  const fading = `<p id="t" data-entering style="color: #595959">Readable once settled</p>${settle(1_500)}`
  const fadeCss = '[data-entering] { opacity: 0.3; }'

  test('(b) passes on an element that fails contrast only while entering', async ({ page }) => {
    await fixture(page, fading, fadeCss)
    await expectSettledAccessible(page)
  })

  test('(b) the same fixture fails when axe runs at once (mid-fade)', async ({ page }) => {
    await fixture(page, fading, fadeCss)
    await expect(page.locator('[data-entering]')).toHaveCount(1)
    await expect(expectNoAxeViolations(page)).rejects.toThrow(/color-contrast/)
  })

  test('(c) fails on a page wider than the viewport', async ({ page }) => {
    await fixture(page, '<p style="inline-size: calc(100vw + 200px)">Too wide</p>')
    await expect(expectSettledAccessible(page, SHORT)).rejects.toThrow(/horizontal scroll/)
  })
})
