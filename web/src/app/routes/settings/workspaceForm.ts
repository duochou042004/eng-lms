import { z } from 'zod'
import type { WorkspaceSettings, WorkspaceSettingsRequest } from '../../../features/settings/api/workspace'
import type { FieldError } from '../../../lib/api'

// CSP script-src 'self': no compiled fast path (see features/auth/model/schemas.ts).
z.config({ jitless: true })

export const WORKSPACE_NAME_MAX = 120
// The server's rule (validation-rules "workspace"): any control character (C0, DEL, C1), a bidi override or isolate, or
// a zero-width character, anywhere in the value (DEC-191 SEC S4-1).
const FORBIDDEN: ReadonlyArray<readonly [number, number]> = [
  [0x00, 0x1f],
  [0x7f, 0x9f],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2066, 0x2069],
  [0xfeff, 0xfeff],
]
const hasForbidden = (value: string) =>
  [...value].some((c) => {
    const cp = c.codePointAt(0)!
    return FORBIDDEN.some(([from, to]) => cp >= from && cp <= to)
  })

/** The Workspace form (FR-SET-01). Messages are `settings` keys. */
export const workspaceSchema = z.object({
  displayName: z
    .string()
    .refine((v) => v.trim() !== '', 'workspace.errors.displayName.REQUIRED')
    .refine((v) => !hasForbidden(v), 'workspace.errors.displayName.INVALID_FORMAT')
    .refine((v) => [...v.trim()].length <= WORKSPACE_NAME_MAX, 'workspace.errors.displayName.TOO_LONG'),
  defaultLocale: z.string(),
  defaultTimeZone: z.string().min(1, 'workspace.errors.defaultTimeZone.REQUIRED'),
})
export type WorkspaceValues = z.infer<typeof workspaceSchema>
export const WORKSPACE_FIELDS = ['displayName', 'defaultLocale', 'defaultTimeZone'] as const

export const workspaceValues = (settings: WorkspaceSettings): WorkspaceValues => ({
  displayName: settings.displayName,
  defaultLocale: settings.defaultLocale,
  defaultTimeZone: settings.defaultTimeZone,
})

/** `version` and only the changed properties (the name trimmed); `null` when nothing changed. */
export function toWorkspaceRequest(
  saved: WorkspaceValues,
  values: WorkspaceValues,
  version: number,
): WorkspaceSettingsRequest | null {
  const body: WorkspaceSettingsRequest = { version }
  const name = values.displayName.trim()
  if (name !== saved.displayName) body.displayName = name
  if (values.defaultLocale !== saved.defaultLocale) body.defaultLocale = values.defaultLocale
  if (values.defaultTimeZone !== saved.defaultTimeZone) body.defaultTimeZone = values.defaultTimeZone
  return Object.keys(body).length > 1 ? body : null
}

const CODES: Record<'displayName' | 'defaultTimeZone', readonly string[]> = {
  displayName: ['REQUIRED', 'TOO_LONG', 'INVALID_FORMAT'],
  defaultTimeZone: ['REQUIRED', 'INVALID_VALUE'],
}

/**
 * A 422's `errors[]` on the name and time-zone fields (their message keys); anything else (the locale, which only the
 * control sets, or `version`) goes to the summary as one generic entry.
 */
export function mapWorkspaceErrors(errors: readonly FieldError[]) {
  const fields: Array<{ path: 'displayName' | 'defaultTimeZone'; message: string }> = []
  let unknown = false
  for (const { field, code } of errors) {
    if ((field === 'displayName' || field === 'defaultTimeZone') && CODES[field].includes(code))
      fields.push({ path: field, message: `workspace.errors.${field}.${code}` })
    else unknown = true
  }
  return { fields, unknown }
}
