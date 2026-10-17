/**
 * Where long contact values may wrap in a narrow table cell (T-M2.5 AC12 (u)). Pure helpers: the caller renders the
 * parts with `<wbr>` (email) or keeps groups on one line (phone); the text stays the plain value.
 */

/** A domain up to this length stays whole (`gmail.com`, `example.com`); a longer one may also wrap before its dots. */
export const DOMAIN_WHOLE_MAX = 16

/**
 * An email split after `@` and before each `.` of the local part; the domain is one part unless it is longer than
 * `DOMAIN_WHOLE_MAX`: `binh.le@gmail.com` → `binh`, `.le@`, `gmail.com`.
 */
export function emailParts(email: string): string[] {
  const at = email.lastIndexOf('@')
  if (at < 0) return email.split(/(?=\.)/).filter((part) => part !== '')
  const local = email.slice(0, at + 1).split(/(?=\.)/)
  const domain = email.slice(at + 1)
  const domainParts = [...domain].length > DOMAIN_WHOLE_MAX ? domain.split(/(?=\.)/) : [domain]
  return [...local, ...domainParts].filter((part) => part !== '')
}

/** The longest phone group kept on one line; a longer one may wrap, so it can never overflow its cell. */
export const PHONE_GROUP_MAX = 12

/**
 * A phone split at its spaces (kept as separators), each group marked whether it stays whole: `+84 (90) 123-4567` →
 * `+84`, ` `, `(90)`, ` `, `123-4567`, so the line can break between groups but not at the hyphen inside one.
 */
export function phoneGroups(phone: string): Array<{ text: string; whole: boolean }> {
  return phone
    .split(/(\s+)/)
    .filter((part) => part !== '')
    .map((text) => ({ text, whole: !/\s/.test(text) && [...text].length <= PHONE_GROUP_MAX }))
}
