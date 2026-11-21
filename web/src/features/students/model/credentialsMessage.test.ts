import { describe, expect, it } from 'vitest'
import { i18n } from '../../../lib/i18n'
import '../i18n'
import { formatDateTime } from '../../../lib/time'
import { credentialsMessage } from './credentialsMessage'

const input = {
  workspace: 'Lớp cô Lan',
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
      const message = credentialsMessage(i18n.getFixedT(lng, 'students'), lng, 'Asia/Ho_Chi_Minh', input)
      for (const value of [input.workspace, input.loginUrl, input.username, input.temporaryPassword])
        expect(message).toContain(value)
      expect(message).toContain(formatDateTime(input.expiresAt, lng, 'Asia/Ho_Chi_Minh'))
      expect(message).toContain('10:00, 23/10/2026')
      expect(message).toMatch(/\d\d:\d\d, \d\d\/\d\d\/2026/)
      // A neutral greeting (AC12 (f)): no name, no "em" form.
      expect(message.split('\n')[0]).toBe(lng === 'vi' ? 'Xin chào,' : 'Hello,')
      expect(message).not.toMatch(/\bem\b|Nguyễn/)
      expect(message).toContain(
        lng === 'vi' ? 'tự đặt mật khẩu mới ở lần đăng nhập đầu tiên' : 'choose your own password at first sign-in',
      )
      expect(message).not.toMatch(/[<>]|\{\{/)
    },
  )

  // T-M2.6 AC9: the expiry in the account's time zone (03:00Z is 17:00 the day before in Honolulu, UTC−10).
  it('formats the expiry in the given time zone', () => {
    const t = i18n.getFixedT('vi', 'students')
    expect(credentialsMessage(t, 'vi', 'Pacific/Honolulu', input)).toContain('17:00, 22/10/2026')
    expect(credentialsMessage(t, 'vi', 'Pacific/Kiritimati', input)).toContain('17:00, 23/10/2026')
  })
})
