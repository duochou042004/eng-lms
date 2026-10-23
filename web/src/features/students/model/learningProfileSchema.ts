import { z } from 'zod'
import { addTags, type TagEntryError } from '../../../ui'
import type { LearningProfile, LearningProfileRequest } from '../api/learningProfile'
import { HANDLE_LABEL_MAX, HANDLE_VALUE_MAX, HANDLES_MAX, NOTE_MAX, text } from './createSchema'

/** validation-rules (learningProfile.*; the learning-profile row wins over the general Tag row, DEC-140 (5)). */
export const CURRENT_LEVEL_MAX = 40
export const LEARNING_NOTES_MAX = NOTE_MAX
export const TAG_MAX = 40
export const TAGS_MAX = 30
export const FIELD_LABEL_MAX = HANDLE_LABEL_MAX
export const FIELD_VALUE_MAX = HANDLE_VALUE_MAX
export const FIELDS_MAX = HANDLES_MAX
export const TAG_LIMITS = { maxTags: TAGS_MAX, maxLength: TAG_MAX }

/** The message key (`students` namespace) of each refused tag entry; `TOO_LONG` takes `max`. */
export const TAG_ERROR: Record<TagEntryError, string> = {
  control: 'learningProfile.errors.tagControl',
  tooLong: 'form.errors.TOO_LONG',
  duplicate: 'learningProfile.errors.tagDuplicate',
  tooMany: 'learningProfile.errors.tagsTooMany',
}

/** A `TagInput`'s value in the form: its tags and the text still in its input (Save commits it; it counts as a change). */
const tagsSchema = z.object({ tags: z.array(z.string()), draft: z.string() }).superRefine((value, ctx) => {
  // One issue (zodResolver keeps one per path): every reason's key, joined by a space (keys hold none; T-M2.20 AC8).
  const { errors } = addTags(value.tags, value.draft, TAG_LIMITS)
  if (errors.length > 0) ctx.addIssue({ code: 'custom', message: errors.map((reason) => TAG_ERROR[reason]).join(' ') })
})

const isEmptyRow = (row: { label: string; value: string }) => row.label.trim() === '' && row.value.trim() === ''

const customFieldSchema = z
  .object({ label: text(FIELD_LABEL_MAX), value: text(FIELD_VALUE_MAX) })
  .superRefine((row, ctx) => {
    if (!isEmptyRow(row) && row.label.trim() === '')
      ctx.addIssue({ code: 'custom', path: ['label'], message: 'learningProfile.errors.labelRequired' })
  })

/** The learning-profile form (T-M2.17 scope 3); lengths in code points, free text without C0 controls but tab, LF, CR. */
export const learningProfileSchema = z.object({
  currentLevel: text(CURRENT_LEVEL_MAX),
  strengths: tagsSchema,
  weaknesses: tagsSchema,
  learningNotes: text(LEARNING_NOTES_MAX),
  customFields: z.array(customFieldSchema).max(FIELDS_MAX, 'learningProfile.errors.fieldsTooMany'),
})
export type LearningProfileValues = z.infer<typeof learningProfileSchema>
export type TagsValue = LearningProfileValues['strengths']

/** The form's values for a loaded profile (absent values as empty fields, no uncommitted tag text). */
export function toLearningProfileValues(profile: LearningProfile): LearningProfileValues {
  return {
    currentLevel: profile.currentLevel ?? '',
    strengths: { tags: [...profile.strengths], draft: '' },
    weaknesses: { tags: [...profile.weaknesses], draft: '' },
    learningNotes: profile.learningNotes ?? '',
    customFields: profile.customFields.map((f) => ({ label: f.label ?? '', value: f.value ?? '' })),
  }
}

/** The form indexes of the custom-field rows that are sent, in order: request index `i` is form row `[i]` of this. */
export function sentCustomFieldRows(rows: LearningProfileValues['customFields']): number[] {
  return rows.flatMap((row, index) => (isEmptyRow(row) ? [] : [index]))
}

/** The tags with the input's text committed (a valid form commits without refusals). */
export const committedTags = (value: TagsValue) => addTags(value.tags, value.draft, TAG_LIMITS).value

const optional = (value: string) => (value.trim() === '' ? null : value.trim())

/**
 * The `PUT …/learning-profile` body (scope 4): the whole profile with `version` (`null` before the first save); the
 * level and notes trimmed (`null` when empty), the tags with any input text committed, and the custom-field rows not
 * empty after trimming, trimmed, in order.
 */
export function toLearningProfilePut(values: LearningProfileValues, version: number | null): LearningProfileRequest {
  return {
    version,
    currentLevel: optional(values.currentLevel),
    strengths: committedTags(values.strengths),
    weaknesses: committedTags(values.weaknesses),
    learningNotes: optional(values.learningNotes),
    customFields: sentCustomFieldRows(values.customFields).map((index) => {
      const row = values.customFields[index]!
      return { label: row.label.trim(), value: row.value.trim() }
    }),
  }
}

/** Whether Save would change nothing against the cached profile (after trimming and dropping empty rows). */
export function isUnchanged(profile: LearningProfile, values: LearningProfileValues) {
  const { version: _, ...sent } = toLearningProfilePut(values, null)
  const stored = {
    currentLevel: profile.currentLevel ?? null,
    strengths: profile.strengths,
    weaknesses: profile.weaknesses,
    learningNotes: profile.learningNotes ?? null,
    customFields: profile.customFields.map((f) => ({ label: f.label ?? '', value: f.value ?? '' })),
  }
  return JSON.stringify(sent) === JSON.stringify(stored)
}
