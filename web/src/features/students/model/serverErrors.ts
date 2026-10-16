import type { FieldError } from '../../../lib/api'

/** The field codes the form has its own message for (`form.errors.<code>`); others get the generic one. */
const KNOWN_CODES = new Set([
  'REQUIRED',
  'TOO_LONG',
  'TOO_MANY',
  'INVALID_FORMAT',
  'INVALID_VALUE',
  'USERNAME_INVALID',
  'USERNAME_TAKEN',
  'PASSWORD_TOO_SHORT',
  'PASSWORD_TOO_LONG',
  'PASSWORD_TOO_COMMON',
  'PASSWORD_EQUALS_USERNAME',
])
const FIELDS = new Set(['fullName', 'username', 'password', 'email', 'phone', 'note'])

export type FormFieldPath =
  | 'fullName'
  | 'username'
  | 'password'
  | 'email'
  | 'phone'
  | 'note'
  | `contactHandles.${number}.label`
  | `contactHandles.${number}.value`

export interface MappedErrors {
  /** Errors on a field of the form (react-hook-form paths) with their message key. */
  fields: Array<{ path: FormFieldPath; message: string }>
  /** Message keys of errors the form has no field for (they go to the error summary, T-M2.5 scope 4). */
  unknown: string[]
}

export const messageFor = (code: string) => `form.errors.${KNOWN_CODES.has(code) ? code : 'server'}`

/**
 * Maps a 422's `errors[]` to the form (interaction-states §2.2): a top-level field by name, a contact handle by index
 * (`contactHandles[1].value` → that row, when the row exists); anything else to the summary.
 */
export function mapServerErrors(errors: readonly FieldError[], handleCount: number): MappedErrors {
  const mapped: MappedErrors = { fields: [], unknown: [] }
  for (const { field, code } of errors) {
    const handle = /^contactHandles\[(\d+)\]\.(label|value)$/.exec(field)
    if (FIELDS.has(field)) mapped.fields.push({ path: field as FormFieldPath, message: messageFor(code) })
    else if (handle && Number(handle[1]) < handleCount)
      mapped.fields.push({
        path: `contactHandles.${Number(handle[1])}.${handle[2] as 'label' | 'value'}`,
        message: messageFor(code),
      })
    // A limit without its field cannot say its number: the generic message, except for the list of contacts.
    else
      mapped.unknown.push(
        field === 'contactHandles' && code === 'TOO_MANY' ? 'form.errors.handlesTooMany' : messageFor('server'),
      )
  }
  return mapped
}
