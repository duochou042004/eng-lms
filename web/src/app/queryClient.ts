import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '../lib/api'

/** Server state lives in TanStack Query only (frontend-architecture §2). Client errors (4xx) are not retried. */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
      },
    },
  })
}
