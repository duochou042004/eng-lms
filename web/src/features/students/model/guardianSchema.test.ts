import { describe, expect, it } from 'vitest'
import {
  addStudentSchema,
  EMPTY_ADD_STUDENT,
  EMPTY_GUARDIAN,
  guardianSchema,
  sentGuardianRows,
  toAddStudentRequest,
  toGuardianCreate,
  toGuardianPatch,
  type GuardianValues,
} from './guardianSchema'

// T-M2.15 scope 2, 3, 7: the guardian form's rules, the POST and PATCH bodies, and the add form's guardian rows.

const saved: GuardianValues = {
  name: 'Nguyễn Thị Lan',
  relationship: 'Mẹ',
  phone: '0912 345 678',
  email: 'lan@example.com',
  notes: 'Gọi sau 18h',
}
const g = (values: Partial<GuardianValues> = {}): GuardianValues => ({ ...EMPTY_GUARDIAN, ...values })

describe('toGuardianPatch (only the changed fields, scope 3)', () => {
  it.each<[string, Partial<GuardianValues>, Record<string, unknown> | null]>([
    ['nothing changed', {}, null],
    ['trailing spaces only', { name: 'Nguyễn Thị Lan  ', email: ' lan@example.com ' }, null],
    ['a whitespace-only value where one was empty is no change', {}, null],
    [
      'the phone changed, the email cleared',
      { phone: '0987 654 321', email: '' },
      { phone: '0987 654 321', email: null },
    ],
    ['an optional field emptied to spaces is null', { notes: '   ' }, { notes: null }],
    ['the name changed (trimmed)', { name: '  Trần Văn Ba ' }, { name: 'Trần Văn Ba' }],
    [
      'every optional field cleared',
      { relationship: '', phone: '', email: '', notes: '' },
      { relationship: null, phone: null, email: null, notes: null },
    ],
  ])('%s', (_, change, expected) => {
    expect(toGuardianPatch(saved, { ...saved, ...change }, 3)).toEqual(expected && { version: 3, ...expected })
  })

  it('a whitespace-only value in an empty field sends nothing', () => {
    const initial = g({ name: 'An' })
    expect(toGuardianPatch(initial, { ...initial, relationship: '   ', notes: ' \n ' }, 0)).toBeNull()
  })
})

describe('toGuardianCreate (scope 3)', () => {
  it('a name only sends {name}; all five are trimmed; empty optional fields are left out', () => {
    expect(toGuardianCreate(g({ name: ' Lan ' }))).toEqual({ name: 'Lan' })
    expect(
      toGuardianCreate(g({ name: ' Lan ', relationship: ' Mẹ ', phone: ' 0912 ', email: ' a@b ', notes: ' x ' })),
    ).toEqual({ name: 'Lan', relationship: 'Mẹ', phone: '0912', email: 'a@b', notes: 'x' })
    expect(toGuardianCreate(g({ name: 'Lan', email: '   ' }))).toEqual({ name: 'Lan' })
  })
})

describe('guardianSchema (scope 2)', () => {
  const issues = (values: Partial<GuardianValues>) => {
    const result = guardianSchema.safeParse(g(values))
    return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]))
  }
  it('requires a name and checks the limits and the email and phone rules', () => {
    expect(issues({ name: '  ' })).toEqual({ name: 'form.errors.guardianNameRequired' })
    expect(issues({ name: 'x'.repeat(120), relationship: 'y'.repeat(40), notes: 'z'.repeat(2000) })).toEqual({})
    expect(issues({ name: 'x'.repeat(121), relationship: 'y'.repeat(41), notes: 'z'.repeat(2001) })).toEqual({
      name: 'form.errors.TOO_LONG',
      relationship: 'form.errors.TOO_LONG',
      notes: 'form.errors.TOO_LONG',
    })
    expect(issues({ name: 'Lan', email: 'khong-hop-le', phone: '12' })).toEqual({
      email: 'form.errors.emailFormat',
      phone: 'form.errors.phoneFormat',
    })
  })
})

describe('the add form guardian rows (scope 7)', () => {
  const rows = [g(), g({ name: 'Lan', phone: '0912 345 678' }), g({ notes: '   ', email: ' ' }), g({ name: 'Ba ' })]

  it('leaves out rows that are empty after trimming and keeps the rest in order', () => {
    expect(sentGuardianRows(rows)).toEqual([1, 3])
    expect(toAddStudentRequest({ ...EMPTY_ADD_STUDENT, fullName: 'An', username: 'an', guardians: rows })).toEqual({
      fullName: 'An',
      username: 'an',
      guardians: [{ name: 'Lan', phone: '0912 345 678' }, { name: 'Ba' }],
    })
  })

  it('without filled rows the request has no guardians', () => {
    const values = { ...EMPTY_ADD_STUDENT, fullName: 'An', username: 'an', guardians: [g(), g({ notes: ' ' })] }
    expect(toAddStudentRequest(values)).toEqual({ fullName: 'An', username: 'an' })
  })

  it('a row with any value needs a name; an empty row is valid; at most 10 rows', () => {
    const parse = (guardians: GuardianValues[]) =>
      addStudentSchema.safeParse({ ...EMPTY_ADD_STUDENT, fullName: 'An', username: 'an.nguyen', guardians })
    const failed = parse([g(), g({ phone: '0912 345 678' })])
    expect(failed.success).toBe(false)
    expect(failed.error?.issues.map((i) => [i.path.join('.'), i.message])).toEqual([
      ['guardians.1.name', 'form.errors.guardianNameRequired'],
    ])
    expect(parse([g(), g({ name: 'Lan' })]).success).toBe(true)
    expect(parse(Array.from({ length: 11 }, () => g())).error?.issues[0]?.message).toBe('form.errors.guardiansTooMany')
  })
})
