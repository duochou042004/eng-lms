// Part of `pnpm lint` (T-M2.32 (b), DEC-196): a `useEffect` / `useLayoutEffect` whose arrow has an expression body hands
// that expression's value to React as the cleanup (Chromium 158's `scrollIntoView` returns a Promise, DEC-182). Allowed:
// a block body, or an expression body that is itself an arrow (a cleanup). Parses the source with the TypeScript
// compiler (already a dev dependency), so wrapped forms (Prettier printWidth 120) are caught like one-line ones.
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'

const HOOKS = new Set(['useEffect', 'useLayoutEffect'])

/** The hook name a call targets: `useEffect(…)` or `React.useEffect(…)`. */
function hookName(callee) {
  if (ts.isIdentifier(callee)) return callee.text
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text
  return ''
}

/** Each violation in `source` as `<line>:<col> <hook>` (1-based). */
export function findViolations(source, fileName = 'x.tsx') {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const hits = []
  const visit = (node) => {
    if (ts.isCallExpression(node) && HOOKS.has(hookName(node.expression))) {
      const effect = node.arguments[0]
      if (effect && ts.isArrowFunction(effect) && !ts.isBlock(effect.body)) {
        let body = effect.body
        while (ts.isParenthesizedExpression(body)) body = body.expression
        if (!ts.isArrowFunction(body) && !ts.isFunctionExpression(body)) {
          const { line, character } = file.getLineAndCharacterOfPosition(effect.getStart(file))
          hits.push(`${line + 1}:${character + 1} ${hookName(node.expression)}`)
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return hits
}

function* sourceFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* sourceFiles(path)
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) yield path
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = join(import.meta.dirname, '..')
  const report = []
  for (const path of sourceFiles(join(root, 'src')))
    for (const hit of findViolations(readFileSync(path, 'utf8'), path)) report.push(`${relative(root, path)}:${hit}`)
  if (report.length > 0) {
    console.log(report.join('\n'))
    console.error(
      'no-expression-effects: give these effects a block body (an expression body is returned to React as the cleanup)',
    )
    process.exit(1)
  }
}
