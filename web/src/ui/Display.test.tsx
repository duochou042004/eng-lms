import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { EmptyState } from './EmptyState'
import { InlineAlert } from './InlineAlert'
import { PageHeader } from './PageHeader'
import { Skeleton } from './Skeleton'
import { Stack } from './Stack'

describe('InlineAlert', () => {
  it.each([
    ['info', 'status'],
    ['success', 'status'],
    ['warning', 'status'],
    ['danger', 'alert'],
  ] as const)('%s uses role=%s, an icon and a text title', async (tone, role) => {
    const { container } = render(
      <InlineAlert tone={tone} title="Tiêu đề">
        Chi tiết
      </InlineAlert>,
    )
    const alert = screen.getByRole(role)
    expect(alert).toHaveTextContent('Tiêu đề')
    expect(alert).toHaveTextContent('Chi tiết')
    expect(alert.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    await expectNoAxeViolations(container)
  })
})

describe('Skeleton', () => {
  it('is hidden from assistive technology; the region carries the loading state', async () => {
    const { container } = render(
      <output aria-busy="true" aria-label="Đang tải">
        <Skeleton />
        <Skeleton shape="block" inlineSize="10rem" blockSize="2rem" />
      </output>,
    )
    for (const s of screen.getAllByTestId('skeleton')) expect(s).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('status', { name: 'Đang tải' })).toHaveAttribute('aria-busy', 'true')
    await expectNoAxeViolations(container)
  })
})

describe('EmptyState', () => {
  it('renders a heading, description, decorative icon and action', async () => {
    const { container } = render(
      <EmptyState
        icon={<svg />}
        title="Chưa có học viên"
        description="Thêm học viên."
        action={<button>Thêm</button>}
      />,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Chưa có học viên' })).toBeInTheDocument()
    expect(screen.getByText('Thêm học viên.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thêm' })).toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
    await expectNoAxeViolations(container)
  })

  it('makes a level-1 heading a programmatic focus target (not a Tab stop); other levels stay plain', () => {
    render(
      <>
        <EmptyState headingLevel={1} title="Không tìm thấy" />
        <EmptyState title="Trống" />
      </>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('heading', { level: 2 })).not.toHaveAttribute('tabindex')
  })

  it('supports a level-3 heading', () => {
    render(<EmptyState headingLevel={3} title="Trống" />)
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
  })
})

describe('PageHeader', () => {
  it('renders the single h1 with description and actions', async () => {
    const { container } = render(<PageHeader title="Học viên" description="Mô tả" actions={<button>Thêm</button>} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Học viên' })).toBeInTheDocument()
    expect(screen.getByText('Mô tả')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('tabindex', '-1')
    await expectNoAxeViolations(container)
  })
})

describe('Stack', () => {
  it('applies the spacing token as the gap and can render another element', () => {
    render(
      <Stack gap={3} as="section">
        <p>a</p>
      </Stack>,
    )
    const stack = screen.getByText('a').parentElement!
    expect(stack.tagName).toBe('SECTION')
    expect(stack.style.gap).toBe('var(--space-3)')
  })
})
