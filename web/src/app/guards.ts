import { hashKey, type QueryClient } from '@tanstack/react-query'
import { redirect, type DataRouter, type LoaderFunctionArgs } from 'react-router'
import { onAuthMessage, postAuthMessage } from '../features/auth/api/authChannel'
import { ensureSession, logout, refreshSession, SESSION_KEY, type Session } from '../features/auth/api/session'
import { loginPath, roleHome, type Role } from '../features/auth/model/redirect'
import { onAuthProblem } from '../lib/api'

/** The path and query of a loader's request (what `?next=` returns to). */
function returnPath(request: Request) {
  const url = new URL(request.url)
  return url.pathname + url.search
}

/**
 * Route guards (T-M2.4 scope 3) as React Router loaders, so protected UI never renders before the decision and every
 * redirect stays inside the router. All of them read the session that the root loader resolves first (DEC-092).
 */
export function createGuards(queryClient: QueryClient) {
  return {
    /** Root: `GET /auth/session` completes before any other API call (no other loader calls the API first). */
    root: () => ensureSession(queryClient),

    /** `/tutor/*`, `/student/*`: anonymous → `/login?next=`; must change → `/change-password`; wrong role → `/forbidden`. */
    requireRole:
      (role: Role) =>
      async ({ request }: LoaderFunctionArgs) => {
        const session = await ensureSession(queryClient)
        if (!session) throw redirect(loginPath(returnPath(request)))
        if (session.mustChangePassword) throw redirect('/change-password')
        if (session.role !== role) throw redirect('/forbidden')
        return null
      },

    /** `/`: the role home, or `/login` (no landing page). */
    home: async () => {
      const session = await ensureSession(queryClient)
      if (!session) throw redirect('/login')
      throw redirect(session.mustChangePassword ? '/change-password' : roleHome(session.role))
    },

    /**
     * `/login`, in this order (DEC-092, T-M2.1 QA F3): a session that must change its password is logged out (and the
     * other tabs are told, T-M2.12) and the form shows; another signed-in visit goes home; else the form. It runs only
     * when the visitor navigates to `/login`: the route opts out of revalidation while its URL is unchanged (router.tsx).
     */
    login: async () => {
      const session = await ensureSession(queryClient)
      if (session?.mustChangePassword) {
        await logout()
        queryClient.setQueryData(SESSION_KEY, null)
        postAuthMessage('signed-out')
        return null
      }
      if (session) throw redirect(roleHome(session.role))
      return null
    },

    /** `/change-password`: signed in only. */
    changePassword: async () => {
      if (!(await ensureSession(queryClient))) throw redirect('/login')
      return null
    },
  }
}

const SESSION_HASH = hashKey(SESSION_KEY)

/** Another user, another role, or signed in vs anonymous. */
function sessionChanged(before: Session | null | undefined, after: Session | null) {
  if (!before || !after) return !before !== !after
  return before.userId !== after.userId || before.role !== after.role
}

/**
 * The tab follows a session that changed under it (T-M2.12): on `/login` with a signed-in session it goes to `/`
 * (whose guard picks the role home or `/change-password`); elsewhere the router revalidates, so the unchanged guards
 * redirect. Never a logout: `/login` does not revalidate while its URL is unchanged.
 */
async function followSession(router: DataRouter, session: Session | null) {
  if (router.state.location.pathname === '/login') {
    if (session) await router.navigate('/', { replace: true })
    return
  }
  await router.revalidate()
}

/**
 * The API client's auth-problem reactions (frontend-architecture §2) and the cross-tab sign-in/out messages. A lost
 * session (401) clears the query and mutation caches and goes to `/login?next=<current path>` (when the path is a safe app path); a
 * forced change goes to `/change-password` with the session read again. A 403 `FORBIDDEN_ROLE` reads the session once
 * (concurrent 403s share the read); only when the user, role or sign-in changed does it drop every cached query but the
 * session (and every cached mutation) and follow it. A message from another tab drops every cached query but the session, reads the session and
 * follows it; so does a page restored from the back/forward cache (`pageshow` with `persisted`). Queries of mounted
 * pages are reset (they refetch for the new session), the others removed. These reactions run one after another; none
 * of them posts a message. Navigation goes through the router
 * only. Returns the unsubscribe (which also closes the channel).
 */
export function connectAuthProblems(router: DataRouter, queryClient: QueryClient) {
  let queue: Promise<unknown> = Promise.resolve()
  const serially = (work: () => Promise<unknown>) => (queue = queue.then(work).catch(() => undefined))
  const notSession = { predicate: (query: { queryHash: string }) => query.queryHash !== SESSION_HASH }
  // Mounted pages' queries are reset (their observers are notified and refetch, AC11 (e)); unused ones are removed.
  const dropAllButSession = () => {
    void queryClient.resetQueries(notSession).catch(() => undefined)
    queryClient.removeQueries({ ...notSession, type: 'inactive' })
    // No write of the earlier session stays cached (T-M2.15 SEC S-1, DEC-144 (2)); a pending one keeps its observers.
    queryClient.getMutationCache().clear()
  }
  let roleCheck: Promise<unknown> | null = null

  const offProblems = onAuthProblem((problem) => {
    const { pathname, search } = router.state.location
    if (problem === 'UNAUTHENTICATED') {
      if (pathname === '/login') return
      queryClient.getQueryCache().clear()
      queryClient.getMutationCache().clear()
      void router.navigate(loginPath(pathname + search))
    } else if (problem === 'FORBIDDEN_ROLE') {
      roleCheck ??= serially(async () => {
        const before = queryClient.getQueryData<Session | null>(SESSION_KEY)
        const after = await refreshSession(queryClient)
        if (!sessionChanged(before, after)) return
        dropAllButSession()
        await followSession(router, after)
      }).finally(() => (roleCheck = null))
    } else if (pathname !== '/change-password') {
      void refreshSession(queryClient)
        .catch(() => undefined)
        // Marked as forced, so an unsaved changes guard lets it through (T-M2.5 AC12 (l)); the user's own link still asks.
        .then(() => router.navigate('/change-password', { state: { forced: true } }))
    }
  })
  const resync = () =>
    void serially(async () => {
      dropAllButSession()
      await followSession(router, await refreshSession(queryClient))
    })
  const offMessages = onAuthMessage(resync)
  // A page restored from the back/forward cache missed the messages sent meanwhile: the same steps (AC11 (f)).
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) resync()
  }
  window.addEventListener('pageshow', onPageShow)
  return () => {
    offProblems()
    offMessages()
    window.removeEventListener('pageshow', onPageShow)
  }
}
