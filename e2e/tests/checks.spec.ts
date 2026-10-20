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
})

test.describe('expectFocusNotLost', () => {
  test('fails after a button that removes itself', async ({ page }) => {
    await fixture(page, '<h1 tabindex="-1">Title</h1><button onclick="this.remove()">Remove me</button>')
    await page.getByRole('button', { name: 'Remove me' }).click()
    await expect(page.getByRole('button')).toHaveCount(0)
    await expect(expectFocusNotLost(page, SHORT)).rejects.toThrow(/focus lost/)
  })

  test('fails when focus stays inside an inert region', async ({ page }) => {
    await fixture(
      page,
      '<h1 tabindex="-1">Title</h1><div id="r"><button onclick="document.getElementById(\'r\').inert = true">Freeze</button></div>',
    )
    await page.getByRole('button', { name: 'Freeze' }).click()
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
