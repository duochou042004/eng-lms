import type { QueryClient } from '@tanstack/react-query'
import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router'
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
 */
export function createRoutes(queryClient: QueryClient): RouteObject[] {
  const guard = createGuards(queryClient)
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
              path: 'tutor/*',
              loader: guard.requireRole('TUTOR'),
              lazy: async () => ({ Component: (await import('./shells/TutorShell')).TutorShell }),
            },
            {
              path: 'student/*',
              loader: guard.requireRole('STUDENT'),
              lazy: async () => ({ Component: (await import('./shells/StudentShell')).StudentShell }),
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
