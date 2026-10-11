import type { QueryClient } from '@tanstack/react-query'
import { redirect, type DataRouter, type LoaderFunctionArgs } from 'react-router'
import { ensureSession, logout, refreshSession, SESSION_KEY } from '../features/auth/api/session'
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
     * `/login`, in this order (DEC-092, T-M2.1 QA F3): a session that must change its password is logged out and the
     * form shows; another signed-in visit goes home; else the form.
     */
    login: async () => {
      const session = await ensureSession(queryClient)
      if (session?.mustChangePassword) {
        await logout()
        queryClient.setQueryData(SESSION_KEY, null)
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

/**
 * The API client's 401 and 403 `PASSWORD_CHANGE_REQUIRED` reactions (frontend-architecture §2): a lost session clears
 * the query cache and goes to `/login?next=<current path>` (when the path is a safe app path); a forced change goes to
 * `/change-password` with the session read again. Navigation goes through the router only. Returns the unsubscribe.
 */
export function connectAuthProblems(router: DataRouter, queryClient: QueryClient) {
  return onAuthProblem((problem) => {
    const { pathname, search } = router.state.location
    if (problem === 'UNAUTHENTICATED') {
      if (pathname === '/login') return
      queryClient.getQueryCache().clear()
      void router.navigate(loginPath(pathname + search))
    } else if (pathname !== '/change-password') {
      void refreshSession(queryClient)
        .catch(() => undefined)
        .then(() => router.navigate('/change-password'))
    }
  })
}
