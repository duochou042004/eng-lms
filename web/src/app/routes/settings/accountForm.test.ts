import { describe, expect, it } from 'vitest'
import { accountSchema, mapPreferencesErrors, timeZoneOptions, toPreferencesRequest } from './accountForm'

const saved = { displayName: 'Cô Lan', timeZone: 'Asia/Ho_Chi_Minh' }

// T-M2.6 scope 5, AC6: only the changed properties; the fullName rule; the current zone always an option.
describe('account form', () => {
  it('sends only the changed properties, trimmed; an emptied display name clears it; nothing changed → null', () => {
    expect(toPreferencesRequest(saved, { ...saved, displayName: '  Cô Lan ' })).toBeNull()
    expect(toPreferencesRequest(saved, { ...saved, displayName: ' Lan ' })).toEqual({ displayName: 'Lan' })
    expect(toPreferencesRequest(saved, { ...saved, displayName: '  ' })).toEqual({ displayName: null })
    expect(toPreferencesRequest(saved, { ...saved, timeZone: 'Asia/Bangkok' })).toEqual({ timeZone: 'Asia/Bangkok' })
    expect(toPreferencesRequest({ ...saved, displayName: '' }, { displayName: 'Lan', timeZone: 'UTC' })).toEqual({
      displayName: 'Lan',
      timeZone: 'UTC',
    })
  })

  it('applies the fullName rule: 120 code points after trim, no control character but tab, LF, CR', () => {
    const issues = (displayName: string) =>
      accountSchema.safeParse({ displayName, timeZone: 'UTC' }).error?.issues.map((i) => i.message) ?? []
    expect(issues(` ${'ạ'.repeat(120)} `)).toEqual([])
    expect(issues('😀'.repeat(120))).toEqual([])
    expect(issues('a'.repeat(121))).toEqual(['account.errors.displayName.TOO_LONG'])
    expect(issues('Lan\u0007')).toEqual(['account.errors.displayName.INVALID_FORMAT'])
    expect(issues('Lan\tCô')).toEqual([])
    expect(issues('')).toEqual([])
  })

  it('maps a 422 to the fields, the rest to the summary', () => {
    expect(
      mapPreferencesErrors([
        { field: 'displayName', code: 'TOO_LONG' },
        { field: 'timeZone', code: 'INVALID_VALUE' },
        { field: 'locale', code: 'INVALID_VALUE' },
      ] as never),
    ).toEqual({
      fields: [
        { path: 'displayName', message: 'account.errors.displayName.TOO_LONG' },
        { path: 'timeZone', message: 'account.errors.timeZone.INVALID_VALUE' },
      ],
      unknown: true,
    })
  })

  it('lists the engine zones and the current one when the engine does not', () => {
    expect(timeZoneOptions('Asia/Bangkok', ['Asia/Bangkok', 'UTC']).map((o) => o.id)).toEqual(['Asia/Bangkok', 'UTC'])
    expect(timeZoneOptions('Asia/Saigon', ['Asia/Bangkok', 'UTC'])).toEqual([
      { id: 'Asia/Saigon', label: 'Asia/Saigon' },
      { id: 'Asia/Bangkok', label: 'Asia/Bangkok' },
      { id: 'UTC', label: 'UTC' },
    ])
    expect(timeZoneOptions('UTC').length).toBeGreaterThan(300)
  })
})
