import { isControl } from './listParams'

export type ContactKind = 'phone' | 'email' | 'handle'

/**
 * The only place that turns a student's contact value into an `href` (T-M2.5 scope 7, DEC-100 SEC S4-8). Returns `null`
 * for anything that is not plainly one of the allowed forms; the caller then shows the value as text with a copy button.
 * - phone → `tel:` with a leading `+` and the digits only, when at least 3 digits remain;
 * - email → `mailto:` only for exactly one address (`local@domain`), with no whitespace, `?`, `#`, `,`, `;`, `%`
 *   (so no encoded line breaks or extra headers) and no control character;
 * - handle → the normalised URL only when it parses with `new URL()` to `https:` with a host. Everything else (`http:`,
 *   `javascript:`, `data:`, `zalo:`, `mailto:`, protocol-relative, plain text) is refused.
 */
export function contactHref(kind: ContactKind, value: string): string | null {
  const trimmed = value.trim()
  switch (kind) {
    case 'phone': {
      const digits = trimmed.replace(/\D/g, '')
      return digits.length >= 3 ? `tel:${trimmed.startsWith('+') ? '+' : ''}${digits}` : null
    }
    case 'email': {
      if ([...trimmed].some(isControl) || /[\s?#,;%]/.test(trimmed)) return null
      const [local, domain, ...more] = trimmed.split('@')
      return local && domain && more.length === 0 ? `mailto:${trimmed}` : null
    }
    case 'handle': {
      try {
        const url = new URL(trimmed)
        return url.protocol === 'https:' && url.hostname !== '' ? url.href : null
      } catch {
        return null
      }
    }
  }
}
