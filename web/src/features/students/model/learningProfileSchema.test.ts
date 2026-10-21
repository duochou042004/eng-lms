import { describe, expect, it } from 'vitest'
import { learningProfile } from '../../../test/students'
import type { LearningProfile } from '../api/learningProfile'
import {
  isUnchanged,
  learningProfileSchema,
  sentCustomFieldRows,
  toLearningProfilePut,
  toLearningProfileValues,
  type LearningProfileValues,
} from './learningProfileSchema'

// T-M2.17 scope 3–4: the form's rules, the PUT body, "unchanged" and the custom-field row mapping.

const SAVED = learningProfile({
  currentLevel: 'B1',
  strengths: ['Nghe', 'Nói'],
  weaknesses: ['Viết'],
  learningNotes: 'Dòng một\nDòng hai',
  customFields: [{ label: 'Mục tiêu', value: '650' }],
  version: 2,
}) as LearningProfile
const values = (change: Partial<LearningProfileValues> = {}): LearningProfileValues => ({
  ...toLearningProfileValues(SAVED),
  ...change,
})
const tags = (list: string[], draft = '') => ({ tags: list, draft })
const issues = (v: LearningProfileValues) => {
  const result = learningProfileSchema.safeParse(v)
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
}

describe('toLearningProfilePut', () => {
  it.each<[string, Partial<LearningProfileValues>, Record<string, unknown>]>([
    ['unchanged values are sent whole', {}, {}],
    [
      'texts trimmed',
      { currentLevel: '  B2 ', learningNotes: ' x\n y \n' },
      { currentLevel: 'B2', learningNotes: 'x\n y' },
    ],
    ['emptied texts are null', { currentLevel: '   ', learningNotes: '' }, { currentLevel: null, learningNotes: null }],
    [
      'the input text of a tag list is committed',
      { strengths: tags(['Nghe'], 'Đọc, Nghe') },
      { strengths: ['Nghe', 'Đọc'] },
    ],
    [
      'rows empty after trimming are left out; the rest trimmed, in order',
      {
        customFields: [
          { label: ' ', value: '  ' },
          { label: ' Mục tiêu ', value: ' 650 ' },
          { label: '', value: '' },
          { label: 'Sở thích', value: '' },
        ],
      },
      {
        customFields: [
          { label: 'Mục tiêu', value: '650' },
          { label: 'Sở thích', value: '' },
        ],
      },
    ],
  ])('%s', (_, change, expected) => {
    expect(toLearningProfilePut(values(change), 2)).toEqual({
      version: 2,
      currentLevel: 'B1',
      strengths: ['Nghe', 'Nói'],
      weaknesses: ['Viết'],
      learningNotes: 'Dòng một\nDòng hai',
      customFields: [{ label: 'Mục tiêu', value: '650' }],
      ...expected,
    })
  })

  it('a never-saved profile sends version null', () => {
    const empty = learningProfile() as LearningProfile
    expect(toLearningProfilePut(toLearningProfileValues(empty), empty.version)).toEqual({
      version: null,
      currentLevel: null,
      strengths: [],
      weaknesses: [],
      learningNotes: null,
      customFields: [],
    })
  })
})

describe('isUnchanged', () => {
  it.each<[string, Partial<LearningProfileValues>, boolean]>([
    ['nothing edited', {}, true],
    ['whitespace-only edits', { currentLevel: 'B1  ', learningNotes: ' Dòng một\nDòng hai ' }, true],
    [
      'an empty row added',
      {
        customFields: [
          { label: 'Mục tiêu', value: '650' },
          { label: ' ', value: '' },
        ],
      },
      true,
    ],
    ['only spaces in a tag input', { strengths: tags(['Nghe', 'Nói'], '   ') }, true],
    ['a level changed', { currentLevel: 'B2' }, false],
    ['a tag added in the input', { weaknesses: tags(['Viết'], 'Đọc') }, false],
    ['tags reordered', { strengths: tags(['Nói', 'Nghe']) }, false],
    ['a field value changed', { customFields: [{ label: 'Mục tiêu', value: '700' }] }, false],
    ['the notes cleared', { learningNotes: '' }, false],
  ])('%s → %s', (_, change, expected) => {
    expect(isUnchanged(SAVED, values(change))).toBe(expected)
  })
})

describe('learningProfileSchema (validation-rules)', () => {
  it.each<[string, Partial<LearningProfileValues>, string[]]>([
    ['the saved values', {}, []],
    ['level 40 code points', { currentLevel: '😀'.repeat(40) }, []],
    ['level 41', { currentLevel: 'x'.repeat(41) }, ['currentLevel: form.errors.TOO_LONG']],
    ['a control character in the level', { currentLevel: 'B\u00071' }, ['currentLevel: form.errors.INVALID_FORMAT']],
    ['notes 2,001', { learningNotes: 'x'.repeat(2001) }, ['learningNotes: form.errors.TOO_LONG']],
    [
      'a duplicate left in a tag input',
      { strengths: tags(['Nghe'], 'nghe') },
      ['strengths: learningProfile.errors.tagDuplicate'],
    ],
    ['a 41-character tag in the input', { weaknesses: tags([], 'x'.repeat(41)) }, ['weaknesses: form.errors.TOO_LONG']],
    [
      'a value without a label',
      { customFields: [{ label: ' ', value: 'x' }] },
      ['customFields.0.label: learningProfile.errors.labelRequired'],
    ],
    [
      'label 61, value 501',
      { customFields: [{ label: 'x'.repeat(61), value: 'y'.repeat(501) }] },
      ['customFields.0.label: form.errors.TOO_LONG', 'customFields.0.value: form.errors.TOO_LONG'],
    ],
    [
      '31 rows',
      { customFields: Array.from({ length: 31 }, (_, i) => ({ label: `L${i}`, value: '' })) },
      ['customFields: learningProfile.errors.fieldsTooMany'],
    ],
  ])('%s', (_, change, expected) => {
    expect(issues(values(change))).toEqual(expected)
  })
})

describe('sentCustomFieldRows (request index → form row)', () => {
  it('skips the rows empty after trimming', () => {
    expect(
      sentCustomFieldRows([
        { label: '', value: ' ' },
        { label: 'A', value: '' },
        { label: '', value: '' },
        { label: '', value: 'x' },
      ]),
    ).toEqual([1, 3])
  })
})
