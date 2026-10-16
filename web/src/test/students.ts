import { http, HttpResponse } from 'msw'

/** MSW fixtures for the Students pages (T-M2.5): rows, a student DTO and the page envelope (api-catalog "tutor: students"). */
export const SID = '11111111-2222-4333-8444-555555555555'

export function row(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    fullName: `Học viên ${String(index).padStart(2, '0')}`,
    username: `hocvien${index}`,
    status: 'ACTIVE',
    email: `hv${index}@example.com`,
    phone: `0901 000 ${String(index).padStart(3, '0')}`,
    createdAt: '2026-10-01T03:00:00Z',
    ...overrides,
  }
}

export function page(items: unknown[], { page = 0, size = 25, totalItems = items.length } = {}) {
  return { items, page, size, totalItems, totalPages: Math.ceil(totalItems / size) }
}

export function student(overrides: Record<string, unknown> = {}) {
  return {
    id: SID,
    fullName: 'Nguyễn Văn An',
    username: 'nguyenvanan',
    status: 'ACTIVE',
    email: 'an@example.com',
    phone: '0901 234 567',
    contactHandles: [{ label: 'Zalo', value: 'https://zalo.me/0901234567' }],
    note: 'Dòng một\nDòng hai',
    createdAt: '2026-10-01T03:00:00Z',
    updatedAt: '2026-10-01T03:00:00Z',
    version: 0,
    ...overrides,
  }
}

/** `GET /tutor/students` answering one page of the given rows for every query. */
export function listOf(items: unknown[]) {
  return http.get('*/api/v1/tutor/students', () => HttpResponse.json(page(items)))
}
