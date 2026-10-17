import { describe, expect, it } from 'vitest'
import { canSuggest, createStudentSchema, EMPTY_STUDENT, toCreateRequest } from './createSchema'

const valid = { ...EMPTY_STUDENT, fullName: 'Nguyễn Văn An', username: 'nguyenvanan' }
const issues = (values: object) => {
  const result = createStudentSchema.safeParse({ ...valid, ...values })
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}:${i.message}`)
}

describe('the Add student schema (validation-rules "identity / students")', () => {
  it('needs only a full name and a username', () => {
    expect(issues({})).toEqual([])
    expect(issues({ fullName: '  ', username: '' })).toEqual([
      'fullName:form.errors.fullNameRequired',
      'username:form.errors.usernameRequired',
    ])
  })

  it('checks the username rule after lowercasing', () => {
    expect(issues({ username: 'An.Nguyen_1-x' })).toEqual([])
    expect(issues({ username: 'ab' })).toEqual(['username:form.errors.USERNAME_INVALID'])
    expect(issues({ username: 'nguyễn' })).toEqual(['username:form.errors.USERNAME_INVALID'])
    expect(issues({ username: 'a'.repeat(41) })).toEqual(['username:form.errors.USERNAME_INVALID'])
  })

  it('checks the optional fields when filled', () => {
    expect(issues({ password: 'short' })).toEqual(['password:form.errors.PASSWORD_TOO_SHORT'])
    expect(issues({ email: 'an' })).toEqual(['email:form.errors.emailFormat'])
    expect(issues({ phone: '12' })).toEqual(['phone:form.errors.phoneFormat'])
    expect(issues({ phone: '+84 (90) 123-45.67' })).toEqual([])
    expect(issues({ note: 'x'.repeat(2001) })).toEqual(['note:form.errors.TOO_LONG'])
    expect(issues({ note: `dòng 1\ndòng 2\tcột` })).toEqual([])
    expect(issues({ note: `a${String.fromCharCode(0)}` })).toEqual(['note:form.errors.INVALID_FORMAT'])
    expect(issues({ fullName: 'x'.repeat(121) })).toEqual(['fullName:form.errors.TOO_LONG'])
  })

  it('checks contact handles: a label 1–60, a value up to 500, at most 30', () => {
    expect(issues({ contactHandles: [{ label: 'Zalo', value: '' }] })).toEqual([])
    expect(issues({ contactHandles: [{ label: ' ', value: 'x' }] })).toEqual([
      'contactHandles.0.label:form.errors.handleLabelRequired',
    ])
    expect(issues({ contactHandles: [{ label: 'Zalo', value: 'x'.repeat(501) }] })).toEqual([
      'contactHandles.0.value:form.errors.TOO_LONG',
    ])
    const many = Array.from({ length: 31 }, () => ({ label: 'Zalo', value: '' }))
    expect(issues({ contactHandles: many })).toEqual(['contactHandles:form.errors.TOO_MANY'])
  })
})

describe('toCreateRequest', () => {
  it('sends no password (the server generates one) and no empty optional value', () => {
    expect(toCreateRequest({ ...valid, fullName: ' Nguyễn Văn An ', email: ' ', note: '' })).toEqual({
      fullName: 'Nguyễn Văn An',
      username: 'nguyenvanan',
    })
  })

  it('sends the filled values, trimmed, and a typed password as typed', () => {
    expect(
      toCreateRequest({
        ...valid,
        password: ' mật khẩu dài ',
        email: ' an@example.com ',
        phone: '0901 234 567',
        contactHandles: [
          { label: ' Zalo ', value: ' https://zalo.me/0901234567 ' },
          { label: 'Facebook', value: '' },
        ],
        note: 'Dòng một\nDòng hai',
      }),
    ).toEqual({
      fullName: 'Nguyễn Văn An',
      username: 'nguyenvanan',
      password: ' mật khẩu dài ',
      email: 'an@example.com',
      phone: '0901 234 567',
      contactHandles: [
        { label: 'Zalo', value: 'https://zalo.me/0901234567' },
        { label: 'Facebook', value: '' },
      ],
      note: 'Dòng một\nDòng hai',
    })
  })
})

describe('canSuggest (≥ 3 letters or digits once accents are removed)', () => {
  it.each([
    ['Nguyễn Văn An', true],
    ['Đỗ', false],
    ['Đỗ A', true],
    ['An', false],
    ['  a-b  ', false],
    ['a1b', true],
    ['', false],
    ['李小龍', false],
  ])('%j → %s', (name, expected) => {
    expect(canSuggest(name)).toBe(expected)
  })
})
