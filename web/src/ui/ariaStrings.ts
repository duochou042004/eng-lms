import type PackageStrings from 'react-aria-components/i18n/en-US'
import * as enUSModule from 'react-aria-components/i18n/en-US'

type Dictionary = PackageStrings
type Message = Dictionary[string][string]
// Its typings declare the default export as a type only; at runtime it is the dictionary object.
const enUS = (enUSModule as unknown as { default: Dictionary }).default
type Variables = Record<string, string | number | boolean> | undefined
/** What `LocalizedStringFormatter` passes at runtime (its typings mark these members private / protected). */
type Formatter = { locale: string; number(value: number): string }
type Translate = (variables: Variables, formatter: Formatter) => string

/**
 * React Aria's own strings in Vietnamese (T-M2.32 (f), DEC-196 (2)): the hidden "Dismiss" of the overlays and the ComboBox
 * announcements. React Aria 3.52 ships no `vi` strings.
 */
const VI: Record<string, Record<string, Translate>> = {
  '@react-aria/overlays': { dismiss: () => 'Đóng' },
  '@react-aria/combobox': {
    focusAnnouncement: (v, f) =>
      `${v?.isGroupChange ? `Đã vào nhóm ${v.groupTitle}, có ${f.number(Number(v.groupCount))} lựa chọn. ` : ''}${v?.optionText}${v?.isSelected ? ', đã chọn' : ''}`,
    countAnnouncement: (v, f) => `Có ${f.number(Number(v?.optionCount))} lựa chọn.`,
    selectedAnnouncement: (v) => `${v?.optionText}, đã chọn`,
    buttonLabel: () => 'Hiện gợi ý',
    listboxLabel: () => 'Gợi ý',
  },
}

/**
 * One dictionary for every locale: `@internationalized/string` reads the global dictionary once and serves it for every
 * locale (G0 S2-1), so it is React Aria's full en-US dictionary (no package is ever missing, the DEC-176 crash trap), where
 * each translated key chooses by the formatter's locale, which follows `I18nProvider` (`UiProvider`).
 * shortcut: relies on `@internationalized/string` reading `window[Symbol.for('react-aria.i18n.strings')]` once and calling
 * function strings with its `LocalizedStringFormatter`; a react-aria-components bump needs a local check of the vi names.
 */
export function ariaStrings(): Dictionary {
  const strings: Dictionary = { ...enUS }
  for (const [pkg, keys] of Object.entries(VI)) {
    const own = { ...enUS[pkg] }
    for (const [key, vi] of Object.entries(keys)) {
      const en = enUS[pkg]![key]!
      const choose: Translate = (variables, formatter) =>
        formatter.locale.startsWith('vi')
          ? vi(variables, formatter)
          : typeof en === 'function'
            ? en(variables, formatter as never)
            : en
      own[key] = choose as unknown as Message
    }
    strings[pkg] = own
  }
  return strings
}

/**
 * Installs the dictionary; call once, before the first render (`main.tsx`, the test setup). The global dictionary is
 * keyed by `react-aria.i18n.locale`: `en-US`, so every locale falls back to it (React Aria reads that symbol as its
 * default locale only at load and outside an `I18nProvider`; every render here is inside `UiProvider`).
 */
export function installAriaStrings() {
  const global = window as unknown as Record<symbol, unknown>
  global[Symbol.for('react-aria.i18n.locale')] = 'en-US'
  global[Symbol.for('react-aria.i18n.strings')] = ariaStrings()
}
