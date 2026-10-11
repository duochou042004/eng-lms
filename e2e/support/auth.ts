import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, type Page } from '@playwright/test'

/**
 * E2E sign-in (T-M2.4 scope 10). Everything under .data/e2e/ is dev-only and git-ignored (DEC-094): the bootstrap
 * password scripts/e2e-run.sh generates, the E2E tutor's current password and the stored sessions (storageState).
 */
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const E2E_DATA_DIR = process.env.E2E_DATA_DIR ?? join(REPO_ROOT, '.data', 'e2e')
export const TUTOR_USERNAME = 'e2e-tutor'
export const BOOTSTRAP_PASSWORD_FILE = join(E2E_DATA_DIR, 'tutor-bootstrap-password')
export const TUTOR_PASSWORD_FILE = join(E2E_DATA_DIR, 'tutor-password')
/** Signed-in sessions shared by the non-destructive tests: never logged out or password-changed by a test. */
export const TUTOR_STATE = join(E2E_DATA_DIR, 'state', 'tutor.json')
export const STUDENT_STATE = join(E2E_DATA_DIR, 'state', 'student.json')
export const ANONYMOUS = { cookies: [], origins: [] }

/** A fresh password that passes the policy (24 URL-safe characters). */
export function generatePassword() {
  return randomBytes(18).toString('base64url')
}

export function readSecret(file: string): string | null {
  return existsSync(file) ? readFileSync(file, 'utf8').trim() || null : null
}

/** The E2E tutor's current password (written by the global setup). */
export function tutorPassword(): string {
  const password = readSecret(TUTOR_PASSWORD_FILE)
  if (!password) throw new Error(`no ${TUTOR_PASSWORD_FILE}: run the suite through scripts/e2e-run.sh`)
  return password
}

export interface ApiResult<T = unknown> {
  status: number
  body: T
}

/**
 * A same-origin API call from inside the page (the browser's own cookies, including the Secure ones on localhost),
 * with the XSRF header on non-GET requests; the cookie is primed with GET /auth/session first when missing.
 */
export async function apiCall<T = unknown>(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const token = () => {
        const entry = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))
        return entry ? decodeURIComponent(entry.slice('XSRF-TOKEN='.length)) : null
      }
      if (method !== 'GET' && !token()) await fetch('/api/v1/auth/session')
      const headers: Record<string, string> = {}
      if (body !== undefined) headers['Content-Type'] = 'application/json'
      const xsrf = token()
      if (method !== 'GET' && xsrf) headers['X-XSRF-TOKEN'] = xsrf
      const response = await fetch(path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const text = await response.text()
      return { status: response.status, body: text ? JSON.parse(text) : null }
    },
    { method, path, body },
  ) as Promise<ApiResult<T>>
}

export interface Credentials {
  username: string
  password: string
}

/**
 * A new student created by the signed-in tutor on `tutorPage` (POST /api/v1/tutor/students without a password: the
 * server generates the temporary one). Username `e2e-<project>-<random>`; the account must change its password.
 */
export async function createStudent(tutorPage: Page, project: string): Promise<Credentials> {
  const username = `e2e-${project}-${randomBytes(4).toString('hex')}`.slice(0, 40)
  const created = await apiCall<{ credentials: { username: string; temporaryPassword: string } }>(
    tutorPage,
    'POST',
    '/api/v1/tutor/students',
    { fullName: `E2E ${project}`, username },
  )
  expect(created.status, 'student created').toBe(201)
  return { username: created.body.credentials.username, password: created.body.credentials.temporaryPassword }
}

/** Signs in through the API on `page` (already on the app's origin). */
export async function apiSignIn(page: Page, { username, password }: Credentials, rememberMe = false) {
  return apiCall<{ mustChangePassword: boolean; role: string }>(page, 'POST', '/api/v1/auth/login', {
    username,
    password,
    rememberMe,
  })
}

/** Completes the forced first change through the API; returns the new credentials. */
export async function apiChangePassword(page: Page, { username, password }: Credentials): Promise<Credentials> {
  const next = generatePassword()
  const changed = await apiCall(page, 'POST', '/api/v1/auth/password', { currentPassword: password, newPassword: next })
  expect(changed.status, 'password changed').toBe(204)
  return { username, password: next }
}

/** Signs in through the login form (vi labels). */
export async function signInWithForm(page: Page, { username, password }: Credentials, rememberMe = false) {
  await page.getByLabel('Tên đăng nhập (bắt buộc)').fill(username)
  await page.getByLabel('Mật khẩu (bắt buộc)', { exact: true }).fill(password)
  // The label is the target (React Aria keeps the input visually hidden).
  if (rememberMe) await page.getByText('Ghi nhớ đăng nhập trên thiết bị này').click()
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
}
