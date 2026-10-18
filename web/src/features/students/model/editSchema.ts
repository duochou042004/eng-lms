import { z } from 'zod'
import type { components } from '../../../lib/api'
import { createStudentSchema } from './createSchema'

type Student = components['schemas']['StudentResponse']
export type UpdateStudentRequest = components['schemas']['UpdateStudentRequest']

/** The Edit profile form (FR-STU-03, T-M2.14 scope 1): the add form's rules and limits, without the password. */
export const editStudentSchema = createStudentSchema.omit({ password: true })
export type EditStudentValues = z.infer<typeof editStudentSchema>

/** The form's values for a loaded student (absent values as empty fields). */
export function toEditValues(student: Student): EditStudentValues {
  return {
    fullName: student.fullName,
    username: student.username,
    email: student.email ?? '',
    phone: student.phone ?? '',
    contactHandles: student.contactHandles.map((h) => ({ label: h.label ?? '', value: h.value ?? '' })),
    note: student.note ?? '',
  }
}

/**
 * The `PATCH /tutor/students/{sid}` body (api-catalog): `version` and only the fields that changed from `initial`,
 * trimmed; an emptied email, phone or note is `null` (cleared); `contactHandles` is the whole list when any row
 * changed. `null` when nothing changed (Save closes the form without a request).
 */
export function toPatchRequest(
  initial: EditStudentValues,
  values: EditStudentValues,
  version: number,
): UpdateStudentRequest | null {
  const body: UpdateStudentRequest = { version }
  const fullName = values.fullName.trim()
  const username = values.username.trim()
  if (fullName !== initial.fullName.trim()) body.fullName = fullName
  if (username !== initial.username.trim()) body.username = username
  for (const key of ['email', 'phone', 'note'] as const) {
    const value = values[key].trim()
    if (value !== initial[key].trim()) body[key] = value === '' ? null : value
  }
  const handles = (list: EditStudentValues['contactHandles']) =>
    list.map((h) => ({ label: h.label.trim(), value: h.value.trim() }))
  const next = handles(values.contactHandles)
  if (JSON.stringify(next) !== JSON.stringify(handles(initial.contactHandles))) body.contactHandles = next
  return Object.keys(body).length > 1 ? body : null
}
