import { describe, expect, it } from 'vitest'
import { emailParts, phoneGroups } from './lineBreaks'

// T-M2.5 AC12 (u): break opportunities after @ and before each dot; phone groups kept whole.
describe('emailParts (a short domain stays whole)', () => {
  it.each([
    ['binh.le.qwokro1@gmail.com', ['binh', '.le', '.qwokro1@', 'gmail.com']],
    ['an@example.com', ['an@', 'example.com']],
    ['nguyen.thi@subdomain.example-long.com', ['nguyen', '.thi@', 'subdomain', '.example-long', '.com']],
    ['plain', ['plain']],
  ])('%s', (email, parts) => {
    expect(emailParts(email)).toEqual(parts)
    expect(emailParts(email).join('')).toBe(email)
  })
})

describe('phoneGroups', () => {
  it('keeps each space-separated group whole, the spaces as separators', () => {
    expect(phoneGroups('+84 (90) 123-4567')).toEqual([
      { text: '+84', whole: true },
      { text: ' ', whole: false },
      { text: '(90)', whole: true },
      { text: ' ', whole: false },
      { text: '123-4567', whole: true },
    ])
  })

  it('lets a group longer than 12 characters wrap (it could overflow a narrow cell)', () => {
    expect(phoneGroups('+84-90-123-45-678')).toEqual([{ text: '+84-90-123-45-678', whole: false }])
    expect(
      phoneGroups('0901234567')
        .map((g) => g.text)
        .join(''),
    ).toBe('0901234567')
  })
})
