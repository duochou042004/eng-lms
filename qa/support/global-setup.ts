import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type FullConfig, type Page } from '@playwright/test'

// Sessions for the signed-in specs (T-M2.4 removed the anonymous landing page; D3 of T-M2.7). QA never imports e2e/ code:
// the tutor comes from a stored Playwright session (QA_TUTOR_STATE, default the e2e harness's .data/e2e/state/tutor.json;
// QA reads no password file), the student is created here through the tutor API and passes the forced change.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const TUTOR_SOURCE = process.env.QA_TUTOR_STATE ?? join(ROOT, '.data', 'e2e', 'state', 'tutor.json')
export const STATE = { tutor: join(ROOT, '.data', 'qa', 'tutor.json'), student: join(ROOT, '.data', 'qa', 'student.json') }

export async function call(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const xsrf = () => document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.slice(11)
      if (!xsrf()) await fetch('/api/v1/auth/session')
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (body !== undefined) headers['Content-Type'] = 'application/json'
      if (method !== 'GET') headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf() ?? '')
      const r = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
      return { status: r.status, body: await r.json().catch(() => null) }
    },
    { method, path, body },
  )
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:8080'
  const browser = await chromium.launch()
  try {
    const tutorContext = await browser.newContext({ baseURL, storageState: TUTOR_SOURCE })
    const tutor = await tutorContext.newPage()
    await tutor.goto('/login')
    const session = await call(tutor, 'GET', '/api/v1/auth/session')
    if (session.status !== 200 || session.body?.role !== 'TUTOR')
      throw new Error(`QA sign-in: ${TUTOR_SOURCE} holds no live tutor session (${session.status}); run the e2e suite once or set QA_TUTOR_STATE`)
    mkdirSync(dirname(STATE.tutor), { recursive: true, mode: 0o700 })
    await tutorContext.storageState({ path: STATE.tutor })

    const username = `qa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
    const created = await call(tutor, 'POST', '/api/v1/tutor/students', { fullName: `QA ${username}`, username })
    if (created.status !== 201) throw new Error(`QA sign-in: creating the student answered ${created.status}`)
    const temporary: string = created.body.credentials.temporaryPassword
    const studentContext = await browser.newContext({ baseURL })
    const student = await studentContext.newPage()
    await student.goto('/login')
    const login = await call(student, 'POST', '/api/v1/auth/login', { username, password: temporary, rememberMe: false })
    if (login.status !== 200) throw new Error(`QA sign-in: the student's sign-in answered ${login.status}`)
    const changed = await call(student, 'POST', '/api/v1/auth/password', { currentPassword: temporary, newPassword: `${temporary}-QA-1` })
    if (changed.status !== 204) throw new Error(`QA sign-in: the student's password change answered ${changed.status}`)
    await studentContext.storageState({ path: STATE.student })
  } finally {
    await browser.close()
  }
}
