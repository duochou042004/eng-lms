// Durations only from the motion tokens (T-M2.19 AC5): the project's stylelint config rejects a raw `ms`/`s` in
// transitions, animations and module custom properties, and accepts a token. Runs in the default jsdom environment (the
// shared setup needs `window`); stylelint's Node API works there.
import { join } from 'node:path'
import stylelint from 'stylelint'
import { describe, expect, it } from 'vitest'

const configFile = join(import.meta.dirname, '..', 'stylelint.config.mjs')
const moduleFile = join(import.meta.dirname, '..', 'src', 'ui', 'Sample.module.css')

/** The rule ids stylelint reports for `code` linted as a module (not tokens.css). */
async function lint(code) {
  const { results } = await stylelint.lint({ code, codeFilename: moduleFile, configFile })
  return results[0].warnings.map((w) => w.rule)
}

describe('stylelint: motion durations come from tokens', () => {
  it('rejects a raw duration in a transition', async () => {
    expect(await lint('.a {\n  transition: opacity 120ms;\n}\n')).toContain('declaration-property-unit-disallowed-list')
  })

  it('rejects a raw duration in an animation', async () => {
    expect(await lint('.a {\n  animation: spin 1s linear infinite;\n}\n')).toContain(
      'declaration-property-unit-disallowed-list',
    )
  })

  it('rejects a duration in a module custom property', async () => {
    expect(await lint('.a {\n  --x: 1s;\n}\n')).toContain('declaration-property-unit-disallowed-list')
  })

  it('accepts a motion token', async () => {
    expect(await lint('.a {\n  transition: opacity var(--motion-duration);\n}\n')).toEqual([])
  })
})
