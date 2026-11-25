import { describe, expect, it } from 'vitest'
import { mapWorkspaceErrors, toWorkspaceRequest, workspaceSchema } from './workspaceForm'

const saved = { displayName: 'Eng-LMS', defaultLocale: 'vi', defaultTimeZone: 'Asia/Ho_Chi_Minh' }
const issue = (displayName: string) =>
  workspaceSchema.safeParse({ ...saved, displayName }).error?.issues.map((i) => i.message) ?? []

describe('workspaceForm', () => {
  it('the request carries version and only the changed properties (the name trimmed); nothing changed → null', () => {
    expect(toWorkspaceRequest(saved, saved, 3)).toBeNull()
    expect(toWorkspaceRequest(saved, { ...saved, displayName: '  Eng-LMS ' }, 3)).toBeNull()
    expect(toWorkspaceRequest(saved, { ...saved, displayName: ' Lớp ' }, 3)).toEqual({ version: 3, displayName: 'Lớp' })
    expect(toWorkspaceRequest(saved, { ...saved, defaultLocale: 'en', defaultTimeZone: 'UTC' }, 0)).toEqual({
      version: 0,
      defaultLocale: 'en',
      defaultTimeZone: 'UTC',
    })
  })

  it.each([
    ['', 'REQUIRED'],
    ['   ', 'REQUIRED'],
    ['a'.repeat(121), 'TOO_LONG'],
    ['a\u0007b', 'INVALID_FORMAT'],
    ['ab\n', 'INVALID_FORMAT'],
    ['a\u007fb', 'INVALID_FORMAT'],
    ['a\u0085b', 'INVALID_FORMAT'],
    ['a​b', 'INVALID_FORMAT'],
    ['a‏b', 'INVALID_FORMAT'],
    ['a‪b', 'INVALID_FORMAT'],
    ['a⁦b', 'INVALID_FORMAT'],
    ['a﻿b', 'INVALID_FORMAT'],
  ])('the name %j is refused with %s', (value, code) => {
    expect(issue(value)).toContain(`workspace.errors.displayName.${code}`)
  })

  it('accepts 120 code points, diacritics and astral characters counted once', () => {
    expect(issue('ệ'.repeat(120))).toEqual([])
    expect(issue('😀'.repeat(120))).toEqual([])
    expect(issue('a‐b')).toEqual([])
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
