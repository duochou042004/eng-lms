/**
 * The Students list view as URL search params (T-M2.5 scope 2): `q`, `archived=1`, `sort=newest`, `page` (1-based).
 * Parsing never fails: an invalid value falls back to its default, so the API never answers a 422 to a shared or edited
 * link (api-catalog "tutor: students").
 */
export type ListSort = 'name' | 'newest'

export interface ListView {
  q: string
  archived: boolean
  sort: ListSort
  page: number
}

export const PAGE_SIZE = 25
export const DEFAULT_VIEW: ListView = { q: '', archived: false, sort: 'name', page: 1 }
export const ALL_STATUSES = ['ACTIVE', 'PAUSED', 'ARCHIVED'] as const
// The API refuses page × size beyond 2³¹ − 1 (its query offset); a larger URL page is clamped and then lands on the
// last page like any page past the end.
const MAX_PAGE = Math.floor(2_147_483_647 / PAGE_SIZE) + 1
/** U+0000–U+001F and U+007F: the API refuses them in `q` (and in free text, validation-rules). */
export function isControl(char: string) {
  const code = char.codePointAt(0) ?? 0
  return code <= 0x1f || code === 0x7f
}

/** The search text as it is sent: control characters removed, trimmed. */
export function cleanQuery(q: string) {
  return [...q]
    .filter((char) => !isControl(char))
    .join('')
    .trim()
}

export function parseListView(params: URLSearchParams): ListView {
  const rawPage = params.get('page') ?? ''
  const page = /^\d{1,12}$/.test(rawPage) ? Number(rawPage) : 1
  return {
    q: cleanQuery(params.get('q') ?? ''),
    archived: params.get('archived') === '1',
    sort: params.get('sort') === 'newest' ? 'newest' : 'name',
    page: page < 1 ? 1 : Math.min(page, MAX_PAGE),
  }
}

/** The URL params of a view; defaults are left out, so the plain list is `/tutor/students`. */
export function toSearchParams(view: ListView): URLSearchParams {
  const params = new URLSearchParams()
  if (view.q) params.set('q', view.q)
  if (view.archived) params.set('archived', '1')
  if (view.sort === 'newest') params.set('sort', 'newest')
  if (view.page > 1) params.set('page', String(view.page))
  return params
}

export interface ListQuery {
  q?: string
  status?: string[]
  page: number
  size: number
  sort: string
}

/** The `GET /tutor/students` query of a view (the API's `page` is 0-based, api-conventions §4). */
export function toListQuery(view: ListView): ListQuery {
  return {
    ...(view.q ? { q: view.q } : {}),
    ...(view.archived ? { status: [...ALL_STATUSES] } : {}),
    page: view.page - 1,
    size: PAGE_SIZE,
    sort: view.sort === 'newest' ? 'createdAt,desc' : 'fullName,asc',
  }
}
