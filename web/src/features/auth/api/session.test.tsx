import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { createQueryClient } from '../../../app/queryClient'
import { server, sessionBody, setXsrfCookie } from '../../../test/server'
import { SID, student } from '../../../test/students'
import { useUpdateStudent } from '../../students/api/students'
import { SESSION_KEY, useLogin } from './session'

// T-M2.14 AC12 (j), SEC S-1: a sign-in starts from a cache that holds only the new session, so a write answered after
// the previous sign-out (it stores the student into the cache) never survives into the next session.

describe('useLogin', () => {
  it('a late write answer → logout → login: no students query remains', async () => {
    setXsrfCookie()
    let release = () => {}
    let reached = () => {}
    const arrived = new Promise<void>((resolve) => (reached = resolve))
    server.use(
      http.patch('*/api/v1/tutor/students/:sid', async () => {
        reached()
        await new Promise<void>((resolve) => (release = resolve))
        return HttpResponse.json(student({ email: 'tre@example.com', version: 1 }))
      }),
      http.post('*/api/v1/auth/login', () => HttpResponse.json(sessionBody('TUTOR'))),
    )
    const client = createQueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => ({ update: useUpdateStudent(SID), login: useLogin() }), { wrapper })
    let write: Promise<unknown> = Promise.resolve()
    act(() => {
      write = result.current.update.mutateAsync({ version: 0, email: 'tre@example.com' })
    })
    await act(() => arrived)
    // Logout: the whole cache is forgotten (useLogout), then the write's answer arrives and stores the student. Since
    // T-M2.15 scope 8 an answer is stored only while a tutor session is cached: one is (another tab signed the tutor in
    // again meanwhile), so the stale entry exists and the sign-in below must still drop it.
    act(() => {
      client.getQueryCache().clear()
      client.setQueryData(SESSION_KEY, sessionBody('TUTOR'))
    })
    release()
    await act(() => write)
    expect(client.getQueryData(['students', 'detail', SID])).toBeDefined()
    await act(() =>
      result.current.login.mutateAsync({ username: 'co-lan', password: 'x'.repeat(12), rememberMe: false }),
    )
    expect(
      client
        .getQueryCache()
        .getAll()
        .map((q) => q.queryKey),
    ).toEqual([SESSION_KEY])
  })
})
