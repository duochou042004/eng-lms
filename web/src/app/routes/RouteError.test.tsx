import { QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { changeLocale } from '../../lib/i18n'
import { expectNoAxeViolations } from '../../test/axe'
import { PageHeader } from '../../ui'
import { createQueryClient } from '../queryClient'
import { RootLayout } from '../RootLayout'
import { server } from '../../test/server'
import { isChunkLoadError } from './chunkError'
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

const CHUNK_MESSAGE = 'Failed to fetch dynamically imported module: http://localhost:3000/assets/StudentShell-x1.js'

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
                path: 'chunk',
                lazy: () => Promise.reject(new TypeError(CHUNK_MESSAGE)),
              },
              {
                path: '*',
                lazy: () => Promise.reject(new TypeError(CHUNK_MESSAGE)),
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

describe('RouteError: a page whose code could not load (T-M2.12 AC2, AC3, DEC-087 F-3)', () => {
  const CHUNK = {
    vi: {
      offlineTitle: 'Bạn đang ngoại tuyến',
      chunkTitle: 'Không tải được trang này',
      offline: 'Bạn đang ngoại tuyến. Trang này cần kết nối mạng để tải.',
      chunk: 'Không tải được trang này. Hãy kiểm tra kết nối mạng rồi thử lại.',
      retry: 'Thử lại',
    },
    en: {
      offlineTitle: "You're offline",
      chunkTitle: "This page couldn't load",
      offline: "You're offline. This page needs a connection to load.",
      chunk: "This page couldn't load. Check your connection and try again.",
      retry: 'Try again',
    },
  } as const
  let online = true
  const location = { reload: vi.fn(), assign: vi.fn(), replace: vi.fn(), hrefSet: vi.fn() }

  beforeEach(() => {
    online = true
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online)
    for (const fn of Object.values(location)) fn.mockReset()
    vi.stubGlobal('location', {
      origin: 'http://localhost:3000',
      reload: location.reload,
      assign: location.assign,
      replace: location.replace,
      set href(value: string) {
        location.hrefSet(value)
      },
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it("recognises the engines' dynamic-import errors and Vite's preload error, nothing else", () => {
    for (const message of [
      CHUNK_MESSAGE,
      'error loading dynamically imported module: http://x/assets/A.js',
      'Importing a module script failed.',
      'Unable to preload CSS for /assets/A.css',
    ])
      expect(isChunkLoadError(new TypeError(message))).toBe(true)
    expect(isChunkLoadError(new Error('boom'))).toBe(false)
    expect(isChunkLoadError(new ApiError(500, 'INTERNAL_ERROR', 'r'))).toBe(false)
    expect(isChunkLoadError('Importing a module script failed.')).toBe(false)
  })

  for (const lang of ['vi', 'en'] as const) {
    const c = { ...COPY[lang], ...CHUNK[lang] }

    it(`[${lang}] online: the couldn't-load copy, Retry and the start-page link; no request ID; axe clean`, async () => {
      await changeLocale(lang)
      const { container } = renderFailing('/chunk')
      await screen.findByRole('heading', { level: 1, name: c.chunkTitle })
      await waitFor(() => expect(document.title).toBe(`${c.chunkTitle} · Eng-LMS`))
      expect(screen.getByText(c.chunk)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: c.retry })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: c.reload })).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: c.home })).toHaveAttribute('href', '/')
      expect(screen.queryByText(c.requestIdPattern)).not.toBeInTheDocument()
      await expectNoAxeViolations(container)
    })

    it(`[${lang}] offline: the offline copy for any route error, also one with a request ID`, async () => {
      await changeLocale(lang)
      online = false
      const { container } = renderFailing('/api-failure')
      await screen.findByRole('heading', { level: 1, name: c.offlineTitle })
      await waitFor(() => expect(document.title).toBe(`${c.offlineTitle} · Eng-LMS`))
      expect(screen.getByText(c.offline)).toBeInTheDocument()
      expect(screen.queryByText(c.requestIdPattern)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: c.retry })).toBeInTheDocument()
      await expectNoAxeViolations(container)
    })
  }

  it('Retry while offline keeps the page, announces the offline message again and sends no request (AC3)', async () => {
    const requests: string[] = []
    server.events.on('request:start', ({ request }) => requests.push(request.url))
    online = false
    renderFailing('/chunk')
    await screen.findByRole('heading', { level: 1, name: CHUNK.vi.offlineTitle })
    const status = within(screen.getByRole('main')).getByRole('status')
    expect(status).toHaveTextContent('')
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(status).toHaveTextContent(CHUNK.vi.offline)
    const first = status.firstElementChild
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    // A new node, so screen readers announce it again.
    expect(status.firstElementChild).not.toBe(first)
    expect(status).toHaveTextContent(CHUNK.vi.offline)
    expect(screen.getByRole('heading', { level: 1, name: CHUNK.vi.offlineTitle })).toBeInTheDocument()
    expect(requests).toEqual([])
    expect(location.reload).not.toHaveBeenCalled()
  })

  it('Retry online reloads the failed URL in full, never building one (assign/href), even for a //host path (N-1)', async () => {
    renderFailing('//evil.example/x')
    await screen.findByRole('heading', { level: 1, name: CHUNK.vi.chunkTitle })
    expect(screen.getByText(CHUNK.vi.chunk)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(location.reload).toHaveBeenCalledTimes(1)
    expect(location.assign).not.toHaveBeenCalled()
    expect(location.replace).not.toHaveBeenCalled()
    expect(location.hrefSet).not.toHaveBeenCalled()
  })

  it('back online after an offline failure: Retry reloads', async () => {
    online = false
    renderFailing('/chunk')
    await screen.findByText(CHUNK.vi.offline)
    online = true
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(location.reload).toHaveBeenCalledTimes(1)
  })

  it('reloads nothing on its own: the online event changes nothing', async () => {
    online = false
    renderFailing('/chunk')
    await screen.findByText(CHUNK.vi.offline)
    online = true
    act(() => void window.dispatchEvent(new Event('online')))
    expect(location.reload).not.toHaveBeenCalled()
  })

  it('the copy follows the connection while shown (AC11 (a)); Retry still decides by the state at the press', async () => {
    online = false
    renderFailing('/chunk')
    await screen.findByRole('heading', { level: 1, name: CHUNK.vi.offlineTitle })
    online = true
    act(() => void window.dispatchEvent(new Event('online')))
    // Polling reads: the re-render after a connection event can land late under the full suite's load (DEC-153, L-05).
    expect(await screen.findByRole('heading', { level: 1, name: CHUNK.vi.chunkTitle })).toBeInTheDocument()
    expect(await screen.findByText(CHUNK.vi.chunk)).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe(`${CHUNK.vi.chunkTitle} · Eng-LMS`))
    online = false
    act(() => void window.dispatchEvent(new Event('offline')))
    expect(await screen.findByRole('heading', { level: 1, name: CHUNK.vi.offlineTitle })).toBeInTheDocument()
    expect(await screen.findByText(CHUNK.vi.offline)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(location.reload).not.toHaveBeenCalled()
    expect(location.assign).not.toHaveBeenCalled()
  })

  it('Retry and the generic Reload are primary buttons; the start-page link stays the quiet link (AC11 (c))', async () => {
    renderFailing('/chunk')
    await screen.findByRole('heading', { level: 1, name: CHUNK.vi.chunkTitle })
    expect(screen.getByRole('button', { name: 'Thử lại' })).toHaveClass('button', 'primary')
    expect(screen.getByRole('link', { name: COPY.vi.home })).toHaveClass('homeLink')
    cleanup()
    renderFailing('/crash')
    await screen.findByRole('heading', { level: 1, name: COPY.vi.title })
    expect(screen.getByRole('button', { name: COPY.vi.reload })).toHaveClass('button', 'primary')
    expect(screen.getByRole('link', { name: COPY.vi.home })).toHaveClass('homeLink')
  })
})
