import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

/** WCAG 2.2 AA (accessibility.md): no axe violations on the current page. */
export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(
    results.violations.map((v) => `${v.id} (${v.impact}): ${v.help} [${v.nodes.map((n) => n.target.join(' ')).join(', ')}]`),
    'axe violations',
  ).toEqual([])
}

/**
 * responsive-standards §3.1: the page never scrolls horizontally. Compared against `documentElement.clientWidth` (the
 * layout viewport), not `window.innerWidth`: with mobile emulation (`isMobile`) Chromium widens `innerWidth` to the
 * content, which would hide an overflow (T-M1.6 QA F1).
 */
export async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, viewportWidth } = await page.evaluate(() => ({
    scrollWidth: document.scrollingElement?.scrollWidth ?? 0,
    viewportWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth, `horizontal scroll: scrollWidth ${scrollWidth} > viewport width ${viewportWidth}`).toBeLessThanOrEqual(
    viewportWidth,
  )
}

/** How many line boxes a cell's or element's text takes. */
export const lineCount = (target: Locator) =>
  target.evaluate((el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size
  })

/** No word of the element's text (split at white space) lies on more than one line box; callers exclude usernames, emails, URLs and phones. */
export async function expectNoMidWordBreak(target: Locator, { timeout }: { timeout?: number } = {}) {
  await expect(target, 'the element to measure is visible').toBeVisible({ timeout })
  const { text, broken } = await target.evaluate(async (el) => {
    await document.fonts.ready
    // The element's text nodes with their offsets in the joined text, so a word split across inline elements is one word.
    const nodes: Array<{ node: Text; start: number }> = []
    let joined = ''
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      nodes.push({ node, start: joined.length })
      joined += node.data
    }
    const at = (offset: number, end: boolean) => {
      const hit = nodes.findLast((n) => (end ? n.start < offset : n.start <= offset))!
      return [hit.node, offset - hit.start] as const
    }
    const broken: string[] = []
    for (const match of joined.matchAll(/\S+/g)) {
      const range = document.createRange()
      range.setStart(...at(match.index, false))
      range.setEnd(...at(match.index + match[0].length, true))
      const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size
      if (lines !== 1) broken.push(`"${match[0]}" on ${lines} line boxes`)
    }
    return { text: joined.trim(), broken }
  })
  expect(text, 'the element has text').not.toBe('')
  expect(broken, `words broken across lines in "${text}"`).toEqual([])
}

/** Focus did not end on `body`, `html`, nothing or inside an `inert` region after an action (a transient `body` while a dialog closes is fine). */
export async function expectFocusNotLost(page: Page, { timeout = 5_000 }: { timeout?: number } = {}) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const active = document.activeElement
          if (!active || active === document.body || active === document.documentElement) return 'lost'
          return active.closest('[inert]') ? 'lost' : 'kept'
        }),
      { message: 'focus lost to body (or inside an inert region)', timeout },
    )
    .toBe('kept')
}

/** Once no element is entering or exiting (a fade measured mid-way fails contrast): no axe violation and no horizontal scroll. */
export async function expectSettledAccessible(page: Page, { timeout }: { timeout?: number } = {}) {
  await expect(page.locator('[data-entering], [data-exiting]'), 'transitions settled').toHaveCount(0, { timeout })
  await expectNoAxeViolations(page)
  await expectNoHorizontalScroll(page)
}
