import axe from 'axe-core'
import { expect } from 'vitest'

/** Fails with a readable list when axe-core reports any violation in `container` (NFR-A11Y-01). */
export async function expectNoAxeViolations(container: Element) {
  const results = await axe.run(container, {
    // jsdom has no layout, so colour contrast is checked by scripts/contrast-check.mjs instead.
    rules: { 'color-contrast': { enabled: false } },
  })
  const summary = results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)
  expect(summary).toEqual([])
}
