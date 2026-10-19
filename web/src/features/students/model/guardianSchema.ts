import { z } from 'zod'
import type { components } from '../../../lib/api'
import {
  createStudentSchema,
  EMPTY_STUDENT,
  emailRule,
  NOTE_MAX,
  phoneRule,
  text,
  toCreateRequest,
} from './createSchema'

type Guardian = components['schemas']['GuardianResponse']
export type GuardianRequest = components['schemas']['GuardianRequest']
export type UpdateGuardianRequest = components['schemas']['UpdateGuardianRequest']
export type CreateStudentRequest = components['schemas']['CreateStudentRequest']

/** validation-rules "guardian.name" and "guardians per student" (T-M2.9); notes are a Description (0–2,000). */
export const GUARDIAN_NAME_MAX = 120
export const RELATIONSHIP_MAX = 40
export const GUARDIAN_NOTES_MAX = NOTE_MAX
export const GUARDIANS_MAX = 10

const fields = {
  name: text(GUARDIAN_NAME_MAX),
  relationship: text(RELATIONSHIP_MAX),
  phone: phoneRule,
  email: emailRule,
  notes: text(GUARDIAN_NOTES_MAX),
}
const NAME_REQUIRED = 'form.errors.guardianNameRequired'

/** The guardian form on the Profile view (T-M2.15 scope 2): the name is required. */
export const guardianSchema = z.object({
  ...fields,
  name: fields.name.refine((v) => v.trim() !== '', NAME_REQUIRED),
})
export type GuardianValues = z.infer<typeof guardianSchema>

export const EMPTY_GUARDIAN: GuardianValues = { name: '', relationship: '', phone: '', email: '', notes: '' }
const KEYS = ['name', 'relationship', 'phone', 'email', 'notes'] as const
const OPTIONAL = ['relationship', 'phone', 'email', 'notes'] as const

/** The form's values for a saved guardian (absent values as empty fields). */
export function toGuardianValues(guardian: Guardian): GuardianValues {
  return {
    name: guardian.name,
    relationship: guardian.relationship ?? '',
    phone: guardian.phone ?? '',
    email: guardian.email ?? '',
    notes: guardian.notes ?? '',
  }
}

/** The `POST …/guardians` body (and a create row): trimmed, an optional field empty after trimming left out. */
export function toGuardianCreate(values: GuardianValues): GuardianRequest {
  const body: GuardianRequest = { name: values.name.trim() }
  for (const key of OPTIONAL) {
    const value = values[key].trim()
    if (value !== '') body[key] = value
  }
  return body
}

/**
 * The `PATCH /tutor/guardians/{gid}` body: `version` and only the fields whose trimmed value changed from `initial`; an
 * emptied optional field is `null`. `null` when nothing changed (Save closes the form without a request).
 */
export function toGuardianPatch(
  initial: GuardianValues,
  values: GuardianValues,
  version: number,
): UpdateGuardianRequest | null {
  const body: UpdateGuardianRequest = { version }
  const name = values.name.trim()
  if (name !== initial.name.trim()) body.name = name
  for (const key of OPTIONAL) {
    const value = values[key].trim()
    if (value !== initial[key].trim()) body[key] = value === '' ? null : value
  }
  return Object.keys(body).length > 1 ? body : null
}

// --- Add student's guardian rows (scope 7). ----------------------------------------------------------------------------

const isEmptyRow = (row: GuardianValues) => KEYS.every((key) => row[key].trim() === '')

/** A row of the add form: all empty is fine (left out); any value needs a name. */
const guardianRowSchema = z.object(fields).superRefine((row, ctx) => {
  if (!isEmptyRow(row) && row.name.trim() === '')
    ctx.addIssue({ code: 'custom', path: ['name'], message: NAME_REQUIRED })
})

/** The Add student form with its optional guardian rows (≤ 10). */
export const addStudentSchema = createStudentSchema.extend({
  guardians: z.array(guardianRowSchema).max(GUARDIANS_MAX, 'form.errors.guardiansTooMany'),
})
export type AddStudentValues = z.infer<typeof addStudentSchema>
export const EMPTY_ADD_STUDENT: AddStudentValues = { ...EMPTY_STUDENT, guardians: [] }

/** The form indexes of the rows that are sent, in order: request index `i` is form row `sentGuardianRows(…)[i]`. */
export function sentGuardianRows(rows: readonly GuardianValues[]): number[] {
  return rows.flatMap((row, index) => (isEmptyRow(row) ? [] : [index]))
}

/** The `POST /tutor/students` body: `toCreateRequest` plus the filled guardian rows in order (left out when none). */
export function toAddStudentRequest(values: AddStudentValues): CreateStudentRequest {
  const guardians = sentGuardianRows(values.guardians).map((index) => toGuardianCreate(values.guardians[index]!))
  return { ...toCreateRequest(values), ...(guardians.length ? { guardians } : {}) }
}
