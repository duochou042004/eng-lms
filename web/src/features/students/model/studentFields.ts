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
}

/** The error summary's entries in the form's order, each a link to its field. */
export function summaryOf(errors: FieldErrors<CreateStudentValues | EditStudentValues>, t: TFunction<'students'>) {
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
  add(fieldId.note, errors.note?.message, NOTE_MAX)
  return items
}
