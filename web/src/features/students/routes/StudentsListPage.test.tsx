import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../../../test/axe'
import { renderRoute } from '../../../test/render'
import { problem, server, sessionAs } from '../../../test/server'
import { page, row } from '../../../test/students'
import { setViewportWidth } from '../../../test/viewport'

// T-M2.5 AC1 (nav), AC2 (list, controls in the URL, fallbacks), AC3 (table/list), AC4 (states), AC10 (axe).

type Answer = (params: URLSearchParams) => Response | Promise<Response>

/** `GET /tutor/students` answered by `answer`; every request's query is recorded. */
function listApi(answer: Answer) {
  const requests: URLSearchParams[] = []
  server.use(
    sessionAs('TUTOR'),
    http.get('*/api/v1/tutor/students', async ({ request }) => {
      const params = new URL(request.url).searchParams
      requests.push(params)
      return answer(params)
    }),
  )
  return requests
}

const twentyFive = Array.from({ length: 25 }, (_, i) => row(i + 1))
const h1 = () => screen.findByRole('heading', { level: 1, name: 'Học viên' })
const search = (router: { state: { location: { search: string } } }) => router.state.location.search
// Role queries over a 25-row table are slow on a busy runner (the gate's parallel suite): a longer wait, same assertion.
const findLink = (name: string) => screen.findByRole('link', { name }, { timeout: 5000 })
const isCount = (p: URLSearchParams) => p.get('size') === '1'

describe('/tutor/students', { timeout: 20_000 }, () => {
  it('is the Students item of the tutor navigation (current on the students pages) and lists the rows as a table', async () => {
    const requests = listApi(() => HttpResponse.json(page([row(1, { email: null }), row(2, { status: 'PAUSED' })])))
    const { container } = renderRoute('/tutor/students')
    await h1()
    const nav = screen.getByRole('navigation', { name: 'Điều hướng gia sư' })
    expect(within(nav).getByRole('link', { name: 'Học viên' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Hôm nay' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Thêm học viên' })).toHaveAttribute('href', '/tutor/students/new')
    const table = await screen.findByRole('table', { name: 'Học viên' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Họ tên', 'Trạng thái', 'Email', 'Điện thoại'])
    const first = within(table).getAllByRole('row')[1]!
    expect(within(first).getByRole('link', { name: 'Học viên 01' })).toHaveAttribute(
      'href',
      `/tutor/students/${row(1).id}`,
    )
    // No Username column (AC12 (q)): `@username` is the name cell's second line.
    expect(within(first).getByRole('rowheader')).toHaveTextContent('Học viên 01 @hocvien1')
    expect(first).toHaveTextContent('Đang học')
    expect(first).toHaveTextContent('0901 000 001')
    expect(within(table).getAllByRole('row')[2]).toHaveTextContent('Tạm nghỉ')
    expect(Object.fromEntries(requests[0]!)).toEqual({ page: '0', size: '25', sort: 'fullName,asc' })
    expect(document.title).toBe('Học viên · Eng-LMS')
    await expectNoAxeViolations(container)
  })

  it('renders the rows as a list below 768 px', async () => {
    setViewportWidth(360)
    listApi(() => HttpResponse.json(page([row(1)])))
    const { container } = renderRoute('/tutor/students')
    const list = await screen.findByRole('list', { name: 'Học viên' })
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const item = within(list).getByRole('listitem')
    // The title row carries the name, `@username` and the badge; the meta line has no username (AC12 (e), (q)).
    expect(item.firstElementChild).toHaveTextContent('Học viên 01 @hocvien1Đang học')
    expect(item.lastElementChild).toHaveTextContent('Email: hv1@example.comĐiện thoại: 0901 000 001')
    expect(item.lastElementChild).not.toHaveTextContent('hocvien1')
    await expectNoAxeViolations(container)
  })

  it('searches 300 ms after typing (server-side), keeps focus in the box and puts q in the URL', async () => {
    const requests = listApi((p) =>
      HttpResponse.json(page(p.get('q') ? [row(7, { fullName: 'Nguyễn Văn An' })] : twentyFive, { totalItems: 25 })),
    )
    const { router } = renderRoute('/tutor/students')
    await findLink('Học viên 01')
    const box = screen.getByRole('searchbox', { name: 'Tìm kiếm' })
    await userEvent.type(box, ' nguyen ')
    await findLink('Nguyễn Văn An')
    expect(search(router)).toBe('?q=nguyen')
    expect(box).toHaveFocus()
    // One request for the whole word (debounced), trimmed.
    expect(requests.filter((p) => p.has('q')).map((p) => p.get('q'))).toEqual(['nguyen'])
  })

  it('Include archived adds ARCHIVED; Newest sorts by creation; both are in the URL and restored by Back', async () => {
    const requests = listApi(() => HttpResponse.json(page([row(1)])))
    const { router } = renderRoute('/tutor/students')
    await findLink('Học viên 01')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Gồm cả học viên đã lưu trữ' }))
    await waitFor(() => expect(search(router)).toBe('?archived=1'))
    await waitFor(() => expect(requests.at(-1)!.getAll('status')).toEqual(['ACTIVE', 'PAUSED', 'ARCHIVED']))
    await userEvent.click(screen.getByRole('radio', { name: 'Mới nhất' }))
    await waitFor(() => expect(search(router)).toBe('?archived=1&sort=newest'))
    await waitFor(() => expect(requests.at(-1)!.get('sort')).toBe('createdAt,desc'))
    await act(() => router.navigate(-1))
    expect(search(router)).toBe('?archived=1')
    expect(screen.getByRole('radio', { name: 'Tên' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('checkbox', { name: 'Gồm cả học viên đã lưu trữ' })).toBeChecked()
    await act(() => router.navigate(-1))
    expect(screen.getByRole('checkbox', { name: 'Gồm cả học viên đã lưu trữ' })).not.toBeChecked()
  })

  it('pages with Previous / Next (25 per page, "Page n of m", the URL page is 1-based)', async () => {
    const requests = listApi((p) => {
      const n = Number(p.get('page'))
      return HttpResponse.json(page(n === 0 ? twentyFive : [row(26)], { page: n, totalItems: 26 }))
    })
    const { router } = renderRoute('/tutor/students')
    await findLink('Học viên 01')
    const pages = screen.getByRole('navigation', { name: 'Phân trang' })
    expect(pages).toHaveTextContent('Trang 1 / 2')
    // The number group never breaks (AC12 (r)): non-breaking spaces around "/".
    expect(within(pages).getByText(/^Trang 1/).textContent).toBe('Trang 1\u00a0/\u00a02')
    expect(within(pages).getByRole('button', { name: 'Trang trước' })).toBeDisabled()
    await userEvent.click(within(pages).getByRole('button', { name: 'Trang sau' }))
    await findLink('Học viên 26')
    expect(search(router)).toBe('?page=2')
    expect(requests.at(-1)!.get('page')).toBe('1')
    expect(screen.getByRole('navigation', { name: 'Phân trang' })).toHaveTextContent('Trang 2 / 2')
    await userEvent.click(screen.getByRole('button', { name: 'Trang trước' }))
    await findLink('Học viên 01')
    expect(search(router)).toBe('')
  })

  it('a page change keeps focus on a pager button (never the body), scrolls to the list top and announces the page (AC12 (a), (b))', async () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    try {
      listApi((p) => {
        const n = Number(p.get('page'))
        return HttpResponse.json(page(n === 0 ? twentyFive : [row(26)], { page: n, totalItems: 26 }))
      })
      renderRoute('/tutor/students')
      await findLink('Học viên 01')
      const pages = screen.getByRole('navigation', { name: 'Phân trang' })
      const previous = within(pages).getByRole('button', { name: 'Trang trước' })
      const next = within(pages).getByRole('button', { name: 'Trang sau' })
      expect(within(pages).getByRole('status')).toBeEmptyDOMElement()
      await userEvent.click(next)
      await waitFor(() => expect(next).toBeDisabled())
      await waitFor(() => expect(previous).toHaveFocus())
      expect(within(pages).getByRole('status')).toHaveTextContent('Trang 2 / 2')
      expect(scroll).toHaveBeenCalledWith({ block: 'start' })
      await findLink('Học viên 26')
      await userEvent.keyboard('{Enter}')
      await waitFor(() => expect(previous).toBeDisabled())
      await waitFor(() => expect(next).toHaveFocus())
      expect(within(pages).getByRole('status')).toHaveTextContent('Trang 1 / 2')
      expect(document.activeElement).not.toBe(document.body)
    } finally {
      delete (Element.prototype as Partial<Element>).scrollIntoView
    }
  })

  it.each(['page=-1', 'page=abc', 'sort=x', 'page=0&sort=&archived=yes'])(
    'shows the default view for garbage params (%s), never an error',
    async (params) => {
      const requests = listApi(() => HttpResponse.json(page([row(1)])))
      renderRoute(`/tutor/students?${params}`)
      await findLink('Học viên 01')
      expect(Object.fromEntries(requests[0]!)).toEqual({ page: '0', size: '25', sort: 'fullName,asc' })
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    },
  )

  it('replaces a page past the last one with the last page', async () => {
    listApi((p) => {
      const n = Number(p.get('page'))
      return HttpResponse.json(page(n === 1 ? [row(26)] : [], { page: n, totalItems: 26 }))
    })
    const { router } = renderRoute('/tutor/students?page=99')
    await findLink('Học viên 26')
    expect(search(router)).toBe('?page=2')
    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('searches without the control characters of q', async () => {
    const requests = listApi(() => HttpResponse.json(page([row(1)])))
    renderRoute('/tutor/students?q=%01an%7F')
    await findLink('Học viên 01')
    expect(requests[0]!.get('q')).toBe('an')
    expect(screen.getByRole('searchbox', { name: 'Tìm kiếm' })).toHaveValue('an')
  })
})

describe('/tutor/students states (interaction-states §1)', { timeout: 20_000 }, () => {
  it('shows the row skeleton only after 150 ms, in a busy labelled region', async () => {
    listApi(async () => {
      await delay(400)
      return HttpResponse.json(page([row(1)]))
    })
    renderRoute('/tutor/students')
    await h1()
    const region = await screen.findByRole('status', { name: 'Đang tải danh sách học viên' })
    expect(region).toHaveAttribute('aria-busy', 'true')
    const skeleton = within(region).getAllByTestId('skeleton')[0]!.parentElement!
    expect(skeleton).toHaveStyle({ visibility: 'hidden' })
    await waitFor(() => expect(skeleton).not.toHaveStyle({ visibility: 'hidden' }))
    await findLink('Học viên 01')
  })

  it('first use (no student in any status): one count request decides; one primary action', async () => {
    const requests = listApi((p) => HttpResponse.json(page([], { size: isCount(p) ? 1 : 25 })))
    const { container } = renderRoute('/tutor/students')
    const empty = await screen.findByRole('heading', { level: 2, name: 'Thêm học viên đầu tiên' })
    expect(empty.parentElement).toHaveTextContent('tài khoản riêng')
    expect(screen.getAllByRole('link', { name: 'Thêm học viên' })).toHaveLength(1)
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    const count = requests.find(isCount)!
    expect(count.getAll('status')).toEqual(['ACTIVE', 'PAUSED', 'ARCHIVED'])
    expect(requests).toHaveLength(2)
    await expectNoAxeViolations(container)
  })

  it('with Include archived on and no q, an empty list is first use directly (no count request)', async () => {
    const requests = listApi(() => HttpResponse.json(page([])))
    renderRoute('/tutor/students?archived=1&sort=newest')
    await screen.findByRole('heading', { level: 2, name: 'Thêm học viên đầu tiên' })
    expect(requests.filter(isCount)).toHaveLength(0)
  })

  it('only archived students: "No active or paused students" with Include archived', async () => {
    listApi((p) =>
      HttpResponse.json(
        isCount(p)
          ? page([row(9, { status: 'ARCHIVED' })], { size: 1, totalItems: 3 })
          : p.has('status')
            ? page([row(9, { status: 'ARCHIVED' })])
            : page([]),
      ),
    )
    const { router, container } = renderRoute('/tutor/students')
    await screen.findByRole('heading', { level: 2, name: 'Không có học viên đang học hoặc tạm nghỉ' })
    await expectNoAxeViolations(container)
    await userEvent.click(screen.getByRole('button', { name: 'Gồm cả học viên đã lưu trữ' }))
    await findLink('Học viên 09')
    expect(search(router)).toBe('?archived=1')
    expect(screen.getByText('Đã lưu trữ')).toBeInTheDocument()
  })

  it('filtered empty: the query and Clear filters, which resets the URL params and focuses the search', async () => {
    listApi((p) => HttpResponse.json(page(p.get('q') ? [] : [row(1)])))
    const { router, container } = renderRoute('/tutor/students?q=xyz&archived=1&sort=newest')
    await screen.findByRole('heading', { level: 2, name: 'Không có học viên nào khớp với “xyz”' })
    await expectNoAxeViolations(container)
    await userEvent.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }))
    await findLink('Học viên 01')
    expect(search(router)).toBe('')
    const box = screen.getByRole('searchbox', { name: 'Tìm kiếm' })
    expect(box).toHaveValue('')
    expect(box).toHaveFocus()
  })

  it('a refetch keeps the rows and shows the progress line after 150 ms', async () => {
    listApi(async (p) => {
      if (p.get('sort') === 'createdAt,desc') await delay(500)
      return HttpResponse.json(page([row(p.get('sort') === 'createdAt,desc' ? 2 : 1)]))
    })
    renderRoute('/tutor/students')
    await findLink('Học viên 01')
    expect(screen.queryByTestId('progress-line')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Mới nhất' }))
    expect(await screen.findByTestId('progress-line')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Học viên 01' })).toBeInTheDocument()
    await findLink('Học viên 02')
    await waitFor(() => expect(screen.queryByTestId('progress-line')).not.toBeInTheDocument())
  })

  it('a failing request shows an inline alert with Retry, and Retry recovers', async () => {
    let fail = true
    listApi(() => (fail ? problem(500, 'INTERNAL_ERROR') : HttpResponse.json(page([row(1)]))))
    const { container } = renderRoute('/tutor/students')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Không tải được danh sách học viên')
    await expectNoAxeViolations(container)
    fail = false
    await userEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }))
    await findLink('Học viên 01')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('a failing refetch of the same view keeps the cached rows beside the alert', async () => {
    let fail = false
    listApi(() => (fail ? problem(503, 'INTERNAL_ERROR') : HttpResponse.json(page([row(1)]))))
    const { queryClient } = renderRoute('/tutor/students')
    await findLink('Học viên 01')
    fail = true
    await act(() => queryClient.refetchQueries({ queryKey: ['students', 'list'] }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được danh sách học viên')
    expect(screen.getByRole('link', { name: 'Học viên 01' })).toBeInTheDocument()
  })
})
