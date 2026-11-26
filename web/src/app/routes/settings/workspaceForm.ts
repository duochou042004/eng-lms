import { z } from 'zod'
import type { WorkspaceSettings, WorkspaceSettingsRequest } from '../../../features/settings/api/workspace'
import type { FieldError } from '../../../lib/api'
import { firstForbidden, isBlank, stripName } from '../../../lib/names'

// CSP script-src 'self': no compiled fast path (see features/auth/model/schemas.ts).
z.config({ jitless: true })

export const WORKSPACE_NAME_MAX = 120
/**
 * The Workspace form (FR-SET-01). Messages are `settings` keys. The name rule (`lib/names`) applies only to a changed
 * name, as the server checks only a sent one (T-M2.33 scope 8): a stored name saved before the rule never blocks a save.
 */
export const workspaceSchema = (savedName: string) =>
  z.object({
    displayName: z
      .string()
      .refine(
        (v) => stripName(v) === stripName(savedName) || firstForbidden(v) === null,
        'workspace.errors.displayName.INVALID_CHARACTER',
      )
      .refine((v) => !isBlank(v), 'workspace.errors.displayName.REQUIRED')
      .refine((v) => [...stripName(v)].length <= WORKSPACE_NAME_MAX, 'workspace.errors.displayName.TOO_LONG'),
    defaultLocale: z.string(),
    defaultTimeZone: z.string().min(1, 'workspace.errors.defaultTimeZone.REQUIRED'),
  })
export type WorkspaceValues = z.infer<ReturnType<typeof workspaceSchema>>
export const WORKSPACE_FIELDS = ['displayName', 'defaultLocale', 'defaultTimeZone'] as const

export const workspaceValues = (settings: WorkspaceSettings): WorkspaceValues => ({
  displayName: settings.displayName,
  defaultLocale: settings.defaultLocale,
  defaultTimeZone: settings.defaultTimeZone,
})

/** `version` and only the changed properties (the name stripped); `null` when nothing changed. */
export function toWorkspaceRequest(
  saved: WorkspaceValues,
  values: WorkspaceValues,
  version: number,
): WorkspaceSettingsRequest | null {
  const body: WorkspaceSettingsRequest = { version }
  const name = stripName(values.displayName)
  // Compared with the stripped saved name (as accountForm): a name stored before the strip rule (" Lan ") is no change.
  if (name !== stripName(saved.displayName)) body.displayName = name
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
