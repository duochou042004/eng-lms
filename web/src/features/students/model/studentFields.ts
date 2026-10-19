import type { TFunction } from 'i18next'
import type { FieldErrors } from 'react-hook-form'
import type { ErrorSummaryItem } from '../../../ui'
import {
  EMAIL_MAX,
  FULL_NAME_MAX,
  HANDLE_LABEL_MAX,
  HANDLE_VALUE_MAX,
  NOTE_MAX,
  type CreateStudentValues,
} from './createSchema'
import type { EditStudentValues } from './editSchema'
import { GUARDIAN_NAME_MAX, GUARDIAN_NOTES_MAX, RELATIONSHIP_MAX, type AddStudentValues } from './guardianSchema'

/**
 * The ids and the error summary of the student fields both forms share (Add student, Edit profile; T-M2.14). One form
 * exists on a page at a time, so the field ids are fixed (the error summary links to them).
 */
export const DEBOUNCE_MS = 300
export const ADD_HANDLE_ID = 'student-add-handle'
export const fieldId = {
  fullName: 'student-fullName',
  username: 'student-username',
  password: 'student-password',
  email: 'student-email',
  phone: 'student-phone',
  note: 'student-note',
  handle: (index: number, part: 'label' | 'value') => `student-handle-${index}-${part}`,
  guardian: (index: number, part: GuardianPart) => `student-guardian-${index}-${part}`,
}
export const ADD_GUARDIAN_ROW_ID = 'student-add-guardian'
/** The guardian form's input ids on the Profile view (one guardian form at a time, T-M2.15 scope 6). */
export const guardianFieldId = (part: GuardianPart) => `guardian-form-${part}`

export type GuardianPart = 'name' | 'relationship' | 'phone' | 'email' | 'notes'
/** The guardian fields in form order with their length limit (for `TOO_LONG`'s number). */
export const GUARDIAN_PARTS: ReadonlyArray<readonly [GuardianPart, number | undefined]> = [
  ['name', GUARDIAN_NAME_MAX],
  ['relationship', RELATIONSHIP_MAX],
  ['phone', undefined],
  ['email', EMAIL_MAX],
  ['notes', GUARDIAN_NOTES_MAX],
]

/** The error summary's entries in the form's order, each a link to its field. */
export function summaryOf(
  errors: FieldErrors<CreateStudentValues | EditStudentValues | AddStudentValues>,
  t: TFunction<'students'>,
) {
  const items: ErrorSummaryItem[] = []
  const add = (id: string, text: string | undefined, max?: number) => {
    if (text) items.push({ fieldId: id, message: t(text, { max }) })
  }
  add(fieldId.fullName, errors.fullName?.message, FULL_NAME_MAX)
  add(fieldId.username, errors.username?.message)
  if ('password' in errors) add(fieldId.password, errors.password?.message)
  add(fieldId.email, errors.email?.message, EMAIL_MAX)
  add(fieldId.phone, errors.phone?.message)
  errors.contactHandles?.forEach?.((row, index) => {
    add(fieldId.handle(index, 'label'), row?.label?.message, HANDLE_LABEL_MAX)
    add(fieldId.handle(index, 'value'), row?.value?.message, HANDLE_VALUE_MAX)
  })
  if (errors.contactHandles?.root?.message) items.push({ message: t(errors.contactHandles.root.message) })
  else if (errors.contactHandles?.message) items.push({ message: t(errors.contactHandles.message) })
  if ('guardians' in errors) {
    errors.guardians?.forEach?.((row, index) => {
      for (const [part, max] of GUARDIAN_PARTS) add(fieldId.guardian(index, part), row?.[part]?.message, max)
    })
    const list = errors.guardians?.root?.message ?? errors.guardians?.message
    if (list) items.push({ message: t(list) })
  }
  add(fieldId.note, errors.note?.message, NOTE_MAX)
  return items
}
