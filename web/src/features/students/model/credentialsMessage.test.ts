import { describe, expect, it } from 'vitest'
import { i18n } from '../../../lib/i18n'
import '../i18n'
import { credentialsMessage } from './credentialsMessage'

const input = {
  workspace: 'Lớp cô Lan',
  fullName: 'Nguyễn Văn An',
  loginUrl: 'https://lop.example/login',
  username: 'nguyenvanan',
  temporaryPassword: 'Tm9-p4ss-W0rd-x',
  expiresAt: '2026-10-23T03:00:00Z',
}

// T-M2.5 scope 5, AC7: the ready-to-paste message in the UI language with every value.
describe('credentialsMessage', () => {
  it.each(['vi', 'en'] as const)(
    'builds the %s message with the workspace, URL, username, password and expiry',
    (lng) => {
      const message = credentialsMessage(i18n.getFixedT(lng, 'students'), lng, input)
      for (const value of [input.workspace, input.fullName, input.loginUrl, input.username, input.temporaryPassword])
        expect(message).toContain(value)
      const expiry = new Intl.DateTimeFormat(lng, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(input.expiresAt),
      )
      expect(message).toContain(expiry)
      expect(message).toContain(
        lng === 'vi' ? 'tự đặt mật khẩu mới ở lần đăng nhập đầu tiên' : 'choose your own password at first sign-in',
      )
      expect(message).not.toMatch(/[<>]|\{\{/)
    },
  )
})
