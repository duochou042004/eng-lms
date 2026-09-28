import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '../../lib/api'
import { changeLocale } from '../../lib/i18n'
import { expectNoAxeViolations } from '../../test/axe'
import { PageHeader } from '../../ui'
import { createQueryClient } from '../queryClient'
import { RootLayout } from '../RootLayout'
import { RouteError } from './RouteError'

const COPY = {
  vi: {
    title: 'Không hiển thị được trang này',
    description: 'Hãy tải lại trang. Nếu lỗi vẫn còn, hãy thử lại sau vài phút.',
    descriptionWithRequestId: 'Hãy tải lại trang. Nếu lỗi vẫn còn, hãy gửi kèm mã yêu cầu khi báo lỗi.',
    requestId: 'Mã yêu cầu: req-42',
    requestIdPattern: /mã yêu cầu/i,
    reload: 'Tải lại trang',
    home: 'Về trang đầu',
  },
  en: {
    title: "This page couldn't be displayed",
    description: 'Reload the page. If the problem continues, try again in a few minutes.',
    descriptionWithRequestId: 'Reload the page. If the problem continues, include the request ID when you report it.',
    requestId: 'Request ID: req-42',
    requestIdPattern: /request id/i,
    reload: 'Reload page',
    home: 'Go to the start page',
  },
} as const

// The app's route structure (router.tsx) with routes that fail on purpose; with `failIndex` the start page fails too.
function renderFailing(path: string, { failIndex = false } = {}) {
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
                loader: failIndex
                  ? () => {
                      throw new Error('start page failed')
                    }
                  : undefined,
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

  for (const lang of ['vi', 'en'] as const) {
    const c = COPY[lang]

    describe(`[${lang}] copy and the way back (T-M1.13 AC4)`, () => {
      beforeEach(async () => {
        await changeLocale(lang)
      })

      it('with a request ID: the request-ID copy, the reload button, then the start-page link', async () => {
        const { container } = renderFailing('/api-failure')
        await screen.findByRole('heading', { level: 1, name: c.title })
        expect(screen.getByText(c.descriptionWithRequestId)).toBeInTheDocument()
        expect(screen.getByText(c.requestId)).toBeInTheDocument()
        const reload = screen.getByRole('button', { name: c.reload })
        const home = screen.getByRole('link', { name: c.home })
        expect(home).toHaveAttribute('href', '/')
        expect(home).toHaveClass('homeLink')
        expect(reload.compareDocumentPosition(home) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        await expectNoAxeViolations(container)
      })

      it('without a request ID: the plain copy and the start-page link', async () => {
        const { container } = renderFailing('/crash')
        await screen.findByRole('heading', { level: 1, name: c.title })
        expect(screen.getByText(c.description)).toBeInTheDocument()
        expect(screen.queryByText(c.requestIdPattern)).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: c.reload })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: c.home })).toHaveAttribute('href', '/')
        await expectNoAxeViolations(container)
      })

      it('has no start-page link when the failed route is the start page', async () => {
        const { container } = renderFailing('/', { failIndex: true })
        await screen.findByRole('heading', { level: 1, name: c.title })
        expect(screen.getByRole('button', { name: c.reload })).toBeInTheDocument()
        expect(screen.queryByRole('link')).not.toBeInTheDocument()
        await expectNoAxeViolations(container)
      })

      it('the link leads to the start page and focuses its h1', async () => {
        const { router } = renderFailing('/')
        await screen.findByRole('heading', { level: 1, name: 'Start' })
        await act(() => router.navigate('/crash'))
        await screen.findByRole('heading', { level: 1, name: c.title })
        await userEvent.click(screen.getByRole('link', { name: c.home }))
        await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Start' })).toHaveFocus())
        expect(router.state.location.pathname).toBe('/')
      })
    })
  }
})
