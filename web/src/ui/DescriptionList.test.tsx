import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { DescriptionList } from './DescriptionList'

describe('DescriptionList', () => {
  it('renders terms and values as a dl; an empty value says so', async () => {
    const { container } = render(
      <DescriptionList
        emptyLabel="Chưa có"
        items={[
          { id: 'name', term: 'Họ tên', description: 'Nguyễn Văn An' },
          { id: 'email', term: 'Email', description: null },
        ]}
      />,
    )
    const list = container.querySelector('dl')!
    const terms = within(list).getAllByRole('term')
    expect(terms.map((t) => t.textContent)).toEqual(['Họ tên', 'Email'])
    const values = within(list).getAllByRole('definition')
    expect(values[0]).toHaveTextContent('Nguyễn Văn An')
    expect(values[1]).toHaveTextContent('Chưa có')
    expect(screen.getByText('Chưa có')).toHaveClass('empty')
    await expectNoAxeViolations(container)
  })
})
