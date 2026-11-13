// Helpers shared by the students-*.spec.ts files (T-M2.24: moved from students.spec.ts, bodies unchanged).
import { randomBytes } from 'node:crypto'
import type { Browser, Locator, Page, TestInfo } from '@playwright/test'
import { ANONYMOUS, apiCall, apiChangePassword, apiSignIn } from './auth'
import { expectNoHorizontalScroll } from './checks'
import { evidenceShot } from './evidence'
import { expect } from './fixtures'
import { openAccountSection } from './shell'

export const h1 = (page: Page, name: string | RegExp) => page.getByRole('heading', { level: 1, name })
// The temporary password is masked in every evidence screenshot (a working credential of the dev database).
export const shot = (page: Page, testInfo: TestInfo, name: string) =>
  evidenceShot(page, testInfo, name, 'impl', [page.locator('[class*="secret"]')])
export const token = () => randomBytes(3).toString('hex')

export interface Created {
  student: { id: string; username: string; fullName: string; version: number }
  credentials: { username: string; temporaryPassword: string }
}

/** A student created through the API (the tutor's session on `page`). */
export async function apiStudent(page: Page, body: Record<string, unknown>) {
  const created = await apiCall<Created>(page, 'POST', '/api/v1/tutor/students', body)
  expect(created.status, `create ${JSON.stringify(body)}`).toBe(201)
  return created.body
}

/** Removes the console entries of a response a test provokes on purpose (only that status from that API path). */
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

export const wide = (page: Page) => page.viewportSize()!.width >= 768

/** The tutor navigation's Students item: the sidebar at ≥ 1024 px, else in the drawer (opened first). */
export async function navItem(page: Page, name: string): Promise<Locator> {
  if (page.viewportSize()!.width < 1024) await openAccountSection(page, 'tutor')
  return page.getByRole('navigation', { name: 'Điều hướng gia sư' }).getByRole('link', { name })
}

export const fullNameField = (page: Page) => page.getByRole('textbox', { name: 'Họ tên (bắt buộc)' })
export const usernameField = (page: Page) => page.getByRole('textbox', { name: 'Tên đăng nhập (bắt buộc)' })

export const accountRegion = (page: Page) => page.getByRole('region', { name: /^(Tài khoản|Account)$/ })
export const toastRegion = (page: Page) => page.getByRole('region', { name: /^(Thông báo|Notifications)$/ })
export const box = async (target: Locator) => (await target.boundingBox())!

/** A student created through the API, with a phone and an email (unique per test). */
export async function profileStudent(page: Page, label: string, extra: Record<string, unknown> = {}) {
  // The API helper runs in the page: it needs the app's origin (its cookies).
  if (page.url() === 'about:blank') await page.goto('/tutor/students')
  const t = token()
  return apiStudent(page, {
    fullName: `${label} ${t}`,
    username: `e2e-pf-${t}-${randomBytes(2).toString('hex')}`,
    phone: '0901 234 567',
    email: `pf.${t}@example.com`,
    ...extra,
  })
}

/** Signs the student in on a fresh context and does the forced change: an open student session with a known password. */
export async function studentSession(browser: Browser, created: Created) {
  const context = await browser.newContext({ storageState: ANONYMOUS })
  const page = await context.newPage()
  await page.goto('/login')
  const first = { username: created.credentials.username, password: created.credentials.temporaryPassword }
  expect((await apiSignIn(page, first)).status).toBe(200)
  const credentials = await apiChangePassword(page, first)
  return { context, page, credentials }
}

/** A sign-in attempt on a fresh context (its own cookies), closed afterwards. */
export async function trySignIn(browser: Browser, credentials: { username: string; password: string }) {
  const context = await browser.newContext({ storageState: ANONYMOUS })
  const page = await context.newPage()
  await page.goto('/login')
  const status = (await apiSignIn(page, credentials)).status
  await context.close()
  return status
}

/** Below 768 px the buttons of an action row stack full width in source order; at ≥ 768 px they sit inline, start-aligned. */
export async function expectActionRow(page: Page, row: Locator) {
  const buttons = await row.locator(':scope > *').all()
  const rowBox = await box(row)
  const boxes = await Promise.all(buttons.map(box))
  if (wide(page)) {
    for (const b of boxes) expect(Math.abs(b.y - boxes[0]!.y), 'inline').toBeLessThanOrEqual(1)
    expect(Math.abs(boxes[0]!.x - rowBox.x), 'start-aligned').toBeLessThanOrEqual(1)
  } else {
    for (const [i, b] of boxes.entries()) {
      expect(Math.abs(b.width - rowBox.width), 'full width').toBeLessThanOrEqual(1)
      if (i > 0) expect(b.y, 'one per row, in order').toBeGreaterThan(boxes[i - 1]!.y)
    }
  }
}

/** The toast region: bottom centre with 16 px gutters below 768 px; 24rem at the bottom end from 768 px. */
export async function expectToastPlacement(page: Page) {
  const viewport = page.viewportSize()!
  const region = await box(toastRegion(page))
  expect(Math.abs(region.y + region.height - (viewport.height - 16)), 'bottom offset 16 px').toBeLessThanOrEqual(1)
  if (wide(page)) {
    expect(Math.abs(region.width - 384), '24rem').toBeLessThanOrEqual(1)
    expect(Math.abs(region.x + region.width - (viewport.width - 16)), 'bottom end').toBeLessThanOrEqual(1)
  } else {
    expect(Math.abs(region.width - Math.min(viewport.width - 32, 640)), 'width minus the gutters').toBeLessThanOrEqual(
      1,
    )
    expect(Math.abs(region.x - (viewport.width - region.width) / 2), 'centred').toBeLessThanOrEqual(1)
  }
  await expectNoHorizontalScroll(page)
}

export const guardiansRegion = (page: Page) => page.getByRole('region', { name: /^(Phụ huynh|Guardians)$/ })

/** A fictitious guardian for the API (index 0–99 → phone +1 555 01nn). */
export function fictitiousGuardian(index: number, extra: Record<string, unknown> = {}) {
  return {
    name: `Phụ Huynh Thử ${index + 1}`,
    relationship: 'Mẹ',
    phone: `+1 555 01${String(index % 100).padStart(2, '0')}`,
    email: `guardian.${index + 1}@example.com`,
    ...extra,
  }
}

/** Every input of a form is full width of the column and alone on its row (T-M2.15 layout rules). */
export async function expectFieldsStacked(form: Locator) {
  const boxes = await Promise.all((await form.locator('input, textarea').all()).map(box))
  for (const [i, b] of boxes.entries()) {
    expect(Math.abs(b.x - boxes[0]!.x), 'start-aligned').toBeLessThanOrEqual(1)
    expect(Math.abs(b.width - boxes[0]!.width), 'full width').toBeLessThanOrEqual(1)
    if (i > 0) expect(b.y, 'one per row').toBeGreaterThan(boxes[i - 1]!.y + boxes[i - 1]!.height - 1)
  }
}

/** Answers 503 to the requests `matches` selects (the rest pass through) until `stop` is called. */
export async function failRequests(page: Page, url: string, matches: (requestUrl: URL) => boolean = () => true) {
  let failing = true
  await page.route(url, (route) =>
    failing && matches(new URL(route.request().url()))
      ? route.fulfill({
          status: 503,
          contentType: 'application/problem+json',
          body: '{"status":503,"code":"INTERNAL_ERROR"}',
        })
      : route.fallback(),
  )
  return () => {
    failing = false
  }
}

export const lpRegion = (page: Page) => page.getByRole('region', { name: /^(Hồ sơ học tập|Learning profile)$/ })
export const lpEdit = (page: Page) =>
  page.getByRole('button', {
    name: /^(Sửa hồ sơ học tập|Edit learning profile)$/,
  })
export const lpForm = (page: Page) =>
  page.getByRole('form', {
    name: /^(Sửa hồ sơ học tập|Edit learning profile)$/,
  })
export const lpSave = (page: Page) => lpForm(page).getByRole('button', { name: /^(Lưu|Save)$/ })
/** A tag list of the form: a tag may sit in both lists, so its remove buttons are found within its group (G0 N-1). */
export const tagGroup = (page: Page, name: string) => lpForm(page).getByRole('group', { name, exact: true })

/** Saves a learning profile through the API (the first save: `version` null). */
export async function apiProfile(page: Page, sid: string, body: Record<string, unknown>) {
  const saved = await apiCall(page, 'PUT', `/api/v1/tutor/students/${sid}/learning-profile`, { version: null, ...body })
  expect(saved.status, 'save the learning profile').toBe(200)
}
