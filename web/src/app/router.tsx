import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router'
import { RootLayout } from './RootLayout'
import { RouteError } from './routes/RouteError'
import { RouteLoading } from './routes/RouteLoading'

/**
 * Lazy route modules: the tutor and student shells are separate chunks, so a student never downloads tutor code
 * (frontend-architecture §3, NFR-PERF-03). `/dev/ui` exists in development builds only and is tree-shaken from production.
 * The root layout moves focus after client-side navigations; the pathless child's error boundary renders route errors
 * inside it, so focus also moves to the error page's `h1` when a navigation fails.
 */
export const routes: RouteObject[] = [
  {
    Component: RootLayout,
    errorElement: <RouteError />,
    hydrateFallbackElement: <RouteLoading />,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { index: true, lazy: async () => ({ Component: (await import('./routes/Landing')).Landing }) },
          { path: 'tutor/*', lazy: async () => ({ Component: (await import('./shells/TutorShell')).TutorShell }) },
          {
            path: 'student/*',
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

export function createAppRouter() {
  return createBrowserRouter(routes)
}

/** For tests. */
export function createTestRouter(initialPath: string | string[], initialIndex?: number) {
  return createMemoryRouter(routes, {
    initialEntries: Array.isArray(initialPath) ? initialPath : [initialPath],
    initialIndex,
  })
}
