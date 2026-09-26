import { test as base, expect } from '@playwright/test'

/**
 * `test` with an automatic console guard: any console error, uncaught page error or CSP violation fails the test
 * (the CSP is strict, security.md §5; DEC-052 keeps React Aria from injecting a <style>). Chromium logs a blocked
 * resource as a console error; the `securitypolicyviolation` listener makes the directive explicit.
 */
export const test = base.extend<{ consoleGuard: string[] }>({
  consoleGuard: [
    async ({ page }, use) => {
      const problems: string[] = []
      page.on('console', (message) => {
        if (message.type() === 'error') problems.push(`console.error: ${message.text()}`)
      })
      page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
      await page.addInitScript(() => {
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
