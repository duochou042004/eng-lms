import { act, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { setViewportWidth } from '../test/viewport'
import { DataList } from './DataList'

const columns = [
  { id: 'name', header: 'Họ tên' },
  { id: 'username', header: 'Tên đăng nhập' },
  { id: 'email', header: 'Email' },
] as const
const rows = [
  { id: '1', cells: { name: <a href="/a">Nguyễn Văn An</a>, username: 'nguyenvanan', email: 'an@example.com' } },
  { id: '2', cells: { name: <a href="/b">Trần Bình</a>, username: 'tranbinh', email: null } },
]

describe('DataList', () => {
  it('at ≥ 768 px is a table with a caption, column headers and the first cell as the row header', async () => {
    setViewportWidth(768)
    const { container } = render(<DataList label="Học viên" columns={columns} rows={rows} />)
    const table = screen.getByRole('table', { name: 'Học viên' })
    // Without widths: the automatic layout, no colgroup.
    expect(table).not.toHaveClass('fixed')
    expect(table.querySelector('colgroup')).toBeNull()
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Họ tên', 'Tên đăng nhập', 'Email'])
    expect(within(table).getAllByRole('rowheader')[0]).toHaveTextContent('Nguyễn Văn An')
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    await expectNoAxeViolations(container)
  })

  it('below 768 px is a list: the first column as the title, the others on a meta line led by their hidden headers', async () => {
    setViewportWidth(767)
    const { container } = render(<DataList label="Học viên" columns={columns} rows={rows} />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Học viên' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Nguyễn Văn AnTên đăng nhập: nguyenvananEmail: an@example.com')
    // An empty value is left out.
    expect(items[1]).not.toHaveTextContent('Email')
    await expectNoAxeViolations(container)
  })

  it('switches between the two when the viewport crosses 768 px', () => {
    setViewportWidth(1024)
    render(<DataList label="Học viên" columns={columns} rows={rows} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
    act(() => setViewportWidth(360))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Học viên' })).toBeInTheDocument()
  })

  it('gives columns fixed shares (fixed layout) and shows an inTitle column beside the list title (AC12 (e), (t))', () => {
    const cols = [
      { id: 'name', header: 'Họ tên', width: '50%' },
      { id: 'status', header: 'Trạng thái', width: '20%', inTitle: true },
      { id: 'phone', header: 'Điện thoại', width: '30%' },
    ] as const
    const data = [{ id: '1', cells: { name: 'An', status: <span>Đang học</span>, phone: '0901 234 567' } }]
    setViewportWidth(1024)
    const { unmount } = render(<DataList label="Học viên" columns={cols} rows={data} />)
    expect(screen.getByRole('table')).toHaveClass('fixed')
    expect([...document.querySelectorAll('col')].map((c) => c.style.inlineSize)).toEqual(['50%', '20%', '30%'])
    unmount()
    setViewportWidth(360)
    render(<DataList label="Học viên" columns={cols} rows={data} />)
    const item = screen.getByRole('listitem')
    expect(item.firstElementChild).toHaveTextContent('AnĐang học')
    expect(item.lastElementChild).toHaveTextContent('Điện thoại: 0901 234 567')
    expect(item.lastElementChild).not.toHaveTextContent('Trạng thái')
  })
})
