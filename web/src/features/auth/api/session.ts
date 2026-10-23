import { hashKey, queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { api, ApiError, type components } from '../../../lib/api'
import { postAuthMessage } from './authChannel'

export type Session = components['schemas']['SessionResponse']
type LoginRequest = components['schemas']['LoginRequest']
type ChangePasswordRequest = components['schemas']['ChangePasswordRequest']

export const SESSION_KEY = ['auth', 'session'] as const
const SESSION_HASH = hashKey(SESSION_KEY)

/**
 * `GET /auth/session`: the signed-in user, or `null` when anonymous (401). It also primes the `XSRF-TOKEN` cookie. The
 * root route resolves it before anything else renders (DEC-092: no parallel first requests, so a remember-me rotation
 * cannot race). It changes by sign-in, password change and logout, which update it explicitly, and is read again after
 * another tab's sign-in or sign-out and after a 403 `FORBIDDEN_ROLE` (T-M2.12, `connectAuthProblems`).
 */
export const sessionQuery = queryOptions({
  queryKey: SESSION_KEY,
  queryFn: async (): Promise<Session | null> => {
    try {
      const { data } = await api.GET('/api/v1/auth/session')
      return data as Session
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },
  staleTime: Infinity,
})

export function useSession() {
  return useQuery(sessionQuery)
}

/** The cached session, fetched when there is none yet (route loaders). */
export function ensureSession(queryClient: QueryClient) {
  return queryClient.ensureQueryData(sessionQuery)
}

/** The session read again from the server (after a password change). */
export function refreshSession(queryClient: QueryClient) {
  return queryClient.fetchQuery({ ...sessionQuery, staleTime: 0 })
}

/** `POST /auth/logout`: 204 also for an expired or absent session (FR-AUTH-04). */
export async function logout() {
  await api.POST('/api/v1/auth/logout')
}

/**
 * `POST /auth/login`. On success every other query and every mutation are removed and the session is cached, and the other tabs are told
 * (`signed-in`, no data); a failure leaves the cached (anonymous) session alone.
 */
export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: LoginRequest): Promise<Session> => {
      const { data } = await api.POST('/api/v1/auth/login', { body })
      return data as Session
    },
    onSuccess: (session) => {
      // Nothing of an earlier session survives into this one, e.g. a write answered after its sign-out (AC12 (j)).
      queryClient.removeQueries({ predicate: (query) => query.queryHash !== SESSION_HASH })
      // Nor a write's variables and answer, this sign-in's own password included (T-M2.15 SEC S-1, DEC-144 (2)).
      queryClient.getMutationCache().clear()
      queryClient.setQueryData(SESSION_KEY, session)
      postAuthMessage('signed-in')
    },
  })
}

/** `POST /auth/password` (204); ends every other session of the user. */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (body: ChangePasswordRequest) => {
      await api.POST('/api/v1/auth/password', { body })
    },
  })
}

/**
 * Log out (FR-AUTH-04), then, also when the call failed, forget all server state (queries and mutations), tell the other tabs (`signed-out`) and
 * go to `/login`, whose loader reads the session again (and so re-primes the `XSRF-TOKEN` cookie).
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: logout,
    onSettled: async () => {
      queryClient.getQueryCache().clear()
      queryClient.getMutationCache().clear()
      postAuthMessage('signed-out')
      await navigate('/login')
    },
  })
}
