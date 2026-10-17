import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { STUDENT_STATUS } from './status/statusMap'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge and the student statuses (design-system §4)', () => {
  it.each([
    ['ACTIVE', 'success', 'Đang học'],
    ['PAUSED', 'warning', 'Tạm nghỉ'],
    ['ARCHIVED', 'neutral', 'Đã lưu trữ'],
  ] as const)('%s: tone %s, a decorative icon and the text (never colour alone)', async (status, tone, label) => {
    const entry = STUDENT_STATUS[status]
    expect(entry.tone).toBe(tone)
    expect(entry.labelKey).toBe(`status.student.${status}`)
    const { container } = render(<StatusBadge status={entry} label={label} />)
    const badge = screen.getByText(label).parentElement!
    expect(badge).toHaveClass(tone)
    expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    await expectNoAxeViolations(container)
  })
})
