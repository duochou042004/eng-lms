#!/usr/bin/env node
// Bundle budget (NFR-PERF-03, T-M1.3 AC7): the JavaScript a first visit to a shell downloads (the entry chunk plus the
// shell's lazy chunk and their static imports), gzipped. Reads dist/.vite/manifest.json; run after `pnpm build`.
// Limits can be lowered for a demonstration: BUDGET_STUDENT_KB=50 pnpm budget
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const dist = new URL('../dist/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('.vite/manifest.json', dist), 'utf8'))

const BUDGETS = [
  { name: 'student', route: 'src/app/shells/StudentShell.tsx', limitKb: Number(process.env.BUDGET_STUDENT_KB ?? 200) },
  { name: 'tutor', route: 'src/app/shells/TutorShell.tsx', limitKb: Number(process.env.BUDGET_TUTOR_KB ?? 300) },
]
const FORBIDDEN_IN_PRODUCTION = ['src/dev/DevUiPage.tsx']
// T-M2.11 AC10: the student's first visit never loads the tutor shell (its navigation and pages), statically or as a
// shared chunk. T-M2.5 AC1: no Students feature module (a key under the prefix) in either first visit: its pages are
// lazy chunks of their own, so their form libraries stay out of the tutor's first visit and never reach a student.
const FORBIDDEN_IN_CLOSURE = [
  { budget: 'student', key: 'src/app/shells/TutorShell.tsx' },
  { budget: 'student', prefix: 'src/features/students/' },
  { budget: 'tutor', prefix: 'src/features/students/' },
]

function closure(key, seen = new Set()) {
  if (seen.has(key)) return seen
  const chunk = manifest[key]
  if (!chunk) throw new Error(`manifest has no entry for ${key}`)
  seen.add(key)
  for (const dep of chunk.imports ?? []) closure(dep, seen)
  return seen
}

const gzipKb = (file) => gzipSync(readFileSync(new URL(file, dist))).length / 1024

let failed = false
for (const key of FORBIDDEN_IN_PRODUCTION) {
  const leaked = Object.keys(manifest).filter((k) => k.includes(key))
  if (leaked.length) {
    console.log(`FAIL  ${key} is in the production build`)
    failed = true
  }
}
const entry = Object.keys(manifest).find((k) => manifest[k].isEntry)
for (const { name, route, limitKb } of BUDGETS) {
  const keys = new Set([...closure(entry), ...closure(route)])
  for (const forbidden of FORBIDDEN_IN_CLOSURE.filter((f) => f.budget === name)) {
    const hits = forbidden.key
      ? [...keys].filter((k) => k === forbidden.key)
      : [...keys].filter((k) => k.startsWith(forbidden.prefix))
    for (const hit of hits) {
      console.log(`FAIL  ${name}: ${hit} is in its first-visit chunks`)
      failed = true
    }
  }
  const files = [...keys].map((k) => manifest[k].file)
  const total = files.reduce((sum, f) => sum + gzipKb(f), 0)
  const ok = total <= limitKb
  if (!ok) failed = true
  console.log(
    `${ok ? 'ok  ' : 'FAIL'}  ${name.padEnd(8)} ${total.toFixed(1).padStart(6)} KB gz ≤ ${limitKb} KB  (${files.length} chunks)`,
  )
}
console.log(failed ? 'budget: FAIL' : 'budget: PASS')
process.exit(failed ? 1 : 0)
