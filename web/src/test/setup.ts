import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { changeLocale, DEFAULT_LOCALE } from '../lib/i18n'
import { clearXsrfCookie, server } from './server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  localStorage.clear()
  await changeLocale(DEFAULT_LOCALE)
  localStorage.clear()
})
afterEach(() => {
  cleanup()
  clearXsrfCookie()
  server.events.removeAllListeners()
  server.resetHandlers()
})
afterAll(() => server.close())
