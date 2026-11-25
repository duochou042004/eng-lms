// The `pnpm lint` check for expression-bodied effects (T-M2.32 AC2, L-01): red on each violating form, green on each allowed one.
import { describe, expect, it } from 'vitest'
import { findViolations } from './no-expression-effects.mjs'

describe('no-expression-effects', () => {
  it.each([
    ['one-line useEffect', 'useEffect(() => el.focus(), [])'],
    ['wrapped useEffect', 'useEffect(\n  () => el.focus(),\n  [],\n)'],
    ['one-line useLayoutEffect', 'useLayoutEffect(() => el.focus(), [])'],
    ['wrapped useLayoutEffect', 'useLayoutEffect(\n  () => el.focus(),\n  [],\n)'],
    ['React.useEffect', 'React.useEffect(() => reset(saved), [saved])'],
  ])('fails on %s', (_, code) => {
    expect(findViolations(code)).toHaveLength(1)
  })

  it.each([
    ['a one-line cleanup', 'useEffect(() => () => close(), [])'],
    ['the wrapped cleanup of ui/Button', 'useEffect(\n  () => () => {\n    drop(id)\n  },\n  [id],\n)'],
    ['a block body', 'useEffect(() => {\n  el.focus()\n}, [])'],
    ['a block body returning a cleanup', 'useEffect(() => {\n  return connect()\n}, [])'],
    ['another hook', 'useMemo(() => compute(), [])'],
  ])('passes on %s', (_, code) => {
    expect(findViolations(code)).toEqual([])
  })

  it('reports the line of a violation in a TSX file', () => {
    const code = 'export function A() {\n  useEffect(() => <div />.key, [])\n  return <p />\n}\n'
    expect(findViolations(code, 'a.tsx')).toEqual(['2:13 useEffect'])
  })
})
