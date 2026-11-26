/**
 * The one character rule for the workspace name and the tutor's display name (validation-rules "name rule", DEC-200),
 * mirroring the server's `shared.Names`: the server is the authority, this rule only names the code point in the form.
 */

// Controls (C0, DEL, C1), format characters (bidi, zero-width, joiners, tags, U+00AD …), lone surrogates, U+2028, U+2029.
const FORBIDDEN = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u
const SPACE = /\p{Z}/u
// Java's whitespace (tab to CR, U+001C to U+001F) plus every space separator; unlike JS `trim()`, U+FEFF stays.
const isEnd = (c: string) => {
  const cp = c.codePointAt(0)!
  return (cp >= 0x09 && cp <= 0x0d) || (cp >= 0x1c && cp <= 0x1f) || SPACE.test(c)
}

/** The first forbidden code point of `value`, or `null`. */
export function firstForbidden(value: string): number | null {
  const match = FORBIDDEN.exec(value)
  return match ? value.codePointAt(match.index)! : null
}

/** `value` without leading and trailing whitespace and space separators (the server's strip). */
export function stripName(value: string) {
  const chars = [...value]
  let start = 0
  let end = chars.length
  while (start < end && isEnd(chars[start]!)) start++
  while (end > start && isEnd(chars[end - 1]!)) end--
  return chars.slice(start, end).join('')
}

/** Empty, or only whitespace and space separators (U+00A0, U+3000 …). */
export const isBlank = (value: string) => stripName(value) === ''

/** `U+XXXX` (4–6 upper-case hex digits). */
export const codePointLabel = (codePoint: number) => `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
