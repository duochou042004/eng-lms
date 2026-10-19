import type { QueryClient } from '@tanstack/react-query'

/** The auth feature's session key, read by key (features do not import each other, frontend-architecture §1). */
const SESSION_KEY = ['auth', 'session'] as const

/**
 * Whether the cached session is the tutor's (T-M2.15 scope 8, DEC-127): a students write stores its answer, invalidates,
 * toasts and moves focus only then, so an answer that arrives after a sign-out (and the next sign-in as a student)
 * never lands in the query cache.
 */
export function isTutorSession(queryClient: QueryClient) {
  const session = queryClient.getQueryData<{ role?: unknown } | null>(SESSION_KEY)
  return session?.role === 'TUTOR'
}
