import { test as base, expect } from '@playwright/test'

/**
 * `test` with an automatic console guard: any console error, uncaught page error or CSP violation fails the test
 * (the CSP is strict, security.md §5; DEC-052 keeps React Aria from injecting a <style>). Chromium logs a blocked
 * resource as a console error; the `securitypolicyviolation` listener makes the directive explicit. The listeners sit
 * on the browser context, so pages and popups opened during the test are guarded too (T-M1.6 QA F2). Errors raised
 * after the test body has finished (e.g. a late timer) are not seen (QA F3, DEC-058).
 */
export const test = base.extend<{ consoleGuard: string[] }>({
  consoleGuard: [
    async ({ context }, use) => {
      const problems: string[] = []
      context.on('console', (message) => {
        if (message.type() === 'error') problems.push(`console.error: ${message.text()}`)
      })
      context.on('weberror', (webError) => problems.push(`pageerror: ${webError.error().message}`))
      await context.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          console.error(`CSP violation: ${event.violatedDirective} blocked ${event.blockedURI || 'inline'}`)
        })
      })
      await use(problems)
      expect(problems, 'console errors, page errors or CSP violations').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
