import { describe, expect, it } from 'vitest'
import { changePasswordSchema, loginSchema } from './schemas'

const issues = (result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } }) =>
  result.success ? [] : result.error!.issues.map((i) => `${i.path.join('.')}:${i.message}`)

describe('loginSchema', () => {
  it('requires a username (trimmed) and a password', () => {
    expect(issues(loginSchema.safeParse({ username: '  ', password: '', rememberMe: false }))).toEqual([
      'username:errors.usernameRequired',
      'password:errors.passwordRequired',
    ])
  })

  it('accepts any non-empty password (the server decides) and trims the username', () => {
    const result = loginSchema.parse({ username: ' lan ', password: ' x ', rememberMe: true })
    expect(result).toEqual({ username: 'lan', password: ' x ', rememberMe: true })
  })
})

describe('changePasswordSchema (validation-rules: 10–128)', () => {
  const valid = { currentPassword: 'old-password', newPassword: 'a'.repeat(10), confirmPassword: 'a'.repeat(10) }

  it('accepts 10 and 128 characters', () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true)
    const long = 'b'.repeat(128)
    expect(changePasswordSchema.safeParse({ ...valid, newPassword: long, confirmPassword: long }).success).toBe(true)
  })

  it('refuses 9 and 129 characters with the server codes', () => {
    expect(
      issues(changePasswordSchema.safeParse({ ...valid, newPassword: 'a'.repeat(9), confirmPassword: 'a'.repeat(9) })),
    ).toEqual(['newPassword:errors.PASSWORD_TOO_SHORT'])
    const long = 'b'.repeat(129)
    expect(issues(changePasswordSchema.safeParse({ ...valid, newPassword: long, confirmPassword: long }))).toEqual([
      'newPassword:errors.PASSWORD_TOO_LONG',
    ])
  })

  it('requires every field, the required message first', () => {
    const result = issues(changePasswordSchema.safeParse({ currentPassword: '', newPassword: '', confirmPassword: '' }))
    expect(result[0]).toBe('currentPassword:errors.currentRequired')
    expect(result).toContain('newPassword:errors.newRequired')
    expect(result).toContain('confirmPassword:errors.confirmRequired')
    expect(result.indexOf('newPassword:errors.newRequired')).toBeLessThan(
      result.indexOf('newPassword:errors.PASSWORD_TOO_SHORT'),
    )
  })

  it('requires the confirmation to match', () => {
    expect(issues(changePasswordSchema.safeParse({ ...valid, confirmPassword: 'a'.repeat(11) }))).toEqual([
      'confirmPassword:errors.confirmMismatch',
    ])
  })
})
