import { describe, expect, it } from 'vitest'
import { contactHref, type ContactKind } from './contactHref'

// T-M2.5 scope 7, AC8 (DEC-100 SEC S4-8): the only allowed links are tel:, mailto: (one plain address) and https: with a
// host; everything else is refused (null: shown as text with a copy button).
describe('contactHref', () => {
  it.each<[ContactKind, string, string | null]>([
    // Phone: + and digits only; fewer than 3 digits → no link.
    ['phone', '0901 234 567', 'tel:0901234567'],
    ['phone', '+84 (90) 123-45.67', 'tel:+84901234567'],
    ['phone', ' +84 901 234 567 ', 'tel:+84901234567'],
    ['phone', '12', null],
    ['phone', '+1-', null],
    ['phone', 'call me', null],
    ['phone', 'javascript:alert(1)', null],
    // Email: exactly one plain address.
    ['email', 'an@example.com', 'mailto:an@example.com'],
    ['email', ' an.nguyen+lop@example.vn ', 'mailto:an.nguyen+lop@example.vn'],
    ['email', 'a@b?cc=c', null],
    ['email', 'mailto:a@b?cc=c', null],
    ['email', 'a@b#x', null],
    ['email', 'a@b,c@d', null],
    ['email', 'a@b;c@d', null],
    ['email', 'a@b%0abcc:x@y', null],
    ['email', 'a b@c', null],
    ['email', `a@b${String.fromCharCode(10)}bcc:x@y`, null],
    ['email', `a${String.fromCharCode(0)}@b`, null],
    ['email', 'a@b@c', null],
    ['email', '@b', null],
    ['email', 'a@', null],
    ['email', 'an', null],
    // Handle: https with a host only.
    ['handle', 'https://zalo.me/0901234567', 'https://zalo.me/0901234567'],
    ['handle', ' https://www.facebook.com/an.nguyen ', 'https://www.facebook.com/an.nguyen'],
    ['handle', 'http://zalo.me/0901234567', null],
    ['handle', 'javascript:alert(1)', null],
    ['handle', 'JavaScript:alert(1)', null],
    ['handle', 'data:text/html,<script>alert(1)</script>', null],
    ['handle', 'zalo:0901234567', null],
    ['handle', 'mailto:a@b?cc=c', null],
    ['handle', '//evil.example', null],
    ['handle', 'zalo.me/0901234567', null],
    ['handle', '0901234567', null],
    ['handle', 'an.nguyen', null],
    ['handle', 'https://', null],
    ['handle', 'file:///etc/passwd', null],
  ])('%s %j → %j', (kind, value, expected) => {
    expect(contactHref(kind, value)).toBe(expected)
  })

  it('never returns anything but a tel:, mailto: or https: URL', () => {
    const samples = ['x', 'javascript:alert(1)', 'https://a.b', 'a@b', '+1 234', 'vbscript:x', ' data:,x']
    for (const kind of ['phone', 'email', 'handle'] as const)
      for (const value of samples) {
        const href = contactHref(kind, value)
        if (href !== null) expect(href).toMatch(/^(tel:\+?\d+|mailto:[^?#]+|https:\/\/[^/]+.*)$/)
      }
  })
})
