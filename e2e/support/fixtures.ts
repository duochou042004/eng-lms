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
 * `test` with an automatic console guard: any console error, uncaught page error or CSP violation fails the test
 * (the CSP is strict, security.md §5; DEC-052 keeps React Aria from injecting a <style>). Chromium logs a blocked
 * resource as a console error; the `securitypolicyviolation` listener makes the directive explicit. The listeners sit
 * on the browser context, so pages and popups opened during the test are guarded too (T-M1.6 QA F2). After the test
 * body the guard waits `LATE_ERROR_SETTLE_MS` before it asserts (the pages stay open until the context closes, which
 * happens after this fixture's teardown), so late errors are seen too.
 */
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
      await use(problems)
      // No open page, nothing can log: skip the settle.
      if (context.pages().some((p) => !p.isClosed())) {
        await new Promise((resolve) => setTimeout(resolve, LATE_ERROR_SETTLE_MS))
      }
      expect(problems, 'console errors, page errors or CSP violations').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
