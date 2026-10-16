import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../../../test/axe'
import { renderRoute } from '../../../test/render'
import { problem, server, sessionAs } from '../../../test/server'
import { page, row, SID, student } from '../../../test/students'

// T-M2.5 AC8 (header, Profile view, contact links through contactHref, not-found) and AC10 (axe).

function studentApi(answer: () => Response | Promise<Response>) {
  const requests: string[] = []
  server.use(
    sessionAs('TUTOR'),
    http.get('*/api/v1/tutor/students/:sid', ({ params }) => {
      requests.push(String(params.sid))
      return answer()
    }),
    http.get('*/api/v1/tutor/students', () => HttpResponse.json(page([row(1)]))),
  )
  return requests
}

const h1 = (name: string) => screen.findByRole('heading', { level: 1, name })

describe('/tutor/students/:studentId', { timeout: 20_000 }, () => {
  it('shows the header (name h1, status, @username), the Profile view and the note with its line breaks', async () => {
    studentApi(() => HttpResponse.json(student()))
    const { container } = renderRoute(`/tutor/students/${SID}`)
    const heading = await h1('Nguyễn Văn An')
    const header = heading.closest('header')!
    expect(header).toHaveTextContent('Đang học')
    expect(header).toHaveTextContent('@nguyenvanan')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    const personal = screen.getByRole('region', { name: 'Thông tin cá nhân' })
    expect(
      within(personal)
        .getAllByRole('term')
        .map((t) => t.textContent),
    ).toEqual(['Họ tên', 'Tên đăng nhập', 'Trạng thái', 'Ngày thêm'])
    expect(personal).toHaveTextContent(
      new Intl.DateTimeFormat('vi', { dateStyle: 'medium' }).format(new Date(student().createdAt)),
    )
    const note = within(screen.getByRole('region', { name: 'Ghi chú' })).getByText(/Dòng một/)
    expect(note.textContent).toBe('Dòng một\nDòng hai')
    expect(note).toHaveClass('note')
    expect(document.title).toBe('Nguyễn Văn An · Eng-LMS')
    await expectNoAxeViolations(container)
  })

  it('links phone (tel:), email (mailto:) and an https handle (new tab, no opener or referrer), in the header and the contacts', async () => {
    studentApi(() => HttpResponse.json(student()))
    renderRoute(`/tutor/students/${SID}`)
    await h1('Nguyễn Văn An')
    const quick = screen.getByRole('navigation', { name: 'Liên hệ học viên' })
    expect(within(quick).getByRole('link', { name: 'Gọi 0901 234 567' })).toHaveAttribute('href', 'tel:0901234567')
    expect(within(quick).getByRole('link', { name: 'Gửi email tới an@example.com' })).toHaveAttribute(
      'href',
      'mailto:an@example.com',
    )
    const zalo = within(quick).getByRole('link', { name: 'Mở liên kết Zalo https://zalo.me/0901234567' })
    expect(zalo).toHaveAttribute('href', 'https://zalo.me/0901234567')
    expect(zalo).toHaveAttribute('target', '_blank')
    expect(zalo).toHaveAttribute('rel', 'noopener noreferrer')
    expect(zalo).toHaveTextContent('https://zalo.me/0901234567')
    const contacts = screen.getByRole('region', { name: 'Liên hệ' })
    expect(within(contacts).getAllByRole('link')).toHaveLength(3)
  })

  it('shows every other contact value as text with a copy button and no link', async () => {
    const refused = [
      'an.nguyen',
      'http://zalo.me/1',
      'javascript:alert(1)',
      'data:text/html,<b>x</b>',
      'mailto:a@b?cc=c',
      '//evil.example',
    ]
    studentApi(() =>
      HttpResponse.json(
        student({
          email: 'a@b?cc=c',
          phone: '12',
          contactHandles: refused.map((value, i) => ({ label: `Kênh ${i + 1}`, value })),
        }),
      ),
    )
    const { container } = renderRoute(`/tutor/students/${SID}`)
    await h1('Nguyễn Văn An')
    expect(container.querySelectorAll('main a[href]:not([href^="/"])')).toHaveLength(0)
    expect(screen.queryByRole('navigation', { name: 'Liên hệ học viên' })).not.toBeInTheDocument()
    const contacts = screen.getByRole('region', { name: 'Liên hệ' })
    for (const [i, value] of refused.entries()) {
      expect(within(contacts).getByText(value)).toBeInTheDocument()
      expect(within(contacts).getByRole('button', { name: `Sao chép Kênh ${i + 1}` })).toBeInTheDocument()
    }
    expect(within(contacts).getByRole('button', { name: 'Sao chép Email' })).toBeInTheDocument()
    expect(within(contacts).getByRole('button', { name: 'Sao chép Điện thoại' })).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  it('says "Not added" for empty values', async () => {
    studentApi(() => HttpResponse.json(student({ email: null, phone: null, contactHandles: [], note: null })))
    renderRoute(`/tutor/students/${SID}`)
    await h1('Nguyễn Văn An')
    expect(within(screen.getByRole('region', { name: 'Liên hệ' })).getAllByText('Chưa có')).toHaveLength(3)
    expect(within(screen.getByRole('region', { name: 'Ghi chú' })).getByText('Chưa có')).toBeInTheDocument()
  })

  it('an unknown student shows the not-found view inside the shell with a link to Students', async () => {
    studentApi(() => problem(404, 'NOT_FOUND'))
    const { container } = renderRoute(`/tutor/students/${SID}`)
    await h1('Không tìm thấy học viên')
    expect(screen.getByText('Học viên này không tồn tại hoặc bạn không có quyền xem.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về danh sách học viên' })).toHaveAttribute('href', '/tutor/students')
    expect(screen.getByRole('navigation', { name: 'Điều hướng gia sư' })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Không tìm thấy học viên · Eng-LMS'))
    await expectNoAxeViolations(container)
  })

  it('a :studentId that is not a UUID shows the not-found view without a request', async () => {
    const requests = studentApi(() => HttpResponse.json(student()))
    renderRoute('/tutor/students/not-a-uuid')
    await h1('Không tìm thấy học viên')
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(requests).toEqual([])
  })

  it('a failing request shows the inline alert with Retry, which recovers', async () => {
    let fail = true
    studentApi(() => (fail ? problem(500, 'INTERNAL_ERROR') : HttpResponse.json(student())))
    renderRoute(`/tutor/students/${SID}`)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Không tải được thông tin học viên')
    fail = false
    await userEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }))
    await h1('Nguyễn Văn An')
  })

  it('shows the skeleton after 150 ms while loading', async () => {
    studentApi(async () => {
      await delay(400)
      return HttpResponse.json(student())
    })
    renderRoute(`/tutor/students/${SID}`)
    const region = await screen.findByRole('status', { name: 'Đang tải thông tin học viên' })
    const skeletons = within(region).getAllByTestId('skeleton')[0]!.parentElement!
    expect(skeletons).toHaveStyle({ visibility: 'hidden' })
    await waitFor(() => expect(skeletons).not.toHaveStyle({ visibility: 'hidden' }))
    await h1('Nguyễn Văn An')
  })

  it('opened from the list, it focuses its h1 once loaded; Back to students keeps the list view', async () => {
    studentApi(async () => {
      await delay(200)
      return HttpResponse.json(student())
    })
    server.use(
      http.get('*/api/v1/tutor/students', () =>
        HttpResponse.json(page([row(1, { id: SID, fullName: 'Nguyễn Văn An' })])),
      ),
    )
    const { router } = renderRoute('/tutor/students?q=an&sort=newest')
    await userEvent.click(await screen.findByRole('link', { name: 'Nguyễn Văn An' }))
    const heading = await h1('Nguyễn Văn An')
    await waitFor(() => expect(heading).toHaveFocus())
    await userEvent.click(screen.getByRole('link', { name: 'Về danh sách học viên' }))
    await h1('Học viên')
    expect(router.state.location.pathname + router.state.location.search).toBe('/tutor/students?q=an&sort=newest')
  })

  it('a first load keeps focus on the body', async () => {
    studentApi(() => HttpResponse.json(student()))
    renderRoute(`/tutor/students/${SID}`)
    await h1('Nguyễn Văn An')
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(document.activeElement).toBe(document.body)
  })
})
