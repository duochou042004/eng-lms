import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { isTutorSession } from './tutorSession'

// T-M2.15 scope 8 (DEC-127): a students write stores its answer only while the tutor's session is cached.
describe('isTutorSession', () => {
  it.each([
    ['a tutor session', { role: 'TUTOR' }, true],
    ['a student session', { role: 'STUDENT' }, false],
    ['anonymous (null)', null, false],
    ['nothing cached', undefined, false],
  ])('%s → %s', (_, session, expected) => {
    const client = new QueryClient()
    if (session !== undefined) client.setQueryData(['auth', 'session'], session)
    expect(isTutorSession(client)).toBe(expected)
  })
})
