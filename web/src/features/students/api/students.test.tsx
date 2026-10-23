import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '../../../app/queryClient'
import { SESSION_KEY } from '../../auth/api/session'
import { server, sessionBody, setXsrfCookie } from '../../../test/server'
import { RESET_CREDENTIALS } from '../../../test/students'
import { studentKeys, useCreateStudent } from './students'

// T-M2.20 AC4 (T-M2.15 SEC S-2): an Add student answer refreshes the list only while the tutor's session is cached.

describe('useCreateStudent: the list refresh follows the session (DEC-127)', () => {
  it.each([
    ['the tutor session is cached', true, sessionBody('TUTOR')],
    ['a student signed in meanwhile', false, sessionBody('STUDENT')],
    ['no session is cached', false, null],
  ])('answered while %s: invalidates the list → %s', async (_, invalidates, session) => {
    setXsrfCookie()
    let release = () => {}
    let reached = () => {}
    const arrived = new Promise<void>((resolve) => (reached = resolve))
    server.use(
      http.post('*/api/v1/tutor/students', async () => {
        reached()
        await new Promise<void>((resolve) => (release = resolve))
        return HttpResponse.json(RESET_CREDENTIALS, { status: 201 })
      }),
    )
    const client = createQueryClient()
    client.setQueryData(SESSION_KEY, sessionBody('TUTOR'))
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useCreateStudent(), { wrapper })
    let write: Promise<unknown> = Promise.resolve()
    act(() => {
      write = result.current.mutateAsync({ fullName: 'Học viên thử', username: 'hv-thu' })
    })
    await act(() => arrived)
    // The session ended (sign-out clears the cache; a sign-in keeps only its own session) while the create was pending.
    act(() => {
      client.getQueryCache().clear()
      if (session !== null) client.setQueryData(SESSION_KEY, session)
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    release()
    await act(() => write)
    if (invalidates) expect(invalidate).toHaveBeenCalledWith({ queryKey: studentKeys.list })
    else expect(invalidate).not.toHaveBeenCalled()
  })
})
