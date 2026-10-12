import type { QueryClient } from '@tanstack/react-query'
import {
  createBrowserRouter,
  createMemoryRouter,
  redirect,
  type LoaderFunctionArgs,
  type RouteObject,
} from 'react-router'
import { createGuards } from './guards'
import { RootLayout } from './RootLayout'
import { RouteError } from './routes/RouteError'
import { RouteLoading } from './routes/RouteLoading'

/**
 * Lazy route modules: the tutor and student shells are separate chunks, so a student never downloads tutor code
 * (frontend-architecture §3, NFR-PERF-03). `/dev/ui` exists in development builds only and is tree-shaken from production.
 * The root layout moves focus after client-side navigations; the pathless child's error boundary renders route errors
 * inside it, so focus also moves to the error page's `h1` when a navigation fails.
 *
 * Auth (T-M2.4): the root loader resolves the session before anything renders (DEC-092); the guards are loaders
 * (`app/guards.ts`), so protected UI never renders for the wrong visitor. `/` only redirects (no landing page).
 *
 * Shells (T-M2.11): `/tutor` and `/student` are layout routes (the shell renders an `<Outlet />`). The role guard sits on
 * the parent, so it runs before any child, unknown paths included: the shell's 404 (`*`) never shows to the wrong
 * visitor. Every child imports its shell's module, so each shell stays one lazy chunk.
 */
export function createRoutes(queryClient: QueryClient): RouteObject[] {
  const guard = createGuards(queryClient)
  // React Router runs the parent's and the child's loaders in parallel: the index redirect waits for the role guard, so
  // the guard's redirect (e.g. `/login?next=%2Ftutor`) always wins over the redirect to the role home.
  const indexOf = (role: 'TUTOR' | 'STUDENT', home: string) => async (args: LoaderFunctionArgs) => {
    await guard.requireRole(role)(args)
    return redirect(home)
  }
  return [
    {
      Component: RootLayout,
      errorElement: <RouteError />,
      hydrateFallbackElement: <RouteLoading />,
      loader: guard.root,
      children: [
        {
          errorElement: <RouteError />,
          children: [
            { index: true, loader: guard.home },
            {
              path: 'login',
              loader: guard.login,
              lazy: async () => ({ Component: (await import('./routes/LoginPage')).LoginPage }),
            },
            {
              path: 'change-password',
              loader: guard.changePassword,
              lazy: async () => ({ Component: (await import('./routes/ChangePasswordPage')).ChangePasswordPage }),
            },
            { path: 'forbidden', lazy: async () => ({ Component: (await import('./routes/Forbidden')).Forbidden }) },
            {
              path: 'tutor',
              loader: guard.requireRole('TUTOR'),
              lazy: async () => ({ Component: (await import('./shells/TutorShell')).TutorShell }),
              children: [
                { index: true, loader: indexOf('TUTOR', '/tutor/today') },
                { path: 'today', lazy: async () => ({ Component: (await import('./shells/TutorShell')).TutorToday }) },
                { path: '*', lazy: async () => ({ Component: (await import('./shells/TutorShell')).ShellNotFound }) },
              ],
            },
            {
              path: 'student',
              loader: guard.requireRole('STUDENT'),
              lazy: async () => ({ Component: (await import('./shells/StudentShell')).StudentShell }),
              children: [
                { index: true, loader: indexOf('STUDENT', '/student/home') },
                {
                  path: 'home',
                  lazy: async () => ({ Component: (await import('./shells/StudentShell')).StudentHome }),
                },
                {
                  path: '*',
                  lazy: async () => ({ Component: (await import('./shells/StudentShell')).ShellNotFound }),
                },
              ],
            },
            ...(import.meta.env.DEV
              ? [{ path: 'dev/ui', lazy: async () => ({ Component: (await import('../dev/DevUiPage')).DevUiPage }) }]
              : []),
            { path: '*', lazy: async () => ({ Component: (await import('./routes/NotFound')).NotFound }) },
          ],
        },
      ],
    },
  ]
}

export function createAppRouter(queryClient: QueryClient) {
  return createBrowserRouter(createRoutes(queryClient))
}

/** For tests. */
export function createTestRouter(queryClient: QueryClient, initialPath: string | string[], initialIndex?: number) {
  return createMemoryRouter(createRoutes(queryClient), {
    initialEntries: Array.isArray(initialPath) ? initialPath : [initialPath],
    initialIndex,
  })
}
