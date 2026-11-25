import { hashKey, queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { api, ApiError, type components } from '../../../lib/api'
import { applyAccountLocale } from '../../../lib/i18n'
import { postAuthMessage } from './authChannel'

export type Session = components['schemas']['SessionResponse']
type LoginRequest = components['schemas']['LoginRequest']
type ChangePasswordRequest = components['schemas']['ChangePasswordRequest']
export type PreferencesRequest = components['schemas']['PreferencesRequest']

export const SESSION_KEY = ['auth', 'session'] as const
const SESSION_HASH = hashKey(SESSION_KEY)

/**
 * `GET /auth/session`: the signed-in user, or `null` when anonymous (401). It also primes the `XSRF-TOKEN` cookie. The
 * root route resolves it before anything else renders (DEC-092: no parallel first requests, so a remember-me rotation
 * cannot race). It changes by sign-in, password change and logout, which update it explicitly, and is read again after
 * another tab's sign-in or sign-out and after a 403 `FORBIDDEN_ROLE` (T-M2.12, `connectAuthProblems`). The account's
 * locale is applied where the device has no stored choice (T-M2.6 scope 7).
 */
export const sessionQuery = queryOptions({
  queryKey: SESSION_KEY,
  queryFn: async (): Promise<Session | null> => {
    try {
      const { data } = await api.GET('/api/v1/auth/session')
      applyAccountLocale((data as Session).locale)
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

let ownLogoutInFlight = false

/** True from this tab's successful logout until its navigation to `/login` has settled (`useLogout`, T-M2.29 (j)). */
export function isOwnLogoutInFlight() {
  return ownLogoutInFlight
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
      applyAccountLocale(session.locale)
      postAuthMessage('signed-in')
    },
  })
}

/**
 * `PATCH /auth/preferences` (FR-SET-02): only the properties sent change; the answer is the session body, which replaces
 * the cached session while it is still the same user's (an answer that outlived a sign-out lands nowhere, DEC-127).
 * `scope`: saves sharing a scope id run one at a time in call order (the language switcher's, T-M2.32 (e)).
 */
export function useUpdatePreferences({ scope }: { scope?: { id: string } } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    scope,
    mutationFn: async (body: PreferencesRequest): Promise<Session> => {
      const { data } = await api.PATCH('/api/v1/auth/preferences', { body })
      return data as Session
    },
    // Sent also offline, as logout: it fails at once (the page's network alert; the switcher shows nothing) and never
    // replays later (AC11 (c)).
    networkMode: 'always',
    onSuccess: (session) => {
      if (queryClient.getQueryData<Session | null>(SESSION_KEY)?.userId === session.userId)
        queryClient.setQueryData(SESSION_KEY, session)
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
 * Log out (FR-AUTH-04). Sent also offline (`networkMode: 'always'`), so it fails at once instead of pausing with no end
 * (T-M2.13 O-1). On success: forget all server state (queries and mutations), tell the other tabs (`signed-out`) and go
 * to `/login`, whose loader reads the session again (and so re-primes the `XSRF-TOKEN` cookie). On a failure nothing is
 * cleared, posted or navigated: the session is still alive on the server, so the page stays and the caller shows the
 * error (`LogoutFailedAlert`; DEC-155, O-2). The API client's own 401/403 reactions still apply, except one: from the
 * successful call until the navigation to `/login` has settled, a 401 (a query of the page being left) is this logout's
 * own and is ignored (`isOwnLogoutInFlight`, T-M2.29 (j)); the queries such refetches leave behind are removed afterwards. A
 * logout answered 401 never starts it: that session was already lost, and `/login?next=` follows as for any 401.
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: logout,
    networkMode: 'always',
    onSuccess: async () => {
      ownLogoutInFlight = true
      try {
        queryClient.getQueryCache().clear()
        queryClient.getMutationCache().clear()
        postAuthMessage('signed-out')
        await navigate('/login')
      } finally {
        ownLogoutInFlight = false
        // What the race refetched for the page left behind; `/login`'s own (public) queries are in use and stay.
        queryClient.removeQueries({ predicate: (query) => query.queryHash !== SESSION_HASH, type: 'inactive' })
      }
    },
  })
}
