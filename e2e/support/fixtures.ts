import { test as base, expect, type BrowserContext } from '@playwright/test'

/**
 * How long the console guard keeps listening after the test body ends (T-M1.6 QA F3, DEC-058): an error raised up to
 * ~300 ms after the last action (a late timer, a failed request settling) still fails the test. A fixed quiet window,
 * because the page offers no deterministic "nothing pending" signal (requestIdleCallback fires while a timer is still
 * queued). Bounded at 500 ms per test (T-M1.9 AC9); proved by the expected-failure self-test in guards.spec.ts. Without it
 * the only late window was accidental: `screenshot: 'only-on-failure'` captures a temporary screenshot between the body and
 * the fixture teardown, so a config without screenshots missed late errors entirely (evidence/T-M1.9/ac9-late-error.log).
 */
export const LATE_ERROR_SETTLE_MS = 500

/**
 * The one expected network "error" (T-M2.4): the session bootstrap `GET /api/v1/auth/session` answers 401 to an
 * anonymous visitor (api-catalog "auth"), and Chromium logs every 4xx resource as a console error. Only that exact
 * message from that exact URL is ignored; a 401 from any other request still fails the test (self-test in
 * guards.spec.ts).
 */
export function isAnonymousSessionProbe(text: string, url: string) {
  return (
    /^Failed to load resource: the server responded with a status of 401\b/.test(text) &&
    new URL(url, 'http://x').pathname === '/api/v1/auth/session'
  )
}

/**
 * Answers `PATCH /api/v1/auth/preferences` in `context` without calling the server (T-M2.6 scope 7a, DEC-190 (4)): 200
 * with the current session body plus the sent values. The language switcher saves the account's locale on every switch,
 * and the suite runs in parallel on shared accounts: a real save of `en` would flip every spec signed in on a device
 * without a stored choice. Answered, not aborted: an aborted request logs `net::ERR_FAILED`, which the console guard
 * fails on. The `test` fixture applies it to its own context; a spec that switches the language in its own
 * `browser.newContext()` calls it too.
 */
export async function answerPreferencesInPlace(context: BrowserContext) {
  await context.route('**/api/v1/auth/preferences', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback()
    const url = new URL('/api/v1/auth/session', route.request().url()).href
    try {
      const session = await route.fetch({ url, method: 'GET', postData: '' })
      if (session.status() !== 200) return await route.fulfill({ response: session })
      await route.fulfill({ json: { ...(await session.json()), ...route.request().postDataJSON() } })
    } catch (error) {
      // A test that closes its page or context right after a switch ends this best-effort save midway: nothing to answer.
      if (!route.request().frame().page().isClosed() && !/disposed|closed|ended/i.test(String(error))) throw error
    }
  })
}

/** The contexts feeding each test's guard list (its own and the fresh ones `guardContext` adds), for the late settle. */
const guardedContexts = new WeakMap<string[], BrowserContext[]>()

/**
 * The console guard's rules on `context`, feeding `problems` (the test's `consoleGuard`): any console error (except the
 * anonymous session probe), uncaught page error or CSP violation fails the test (the CSP is strict, security.md §5;
 * DEC-052 keeps React Aria from injecting a <style>). Chromium logs a blocked resource as a console error; the
 * `securitypolicyviolation` listener makes the directive explicit. The listeners sit on the browser context, so pages and
 * popups opened in it are guarded too (T-M1.6 QA F2). The `test` fixture applies it to its own context; every
 * `browser.newContext()` in a spec applies it too (T-M2.32 (a), DEC-184: an unguarded fresh context let a page crash
 * pass), and is then also covered by the fixture's late settle while one of its pages is open.
 */
export async function guardContext(context: BrowserContext, problems: string[]) {
  context.on('console', (message) => {
    if (message.type() !== 'error' || isAnonymousSessionProbe(message.text(), message.location().url)) return
    // A failed resource names its URL (G3 QA F2), so a test can accept exactly the request it provoked.
    const text = message.text()
    const url = message.location().url
    problems.push(`console.error: ${text}${text.startsWith('Failed to load resource') && url ? ` [${url}]` : ''}`)
  })
  context.on('weberror', (webError) => problems.push(`pageerror: ${webError.error().message}`))
  await context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(`CSP violation: ${event.violatedDirective} blocked ${event.blockedURI || 'inline'}`)
    })
  })
  guardedContexts.set(problems, [...(guardedContexts.get(problems) ?? []), context])
}

/**
 * Removes the console entries of a response a test provokes on purpose (only that status from that API path). Never the
 * whole guard: everything else still fails the test.
 */
export function acceptStatus(consoleGuard: string[], status: number, path: string | RegExp) {
  const prefix = `console.error: Failed to load resource: the server responded with a status of ${status} `
  for (let i = consoleGuard.length - 1; i >= 0; i--) {
    const entry = consoleGuard[i]!
    const url = /\[([^\]]+)\]$/.exec(entry)?.[1]
    const pathname = url ? new URL(url).pathname : ''
    if (entry.startsWith(prefix) && (typeof path === 'string' ? pathname === path : path.test(pathname)))
      consoleGuard.splice(i, 1)
  }
}

/** Removes the console entries a test provokes on purpose (e.g. a request sent offline). */
export function accept(consoleGuard: string[], matches: (entry: string) => boolean) {
  for (let i = consoleGuard.length - 1; i >= 0; i--) if (matches(consoleGuard[i]!)) consoleGuard.splice(i, 1)
}

/**
 * `test` with an automatic console guard (`guardContext` on the test's own context). After the test body the guard waits
 * `LATE_ERROR_SETTLE_MS` before it asserts while any guarded context (its own or a fresh one) still has an open page
 * (the pages stay open until the context closes, which happens after this fixture's teardown), so late errors are seen too.
 */
export const test = base.extend<{ consoleGuard: string[]; realPreferences: boolean; preferencesInPlace: void }>({
  /** `test.use({ realPreferences: true })`: the preferences PATCH reaches the server (settings-account.spec.ts only). */
  realPreferences: [false, { option: true }],
  preferencesInPlace: [
    async ({ context, realPreferences }, use) => {
      if (!realPreferences) await answerPreferencesInPlace(context)
      await use()
    },
    { auto: true },
  ],
  consoleGuard: [
    async ({ context }, use) => {
      const problems: string[] = []
      await guardContext(context, problems)
      await use(problems)
      // No open page in a guarded context, nothing can log: skip the settle.
      if ((guardedContexts.get(problems) ?? []).some((c) => c.pages().some((p) => !p.isClosed()))) {
        await new Promise((resolve) => setTimeout(resolve, LATE_ERROR_SETTLE_MS))
      }
      expect(problems, 'console errors, page errors or CSP violations').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
