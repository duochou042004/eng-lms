import { z } from 'zod'
import type { PreferencesRequest, Session } from '../../../features/auth/api/session'
import type { FieldError } from '../../../lib/api'
import { firstForbidden, stripName } from '../../../lib/names'

// CSP script-src 'self': no compiled fast path (see features/auth/model/schemas.ts).
z.config({ jitless: true })

export const DISPLAY_NAME_MAX = 120
/**
 * The Account form (FR-SET-02): display name (the name rule, `lib/names`; blank clears it) and time zone. Messages are
 * `settings` keys. The rule applies only to a changed name, as the server checks only a sent one (T-M2.33 scope 8).
 */
export const accountSchema = (savedName: string) =>
  z.object({
    displayName: z
      .string()
      .refine(
        (v) => stripName(v) === stripName(savedName) || firstForbidden(v) === null,
        'account.errors.displayName.INVALID_CHARACTER',
      )
      .refine((v) => [...stripName(v)].length <= DISPLAY_NAME_MAX, 'account.errors.displayName.TOO_LONG'),
    timeZone: z.string().min(1, 'account.errors.timeZone.REQUIRED'),
  })
export type AccountValues = z.infer<ReturnType<typeof accountSchema>>

export const accountValues = (session: Pick<Session, 'displayName' | 'timeZone'>): AccountValues => ({
  displayName: session.displayName ?? '',
  timeZone: session.timeZone,
})

/** Only the changed properties (stripped; a blank display name is `null`, which clears it); `null` when nothing changed. */
export function toPreferencesRequest(saved: AccountValues, values: AccountValues): PreferencesRequest | null {
  const body: PreferencesRequest = {}
  const name = stripName(values.displayName)
  if (name !== stripName(saved.displayName)) body.displayName = name === '' ? null : name
  if (values.timeZone !== saved.timeZone) body.timeZone = values.timeZone
  return Object.keys(body).length > 0 ? body : null
}

/** A 422's `errors[]` on the form's fields (their message keys); anything else goes to the summary as one generic entry. */
export function mapPreferencesErrors(errors: readonly FieldError[]) {
  const fields: Array<{ path: keyof AccountValues; message: string }> = []
  let unknown = false
  for (const { field, code } of errors) {
    if (field === 'displayName' && ['TOO_LONG', 'INVALID_FORMAT', 'INVALID_VALUE'].includes(code))
      fields.push({ path: field, message: `account.errors.displayName.${code}` })
    else if (field === 'timeZone' && ['REQUIRED', 'INVALID_VALUE'].includes(code))
      fields.push({ path: field, message: `account.errors.timeZone.${code}` })
    else unknown = true
  }
  return { fields, unknown }
}

/**
 * The time-zone options: the engine's list (`Intl.supportedValuesOf`), plus the account's current zone when the engine
 * does not list it (an alias such as `Asia/Saigon` saved elsewhere must show and save unchanged).
 */
export function timeZoneOptions(current: string, engine: readonly string[] = Intl.supportedValuesOf('timeZone')) {
  const ids = engine.includes(current) ? engine : [current, ...engine]
  return ids.map((id) => ({ id, label: id }))
}
