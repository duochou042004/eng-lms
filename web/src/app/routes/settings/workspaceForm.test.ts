import { describe, expect, it } from 'vitest'
import { mapWorkspaceErrors, toWorkspaceRequest, workspaceSchema } from './workspaceForm'

const saved = { displayName: 'Eng-LMS', defaultLocale: 'vi', defaultTimeZone: 'Asia/Ho_Chi_Minh' }
const issue = (displayName: string) =>
  workspaceSchema(saved.displayName)
    .safeParse({ ...saved, displayName })
    .error?.issues.map((i) => i.message) ?? []

describe('workspaceForm', () => {
  it('the request carries version and only the changed properties (the name trimmed); nothing changed → null', () => {
    expect(toWorkspaceRequest(saved, saved, 3)).toBeNull()
    expect(toWorkspaceRequest(saved, { ...saved, displayName: '  Eng-LMS ' }, 3)).toBeNull()
    expect(toWorkspaceRequest(saved, { ...saved, displayName: ' Lớp ' }, 3)).toEqual({ version: 3, displayName: 'Lớp' })
    expect(toWorkspaceRequest(saved, { ...saved, displayName: '\u00A0Lớp\u202F' }, 3)).toEqual({
      version: 3,
      displayName: 'Lớp',
    })
    expect(toWorkspaceRequest(saved, { ...saved, defaultLocale: 'en', defaultTimeZone: 'UTC' }, 0)).toEqual({
      version: 0,
      defaultLocale: 'en',
      defaultTimeZone: 'UTC',
    })
  })

  it.each([
    ['', 'REQUIRED'],
    ['   ', 'REQUIRED'],
    ['\u00A0', 'REQUIRED'],
    ['\u3000 ', 'REQUIRED'],
    ['a'.repeat(121), 'TOO_LONG'],
    ['a\u0007b', 'INVALID_CHARACTER'],
    ['ab\n', 'INVALID_CHARACTER'],
    ['a\u007fb', 'INVALID_CHARACTER'],
    ['a\u0085b', 'INVALID_CHARACTER'],
    ['a\u200Bb', 'INVALID_CHARACTER'],
    ['a\u200Fb', 'INVALID_CHARACTER'],
    ['a\u202Ab', 'INVALID_CHARACTER'],
    ['a\u2066b', 'INVALID_CHARACTER'],
    ['a\uFEFFb', 'INVALID_CHARACTER'],
    ['a\u2028b', 'INVALID_CHARACTER'],
    ['a\u00ADb', 'INVALID_CHARACTER'],
    ['a\u{E0041}b', 'INVALID_CHARACTER'],
  ])('the name %j is refused with %s', (value, code) => {
    expect(issue(value)).toContain(`workspace.errors.displayName.${code}`)
  })

  it('accepts 120 code points, diacritics and astral characters counted once', () => {
    expect(issue('ệ'.repeat(120))).toEqual([])
    expect(issue('😀'.repeat(120))).toEqual([])
    expect(issue('a‐b')).toEqual([])
    expect(issue(`\u00A0${'a'.repeat(120)}\u202F`)).toEqual([])
  })

  // T-M2.33 scope 8: a stored name that breaks the rule (saved before it) is checked only once it is edited.
  it('checks the character rule only on a changed name', () => {
    const stored = 'Lớp\u2028Lan'
    const issues = (displayName: string) =>
      workspaceSchema(stored)
        .safeParse({ ...saved, displayName })
        .error?.issues.map((i) => i.message) ?? []
    expect(issues(stored)).toEqual([])
    expect(
      toWorkspaceRequest({ ...saved, displayName: stored }, { ...saved, displayName: stored, defaultLocale: 'en' }, 1),
    ).toEqual({
      version: 1,
      defaultLocale: 'en',
    })
    expect(issues(`${stored}!`)).toEqual(['workspace.errors.displayName.INVALID_CHARACTER'])
  })

  it('maps the name and zone codes to fields; the locale and version go to the generic line', () => {
    expect(
      mapWorkspaceErrors([
        { field: 'displayName', code: 'TOO_LONG' },
        { field: 'defaultTimeZone', code: 'INVALID_VALUE' },
      ]),
    ).toEqual({
      fields: [
        { path: 'displayName', message: 'workspace.errors.displayName.TOO_LONG' },
        { path: 'defaultTimeZone', message: 'workspace.errors.defaultTimeZone.INVALID_VALUE' },
      ],
      unknown: false,
    })
    expect(mapWorkspaceErrors([{ field: 'defaultLocale', code: 'INVALID_VALUE' }]).unknown).toBe(true)
    expect(mapWorkspaceErrors([{ field: 'version', code: 'REQUIRED' }]).unknown).toBe(true)
  })
})
