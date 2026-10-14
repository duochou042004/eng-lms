import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { StrictMode, type ReactElement } from 'react'
import { RouterProvider } from 'react-router'
import { connectAuthProblems } from '../app/guards'
import { createQueryClient } from '../app/queryClient'
import { createTestRouter } from '../app/router'
import { UiProvider } from '../ui'

// Rendered under <StrictMode>, like main.tsx, so effects are replayed on mount as in development (T-M1.9 risk note).

function testQueryClient() {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return client
}

export function renderWithProviders(ui: ReactElement) {
  const client = testQueryClient()
  return render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <UiProvider locale="vi">{ui}</UiProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

const connections = new Set<() => void>()

/** Disconnects every `renderRoute`'s auth reactions and closes its channel (after each test, test/setup.ts). */
export function disconnectAll() {
  for (const disconnect of connections) disconnect()
  connections.clear()
}

/**
 * Renders the app routes in a memory router, with the API client's 401/403 reactions and the cross-tab channel connected as in `App`. `path` may
 * be a history stack; `initialIndex` picks the current entry. The session comes from MSW (`sessionAs` in test/server).
 */
export function renderRoute(path: string | string[], initialIndex?: number) {
  const client = testQueryClient()
  const router = createTestRouter(client, path, initialIndex)
  const disconnect = connectAuthProblems(router, client)
  connections.add(disconnect)
  const result = render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <UiProvider locale="vi">
          <RouterProvider router={router} />
        </UiProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
  return { ...result, router, queryClient: client, disconnect }
}
