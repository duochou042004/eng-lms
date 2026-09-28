import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { StrictMode, type ReactElement } from 'react'
import { RouterProvider } from 'react-router'
import { createQueryClient } from '../app/queryClient'
import { createTestRouter } from '../app/router'
import { UiProvider } from '../ui'

// Rendered under <StrictMode>, like main.tsx, so effects are replayed on mount as in development (T-M1.9 risk note).

export function renderWithProviders(ui: ReactElement) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <UiProvider locale="vi">{ui}</UiProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

/** Renders the app routes in a memory router. `path` may be a history stack; `initialIndex` picks the current entry. */
export function renderRoute(path: string | string[], initialIndex?: number) {
  const router = createTestRouter(path, initialIndex)
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  const result = render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <UiProvider locale="vi">
          <RouterProvider router={router} />
        </UiProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
  return { ...result, router }
}
