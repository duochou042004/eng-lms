import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

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
