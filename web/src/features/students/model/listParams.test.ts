import { describe, expect, it } from 'vitest'
import { cleanQuery, DEFAULT_VIEW, parseListView, toListQuery, toSearchParams } from './listParams'

const parse = (search: string) => parseListView(new URLSearchParams(search))

// T-M2.5 scope 2, AC2: the URL view, its fallbacks and the API query it maps to.
describe('list params', () => {
  it('reads every control from the URL (page is 1-based)', () => {
    expect(parse('q=nguyen&archived=1&sort=newest&page=3')).toEqual({
      q: 'nguyen',
      archived: true,
      sort: 'newest',
      page: 3,
    })
  })

  it.each([
    ['', DEFAULT_VIEW],
    ['page=-1', DEFAULT_VIEW],
    ['page=0', DEFAULT_VIEW],
    ['page=abc', DEFAULT_VIEW],
    ['page=1.5', DEFAULT_VIEW],
    ['page=', DEFAULT_VIEW],
    ['sort=x', DEFAULT_VIEW],
    ['sort=name', DEFAULT_VIEW],
    ['archived=true', DEFAULT_VIEW],
    ['archived=0', DEFAULT_VIEW],
    ['q=%20%20', DEFAULT_VIEW],
  ])('falls back to the default view for %j', (search, expected) => {
    expect(parse(search)).toEqual(expected)
  })

  it('clamps a huge page (it then lands on the last page) so the API never refuses page × size', () => {
    const view = parse('page=999999999999')
    expect(toListQuery(view).page * toListQuery(view).size).toBeLessThanOrEqual(2 ** 31 - 1)
    expect(parse('page=99').page).toBe(99)
  })

  it('strips control characters (U+0000–U+001F, U+007F) from q and trims it', () => {
    expect(
      cleanQuery(`  ng${String.fromCharCode(0)}uy${String.fromCharCode(0x1f)}en${String.fromCharCode(0x7f)}\t `),
    ).toBe('nguyen')
    expect(parse('q=%00an%0A').q).toBe('an')
    expect(cleanQuery('50% _a_ "b"')).toBe('50% _a_ "b"')
  })

  it('writes only the non-default controls back to the URL', () => {
    expect(toSearchParams(DEFAULT_VIEW).toString()).toBe('')
    expect(toSearchParams({ q: 'Nguyễn An', archived: true, sort: 'newest', page: 2 }).toString()).toBe(
      'q=Nguy%E1%BB%85n+An&archived=1&sort=newest&page=2',
    )
    const round = parse(toSearchParams({ q: 'a&b=c', archived: false, sort: 'name', page: 4 }).toString())
    expect(round).toEqual({ q: 'a&b=c', archived: false, sort: 'name', page: 4 })
  })

  it('maps a view to the API query: 0-based page, 25 per page, the statuses only with archived, the sort', () => {
    expect(toListQuery(DEFAULT_VIEW)).toEqual({ page: 0, size: 25, sort: 'fullName,asc' })
    expect(toListQuery({ q: 'an', archived: true, sort: 'newest', page: 2 })).toEqual({
      q: 'an',
      status: ['ACTIVE', 'PAUSED', 'ARCHIVED'],
      page: 1,
      size: 25,
      sort: 'createdAt,desc',
    })
  })
})
