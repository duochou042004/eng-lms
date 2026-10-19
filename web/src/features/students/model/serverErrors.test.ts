import { describe, expect, it } from 'vitest'
import { mapGuardianErrors, mapServerErrors } from './serverErrors'

describe('mapServerErrors (interaction-states §2.2)', () => {
  it('maps top-level fields and contact rows by index; the rest goes to the summary', () => {
    expect(
      mapServerErrors(
        [
          { field: 'email', code: 'INVALID_FORMAT' },
          { field: 'contactHandles[1].value', code: 'TOO_LONG' },
          { field: 'contactHandles[0].label', code: 'REQUIRED' },
          { field: 'contactHandles[5].label', code: 'REQUIRED' },
          { field: 'contactHandles', code: 'TOO_MANY' },
          { field: 'guardians[0].name', code: 'REQUIRED' },
          { field: 'password', code: 'PASSWORD_TOO_COMMON' },
          { field: 'note', code: 'UNKNOWN' },
        ],
        2,
      ),
    ).toEqual({
      fields: [
        { path: 'email', message: 'form.errors.INVALID_FORMAT' },
        { path: 'contactHandles.1.value', message: 'form.errors.TOO_LONG' },
        { path: 'contactHandles.0.label', message: 'form.errors.REQUIRED' },
        { path: 'password', message: 'form.errors.PASSWORD_TOO_COMMON' },
        { path: 'note', message: 'form.errors.server' },
      ],
      unknown: ['form.errors.server', 'form.errors.handlesTooMany', 'form.errors.server'],
    })
  })
})

describe('guardian errors (T-M2.15 scopes 3 and 7)', () => {
  it('maps guardians[i].<field> by the index of the sent rows to the form row; other guardians errors to the summary', () => {
    // Form rows 0 and 2 were empty and left out: the request's rows 0, 1, 2 are the form's rows 1, 3, 4.
    expect(
      mapServerErrors(
        [
          { field: 'guardians[1].email', code: 'INVALID_FORMAT' },
          { field: 'guardians[0].name', code: 'TOO_LONG' },
          { field: 'guardians[2].notes', code: 'TOO_LONG' },
          { field: 'guardians[3].name', code: 'REQUIRED' },
          { field: 'guardians', code: 'TOO_MANY' },
          { field: 'guardians[0].other', code: 'REQUIRED' },
        ],
        0,
        [1, 3, 4],
      ),
    ).toEqual({
      fields: [
        { path: 'guardians.3.email', message: 'form.errors.INVALID_FORMAT' },
        { path: 'guardians.1.name', message: 'form.errors.TOO_LONG' },
        { path: 'guardians.4.notes', message: 'form.errors.TOO_LONG' },
      ],
      unknown: ['form.errors.server', 'form.errors.guardiansTooMany', 'form.errors.server'],
    })
  })

  it('a guardian write: the five fields by name, TOO_MANY on guardians flagged, the rest to the summary', () => {
    expect(
      mapGuardianErrors([
        { field: 'name', code: 'REQUIRED' },
        { field: 'notes', code: 'TOO_LONG' },
        { field: 'guardians', code: 'TOO_MANY' },
        { field: 'version', code: 'REQUIRED' },
      ]),
    ).toEqual({
      fields: [
        { path: 'name', message: 'form.errors.REQUIRED' },
        { path: 'notes', message: 'form.errors.TOO_LONG' },
      ],
      unknown: ['form.errors.server'],
      tooMany: true,
    })
  })
})
