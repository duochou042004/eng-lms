import { describe, expect, it } from 'vitest'
import { devResources } from '../../dev/i18n'
import { LOCALES, resources } from '.'

/** Every catalogue, including the development-only `dev` namespace (registered lazily, not shipped in production). */
const catalogues = {
  vi: { ...resources.vi, ...devResources.vi },
  en: { ...resources.en, ...devResources.en },
}

/** Flattens a nested catalogue into dotted keys. */
export function keysOf(node: unknown, prefix = ''): string[] {
  if (node === null || typeof node !== 'object') return [prefix]
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => keysOf(v, prefix ? `${prefix}.${k}` : k))
}

/** Keys present in one catalogue but not the other, as `ns:key`. */
export function missingKeys(a: Record<string, unknown>, b: Record<string, unknown>): string[] {
  const set = (cat: Record<string, unknown>) =>
    new Set(Object.entries(cat).flatMap(([ns, tree]) => keysOf(tree).map((k) => `${ns}:${k}`)))
  const [ka, kb] = [set(a), set(b)]
  return [...[...ka].filter((k) => !kb.has(k)), ...[...kb].filter((k) => !ka.has(k))].sort()
}

describe('i18n completeness (NFR-I18N-01)', () => {
  it('vi and en have exactly the same keys', () => {
    expect(missingKeys(catalogues.vi, catalogues.en)).toEqual([])
  })

  it('no string is empty', () => {
    for (const locale of LOCALES) {
      const empties = Object.entries(catalogues[locale]).flatMap(([ns, tree]) =>
        keysOf(tree)
          .filter((k) => k.split('.').reduce<unknown>((n, p) => (n as Record<string, unknown>)[p], tree) === '')
          .map((k) => `${locale}/${ns}:${k}`),
      )
      expect(empties).toEqual([])
    }
  })

  it('covers the dev namespace', () => {
    expect(Object.keys(catalogues.vi)).toEqual(expect.arrayContaining(['common', 'shell', 'auth', 'dev']))
    expect(Object.keys(resources.vi)).not.toContain('dev')
  })

  it('detects a key missing from en in the dev namespace (fixture)', () => {
    const en = structuredClone(catalogues.en) as Record<string, Record<string, unknown>>
    delete (en.dev!.sections as Record<string, unknown>).buttons
    expect(missingKeys(catalogues.vi, en)).toEqual(['dev:sections.buttons'])
  })

  it('detects a key missing from en (fixture)', () => {
    const en = structuredClone(resources.en) as Record<string, Record<string, unknown>>
    delete (en.common!.notFound as Record<string, unknown>).home
    expect(missingKeys(resources.vi, en)).toEqual(['common:notFound.home'])
  })
})
