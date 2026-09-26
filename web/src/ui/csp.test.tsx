/// <reference types="node" />
// Vitest stubs CSS imports (even ?raw), so global.css is read from disk (cwd: web/).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'

// CSP style-src 'self' (security.md §5) blocks <style> elements injected at runtime. React Aria's usePress injects one
// unless an element with its id already exists, so index.html pre-registers the id and global.css carries the rule
// (DEC-052). React Aria skips the injection when NODE_ENV is 'test', so the behaviour itself is checked in a browser
// (evidence/T-M1.5, and the T-M1.6 smoke fails on console CSP errors); this test pins the two halves of the fix.
describe('CSP: no runtime <style> injection', () => {
  it('index.html pre-registers the id React Aria checks', () => {
    expect(indexHtml).toContain('<template id="react-aria-pressable-style"></template>')
  })

  it('global.css ships the pressable rule React Aria would have injected', () => {
    expect(readFileSync('src/ui/global.css', 'utf8')).toMatch(
      /:where\(\[data-react-aria-pressable\]\)\s*\{\s*touch-action: pan-x pan-y pinch-zoom;/,
    )
  })
})
