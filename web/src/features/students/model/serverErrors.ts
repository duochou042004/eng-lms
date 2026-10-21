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
  | `guardians.${number}.${GuardianField}`

type GuardianField = 'name' | 'relationship' | 'phone' | 'email' | 'notes'
/** The paths of the student's own fields (the edit form never sends guardians). */
export type StudentFieldPath = Exclude<FormFieldPath, `guardians.${number}.${GuardianField}`>

export interface MappedErrors {
  /** Errors on a field of the form (react-hook-form paths) with their message key. */
  fields: Array<{ path: FormFieldPath; message: string }>
  /** Message keys of errors the form has no field for (they go to the error summary, T-M2.5 scope 4). */
  unknown: string[]
}

export const messageFor = (code: string) => `form.errors.${KNOWN_CODES.has(code) ? code : 'server'}`

/**
 * Maps a 422's `errors[]` to the form (interaction-states §2.2): a top-level field by name, a contact handle by index
 * (`contactHandles[1].value` → that row, when the row exists), a guardian by its index in the request
 * (`guardians[1].email` → the form row `guardianRows[1]`, T-M2.15 scope 7); anything else to the summary.
 */
export function mapServerErrors(
  errors: readonly FieldError[],
  handleCount: number,
  guardianRows: readonly number[] = [],
): MappedErrors {
  const mapped: MappedErrors = { fields: [], unknown: [] }
  for (const { field, code } of errors) {
    const handle = /^contactHandles\[(\d+)\]\.(label|value)$/.exec(field)
    const guardian = /^guardians\[(\d+)\]\.(name|relationship|phone|email|notes)$/.exec(field)
    const row = guardian ? guardianRows[Number(guardian[1])] : undefined
    if (FIELDS.has(field)) mapped.fields.push({ path: field as FormFieldPath, message: messageFor(code) })
    else if (guardian && row !== undefined)
      mapped.fields.push({ path: `guardians.${row}.${guardian[2] as GuardianField}`, message: messageFor(code) })
    else if (handle && Number(handle[1]) < handleCount)
      mapped.fields.push({
        path: `contactHandles.${Number(handle[1])}.${handle[2] as 'label' | 'value'}`,
        message: messageFor(code),
      })
    // A limit without its field cannot say its number: the generic message, except for the list of contacts.
    else
      mapped.unknown.push(
        code === 'TOO_MANY' && field === 'contactHandles'
          ? 'form.errors.handlesTooMany'
          : code === 'TOO_MANY' && field === 'guardians'
            ? 'form.errors.guardiansTooMany'
            : messageFor('server'),
      )
  }
  return mapped
}

const GUARDIAN_FIELDS = new Set<string>(['name', 'relationship', 'phone', 'email', 'notes'])

export interface MappedGuardianErrors {
  fields: Array<{ path: GuardianField; message: string }>
  unknown: string[]
  /** A 422 `TOO_MANY` on `guardians`: another tab added the 10th (T-M2.15 scope 3). */
  tooMany: boolean
}

/** Maps a guardian write's 422 `errors[]` to the guardian form: its five fields by name; the rest to the summary. */
export function mapGuardianErrors(errors: readonly FieldError[]): MappedGuardianErrors {
  const mapped: MappedGuardianErrors = { fields: [], unknown: [], tooMany: false }
  for (const { field, code } of errors) {
    if (field === 'guardians' && code === 'TOO_MANY') mapped.tooMany = true
    else if (GUARDIAN_FIELDS.has(field)) mapped.fields.push({ path: field as GuardianField, message: messageFor(code) })
    else mapped.unknown.push(messageFor('server'))
  }
  return mapped
}

export type LearningProfileFieldPath =
  | 'currentLevel'
  | 'learningNotes'
  | 'strengths'
  | 'weaknesses'
  | `customFields.${number}.label`
  | `customFields.${number}.value`

export interface MappedLearningProfileErrors {
  /** Field errors: the message key, and for a tag the tag it names (`strengths[i]` → the `i`-th sent tag). */
  fields: Array<{ path: LearningProfileFieldPath; message: string; tag?: string }>
  unknown: string[]
}

/**
 * Maps a learning-profile save's 422 `errors[]` (T-M2.17 scope 4): the level and the notes by name; `strengths[i]` /
 * `weaknesses[i]` to that list's field naming the sent tag, their `TOO_MANY` to the list; `customFields[i].label|value`
 * to the form row `sentRows[i]` (empty rows are not sent); `customFields` `TOO_MANY` and the rest to the summary.
 */
export function mapLearningProfileErrors(
  errors: readonly FieldError[],
  sent: { strengths: readonly string[]; weaknesses: readonly string[] },
  sentRows: readonly number[],
): MappedLearningProfileErrors {
  const mapped: MappedLearningProfileErrors = { fields: [], unknown: [] }
  for (const { field, code } of errors) {
    const tag = /^(strengths|weaknesses)\[(\d+)\]$/.exec(field)
    const row = /^customFields\[(\d+)\]\.(label|value)$/.exec(field)
    const formRow = row ? sentRows[Number(row[1])] : undefined
    if (field === 'currentLevel' || field === 'learningNotes')
      mapped.fields.push({ path: field, message: messageFor(code) })
    else if ((field === 'strengths' || field === 'weaknesses') && code === 'TOO_MANY')
      mapped.fields.push({ path: field, message: 'learningProfile.errors.tagsTooMany' })
    else if (tag && sent[tag[1] as 'strengths' | 'weaknesses'][Number(tag[2])] !== undefined)
      mapped.fields.push({
        path: tag[1] as 'strengths' | 'weaknesses',
        message: messageFor(code),
        tag: sent[tag[1] as 'strengths' | 'weaknesses'][Number(tag[2])],
      })
    else if (row && formRow !== undefined)
      mapped.fields.push({ path: `customFields.${formRow}.${row[2] as 'label' | 'value'}`, message: messageFor(code) })
    else
      mapped.unknown.push(
        code === 'TOO_MANY' && field === 'customFields' ? 'learningProfile.errors.fieldsTooMany' : messageFor('server'),
      )
  }
  return mapped
}
