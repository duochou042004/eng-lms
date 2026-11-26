import { describe, expect, it } from 'vitest'
import { codePointLabel, firstForbidden, isBlank, stripName } from './names'

// T-M2.33 AC5: the AC4 code points, each at the start, middle and end (the server's `shared.Names` table).
const FORBIDDEN = [
  0x0009, 0x000a, 0x000d, 0x007f, 0x0085, 0x00ad, 0x061c, 0x180e, 0x200b, 0x200d, 0x200e, 0x2028, 0x2029, 0x202e,
  0x2060, 0x2064, 0x2066, 0xfeff, 0xe0041, 0xd800,
]

describe('lib/names', () => {
  describe.each(FORBIDDEN.map((cp) => [cp.toString(16).toUpperCase(), cp] as const))('U+%s', (_, cp) => {
    const c = String.fromCodePoint(cp)
    it.each([`${c}Lan`, `La${c}n`, `Lan${c}`])('is found in %j', (value) => {
      expect(firstForbidden(value)).toBe(cp)
    })
  })

  it('returns the first forbidden code point when several', () => {
    expect(firstForbidden('a\u202Eb\u200Bc')).toBe(0x202e)
    expect(firstForbidden('a\u{E0041}\u0009')).toBe(0xe0041)
  })

  it.each([
    ['Vietnamese, precomposed', 'Cô Lan Nguyễn'],
    ['combining acute U+0301', 'Le\u0301 Lan'],
    ['emoji with U+FE0F', 'Lan \u2764\uFE0F'],
    ['interior ASCII space', 'Cô Lan'],
    ['U+00A0 inside', 'Cô\u00A0Lan'],
  ])('accepts %s', (_, value) => {
    expect(firstForbidden(value)).toBeNull()
  })

  it('formats a code point as U+XXXX (4–6 upper-case hex digits)', () => {
    expect(codePointLabel(0x9)).toBe('U+0009')
    expect(codePointLabel(0x200b)).toBe('U+200B')
    expect(codePointLabel(0xe0041)).toBe('U+E0041')
    expect(codePointLabel(0x10ffff)).toBe('U+10FFFF')
  })

  it('treats empty, space-only, U+00A0-only and U+3000-only as blank', () => {
    for (const value of ['', '   ', '\u00A0', '\u00A0\u00A0', '\u3000', ' \u3000 \u202F'])
      expect(isBlank(value)).toBe(true)
    expect(isBlank(' a ')).toBe(false)
    expect(isBlank('\u200B')).toBe(false)
  })

  it('strips the ends as the server does (whitespace and every space separator)', () => {
    expect(stripName('\u00A0Lan\u202F')).toBe('Lan')
    expect(stripName('\u2007 Cô Lan \u3000')).toBe('Cô Lan')
    expect(stripName('\t\n\u000B\f\r\u001C\u001FLan\u2028\u2029')).toBe('Lan')
    // JS trim() removes U+FEFF; Java's whitespace does not, so the server keeps (and refuses) it.
    expect(stripName('\uFEFFLan')).toBe('\uFEFFLan')
    expect(stripName('Cô  Lan')).toBe('Cô  Lan')
  })
})
