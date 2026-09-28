#!/usr/bin/env node
// Contrast check (T-M1.3 AC8, design-system §2, WCAG 2.2 AA): every token pair used for text must reach 4.5:1,
// and UI boundaries/focus indicators 3:1. Usage: node scripts/contrast-check.mjs [path/to/tokens.css]
import { readFileSync } from 'node:fs'

const file = process.argv[2] ?? new URL('../src/ui/tokens.css', import.meta.url).pathname

const TEXT = 4.5
const UI = 3

// [foreground, background, minimum ratio, usage]
export const PAIRS = [
  ...['--color-text', '--color-text-muted', '--color-text-subtle'].flatMap((fg) =>
    ['--color-bg', '--color-surface', '--color-surface-sunken'].map((bg) => [fg, bg, TEXT, 'body text']),
  ),
  ['--color-accent', '--color-bg', TEXT, 'links'],
  ['--color-accent', '--color-surface', TEXT, 'links, secondary button label'],
  ['--color-accent-strong', '--color-accent-subtle', TEXT, 'quiet button hover label'],
  ['--color-on-accent', '--color-accent', TEXT, 'primary button label'],
  ['--color-on-accent', '--color-accent-strong', TEXT, 'primary button hover label'],
  ['--color-on-accent', '--color-danger', TEXT, 'danger button label'],
  ['--color-on-accent', '--color-danger-strong', TEXT, 'danger button hover label'],
  ['--color-success-text', '--color-success-subtle', TEXT, 'success alert'],
  ['--color-warning-text', '--color-warning-subtle', TEXT, 'warning alert'],
  ['--color-danger-text', '--color-danger-subtle', TEXT, 'danger alert'],
  ['--color-info-text', '--color-info-subtle', TEXT, 'info alert'],
  ['--color-danger', '--color-surface', TEXT, 'field error text'],
  ['--color-danger', '--color-bg', TEXT, 'field error text on the page background'],
  ['--color-danger', '--color-surface', UI, 'field error icon (T-M1.9 AC5)'],
  ['--color-danger', '--color-bg', UI, 'field error icon on the page background (T-M1.9 AC5)'],
  ['--color-accent-strong', '--color-accent-subtle', TEXT, 'segmented control: selected label'],
  ['--color-accent-strong', '--color-accent-subtle', UI, 'segmented control: selected check icon'],
  ['--color-text', '--color-surface-sunken', TEXT, 'segmented control: hovered label'],
  ['--color-focus', '--color-accent-subtle', UI, 'segmented control: focus ring inside a selected segment'],
  ['--color-border-strong', '--color-surface', UI, 'input boundary'],
  ['--color-border-strong', '--color-bg', UI, 'input boundary'],
  ['--color-focus', '--color-bg', UI, 'focus ring'],
  ['--color-focus', '--color-surface', UI, 'focus ring'],
]

function parseTokens(css) {
  const tokens = {}
  for (const [, name, value] of css.matchAll(/(--color-[a-z-]+)\s*:\s*(#[0-9a-f]{3,6})\s*;/gi)) {
    tokens[name] = value.toLowerCase()
  }
  return tokens
}

function luminance(hex) {
  let h = hex.slice(1)
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function ratio(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

const tokens = parseTokens(readFileSync(file, 'utf8'))
let failures = 0
for (const [fg, bg, min, usage] of PAIRS) {
  if (!tokens[fg] || !tokens[bg]) {
    console.log(`FAIL  ${fg} on ${bg}: token missing (${usage})`)
    failures++
    continue
  }
  const r = ratio(tokens[fg], tokens[bg])
  const ok = r >= min
  if (!ok) failures++
  console.log(
    `${ok ? 'ok  ' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1 ≥ ${min}  ${fg} (${tokens[fg]}) on ${bg} (${tokens[bg]})  ${usage}`,
  )
}
console.log(failures ? `contrast: FAIL (${failures} pair(s) below AA)` : `contrast: PASS (${PAIRS.length} pairs)`)
process.exit(failures ? 1 : 0)
