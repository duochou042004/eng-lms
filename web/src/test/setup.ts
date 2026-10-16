import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { changeLocale, DEFAULT_LOCALE } from '../lib/i18n'
import { resetClientNavigation } from '../lib/navigation'
import { FakeBroadcastChannel } from './broadcast'
import { disconnectAll } from './render'
import { clearXsrfCookie, server } from './server'
import { DEFAULT_VIEWPORT_WIDTH, installMatchMedia, setViewportWidth } from './viewport'

installMatchMedia()
globalThis.BroadcastChannel = FakeBroadcastChannel as unknown as typeof BroadcastChannel

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetClientNavigation()
  setViewportWidth(DEFAULT_VIEWPORT_WIDTH)
  localStorage.clear()
  await changeLocale(DEFAULT_LOCALE)
  localStorage.clear()
})
afterEach(() => {
  cleanup()
  disconnectAll()
  FakeBroadcastChannel.reset()
  clearXsrfCookie()
  server.events.removeAllListeners()
  server.resetHandlers()
})
afterAll(() => server.close())
