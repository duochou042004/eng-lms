import { z } from 'zod'
import { isControl } from './listParams'

/**
 * The Add student form (FR-STU-01, T-M2.5 scope 4), aligned with validation-rules "identity / students" and "Common";
 * lengths in code points, values trimmed (empty = absent). The server stays authoritative. Messages are `students` i18n
 * keys (`form.errors.*`).
 */
// CSP script-src 'self': no compiled fast path (see features/auth/model/schemas.ts).
z.config({ jitless: true })

export const FULL_NAME_MAX = 120
export const USERNAME_MIN = 3
export const USERNAME_MAX = 40
export const PASSWORD_MIN = 10
export const PASSWORD_MAX = 128
export const EMAIL_MAX = 254
export const NOTE_MAX = 2000
export const HANDLE_LABEL_MAX = 60
export const HANDLE_VALUE_MAX = 500
export const HANDLES_MAX = 30

const length = (value: string) => [...value].length
/** Free text refuses control characters other than tab, line feed and carriage return (validation-rules). */
const noControl = (value: string) => ![...value].some((c) => isControl(c) && c !== '\t' && c !== '\n' && c !== '\r')

export const text = (max: number) =>
  z
    .string()
    .refine(noControl, 'form.errors.INVALID_FORMAT')
    .refine((v) => length(v.trim()) <= max, 'form.errors.TOO_LONG')

/** The "Common" email and phone rules (validation-rules), shared with the guardian fields. */
export const emailRule = text(EMAIL_MAX).refine(
  (v) => v.trim() === '' || /^[^\s@]+@[^\s@]+$/.test(v.trim()),
  'form.errors.emailFormat',
)
export const phoneRule = z.string().refine((v) => {
  const p = v.trim()
  return p === '' || (length(p) >= 6 && length(p) <= 20 && /^[0-9 +().-]+$/.test(p))
}, 'form.errors.phoneFormat')

export const createStudentSchema = z.object({
  fullName: text(FULL_NAME_MAX).refine((v) => v.trim() !== '', 'form.errors.fullNameRequired'),
  username: z
    .string()
    .refine((v) => v.trim() !== '', 'form.errors.usernameRequired')
    .refine((v) => {
      const u = v.trim().toLowerCase()
      return u === '' || (length(u) >= USERNAME_MIN && length(u) <= USERNAME_MAX && /^[a-z0-9._-]+$/.test(u))
    }, 'form.errors.USERNAME_INVALID'),
  password: z
    .string()
    .refine((v) => v === '' || length(v) >= PASSWORD_MIN, 'form.errors.PASSWORD_TOO_SHORT')
    .refine((v) => length(v) <= PASSWORD_MAX, 'form.errors.PASSWORD_TOO_LONG'),
  email: emailRule,
  phone: phoneRule,
  contactHandles: z
    .array(
      z.object({
        label: text(HANDLE_LABEL_MAX).refine((v) => v.trim() !== '', 'form.errors.handleLabelRequired'),
        value: text(HANDLE_VALUE_MAX),
      }),
    )
    .max(HANDLES_MAX, 'form.errors.TOO_MANY'),
  note: text(NOTE_MAX),
})

export type CreateStudentValues = z.infer<typeof createStudentSchema>

export const EMPTY_STUDENT: CreateStudentValues = {
  fullName: '',
  username: '',
  password: '',
  email: '',
  phone: '',
  contactHandles: [],
  note: '',
}

/** The `POST /tutor/students` body: trimmed, empty values left out, and no `password` when none was typed (DEC-098). */
export function toCreateRequest(values: CreateStudentValues) {
  const optional = (value: string) => (value.trim() === '' ? undefined : value.trim())
  const handles = values.contactHandles.map((h) => ({ label: h.label.trim(), value: h.value.trim() }))
  return {
    fullName: values.fullName.trim(),
    username: values.username.trim(),
    ...(values.password === '' ? {} : { password: values.password }),
    ...(optional(values.email) ? { email: optional(values.email) } : {}),
    ...(optional(values.phone) ? { phone: optional(values.phone) } : {}),
    ...(handles.length ? { contactHandles: handles } : {}),
    ...(optional(values.note) ? { note: optional(values.note) } : {}),
  }
}

/** Whether a full name gives the server enough to suggest from: ≥ 3 letters or digits once accents are removed. */
export function canSuggest(fullName: string) {
  const plain = fullName.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd')
  return (plain.match(/[a-z0-9]/gi) ?? []).length >= 3
}
