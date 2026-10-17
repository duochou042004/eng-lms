import { describe, expect, it } from 'vitest'
import { mapServerErrors } from './serverErrors'

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
