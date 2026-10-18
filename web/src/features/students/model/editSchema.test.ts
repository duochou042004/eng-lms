import { describe, expect, it } from 'vitest'
import { student } from '../../../test/students'
import { editStudentSchema, toEditValues, toPatchRequest, type EditStudentValues } from './editSchema'

// T-M2.14 scope 2, AC1: only the changed fields, null clears, the whole handle list when any row changed.
const initial = toEditValues(student() as Parameters<typeof toEditValues>[0])
const edit = (changes: Partial<EditStudentValues>) => ({ ...initial, ...changes })

describe('toPatchRequest', () => {
  it.each<[string, Partial<EditStudentValues>, Record<string, unknown> | null]>([
    ['nothing changed', {}, null],
    ['only whitespace added', { fullName: ' Nguyễn Văn An ', email: 'an@example.com  ' }, null],
    ['the email', { email: 'moi@example.com' }, { version: 3, email: 'moi@example.com' }],
    ['an emptied phone is null', { phone: '  ' }, { version: 3, phone: null }],
    ['an emptied note and email are null', { note: '', email: '' }, { version: 3, email: null, note: null }],
    ['a trimmed full name', { fullName: '  Nguyễn Văn Bình ' }, { version: 3, fullName: 'Nguyễn Văn Bình' }],
    ['the username', { username: 'an.moi' }, { version: 3, username: 'an.moi' }],
    [
      'a handle added: the whole list',
      { contactHandles: [...initial.contactHandles, { label: 'Facebook ', value: ' an.fb' }] },
      {
        version: 3,
        contactHandles: [
          { label: 'Zalo', value: 'https://zalo.me/0901234567' },
          { label: 'Facebook', value: 'an.fb' },
        ],
      },
    ],
    ['every handle removed', { contactHandles: [] }, { version: 3, contactHandles: [] }],
    [
      'unchanged handles with spaces',
      { contactHandles: [{ label: ' Zalo', value: 'https://zalo.me/0901234567 ' }] },
      null,
    ],
  ])('%s', (_, changes, expected) => {
    expect(toPatchRequest(initial, edit(changes), 3)).toEqual(expected)
  })

  it('takes absent optional values of the student as empty fields', () => {
    const empty = toEditValues({
      ...(student() as Parameters<typeof toEditValues>[0]),
      email: null,
      phone: null,
      note: null,
    })
    expect(empty).toMatchObject({ email: '', phone: '', note: '' })
    expect(toPatchRequest(empty, { ...empty, phone: '0901 234 567' }, 0)).toEqual({ version: 0, phone: '0901 234 567' })
  })
})

describe('editStudentSchema', () => {
  it('has the add form rules without a password', () => {
    expect(editStudentSchema.safeParse(initial).success).toBe(true)
    expect(Object.keys(editStudentSchema.shape)).not.toContain('password')
    const issues = editStudentSchema.safeParse({ ...initial, fullName: ' ', username: 'A B' }).error!.issues
    expect(issues.map((i) => [i.path.join('.'), i.message])).toEqual([
      ['fullName', 'form.errors.fullNameRequired'],
      ['username', 'form.errors.USERNAME_INVALID'],
    ])
    const tooMany = Array.from({ length: 31 }, (_, i) => ({ label: `K${i}`, value: '' }))
    expect(editStudentSchema.safeParse({ ...initial, contactHandles: tooMany }).success).toBe(false)
  })
})
