import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { RouterProvider } from 'react-router'
import { createQueryClient } from '../app/queryClient'
import { createTestRouter } from '../app/router'
import { UiProvider } from '../ui'

export function renderWithProviders(ui: ReactElement) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return render(
    <QueryClientProvider client={client}>
      <UiProvider locale="vi">{ui}</UiProvider>
    </QueryClientProvider>,
  )
}

export function renderRoute(path: string) {
  const router = createTestRouter(path)
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  const result = render(
    <QueryClientProvider client={client}>
      <UiProvider locale="vi">
        <RouterProvider router={router} />
      </UiProvider>
    </QueryClientProvider>,
  )
  return { ...result, router }
}
