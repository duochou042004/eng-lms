import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router'
import { RouteError } from './routes/RouteError'
import { RouteLoading } from './routes/RouteLoading'

/**
 * Lazy route modules: the tutor and student shells are separate chunks, so a student never downloads tutor code
 * (frontend-architecture §3, NFR-PERF-03). `/dev/ui` exists in development builds only and is tree-shaken from production.
 */
export const routes: RouteObject[] = [
  {
    errorElement: <RouteError />,
    hydrateFallbackElement: <RouteLoading />,
    children: [
      { index: true, lazy: async () => ({ Component: (await import('./routes/Landing')).Landing }) },
      { path: 'tutor/*', lazy: async () => ({ Component: (await import('./shells/TutorShell')).TutorShell }) },
      { path: 'student/*', lazy: async () => ({ Component: (await import('./shells/StudentShell')).StudentShell }) },
      ...(import.meta.env.DEV
        ? [{ path: 'dev/ui', lazy: async () => ({ Component: (await import('../dev/DevUiPage')).DevUiPage }) }]
        : []),
      { path: '*', lazy: async () => ({ Component: (await import('./routes/NotFound')).NotFound }) },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}

/** For tests. */
export function createTestRouter(initialPath: string) {
  return createMemoryRouter(routes, { initialEntries: [initialPath] })
}
