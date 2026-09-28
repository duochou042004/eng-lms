import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../../lib/api'
import { expectNoAxeViolations } from '../../test/axe'
import { PageHeader } from '../../ui'
import { createQueryClient } from '../queryClient'
import { RootLayout } from '../RootLayout'
import { RouteError } from './RouteError'

// The app's route structure (router.tsx) with routes that fail on purpose.
function renderFailing(path: string) {
  const router = createMemoryRouter(
    [
      {
        Component: RootLayout,
        children: [
          {
            errorElement: <RouteError />,
            children: [
              {
                index: true,
                element: (
                  <main>
                    <PageHeader title="Start" />
                  </main>
                ),
              },
              {
                path: 'api-failure',
                loader: () => {
                  throw new ApiError(500, 'INTERNAL_ERROR', 'req-42')
                },
                element: null,
              },
              {
                path: 'crash',
                loader: () => {
                  throw new Error('boom')
                },
                element: null,
              },
            ],
          },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  const result = render(
    <StrictMode>
      <QueryClientProvider client={createQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
  return { ...result, router }
}

describe('RouteError (DEC-045 N4)', () => {
  it('asks for the request ID only when one is shown', async () => {
    const { container } = renderFailing('/api-failure')
    expect(await screen.findByRole('heading', { level: 1, name: 'Không hiển thị được trang này' })).toBeInTheDocument()
    expect(
      screen.getByText('Hãy tải lại trang. Nếu lỗi vẫn còn, hãy gửi kèm mã yêu cầu khi báo lỗi.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Mã yêu cầu: req-42')).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Không hiển thị được trang này · Eng-LMS'))
    expect(document.activeElement).toBe(document.body)
    await expectNoAxeViolations(container)
  })

  it('uses the copy without the request-ID sentence when there is no request ID', async () => {
    renderFailing('/crash')
    await screen.findByRole('heading', { level: 1, name: 'Không hiển thị được trang này' })
    expect(screen.getByText('Hãy tải lại trang. Nếu lỗi vẫn còn, hãy thử lại sau vài phút.')).toBeInTheDocument()
    expect(screen.queryByText(/mã yêu cầu/i)).not.toBeInTheDocument()
  })

  it('moves focus to the error page h1 when a client-side navigation fails', async () => {
    const { router } = renderFailing('/')
    await screen.findByRole('heading', { level: 1, name: 'Start' })
    await act(() => router.navigate('/api-failure'))
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Không hiển thị được trang này' })).toHaveFocus(),
    )
  })
})
