import { expect, type Locator, type Page } from '@playwright/test'
import { apiCall } from './auth'

/**
 * T-M2.11: where a shell keeps its account section at the current viewport (DEC-112): the account popover (tutor at
 * ≥ 1024 px, student at ≥ 768 px; the top bar's button that opens a dialog), the tutor's navigation drawer (its footer)
 * below 1024 px, the student's More sheet below 768 px.
 */
export type ShellRole = 'tutor' | 'student'

export function accountPlace(page: Page, role: ShellRole): 'popover' | 'drawer' | 'sheet' {
  const width = page.viewportSize()!.width
  if (role === 'tutor') return width >= 1024 ? 'popover' : 'drawer'
  return width >= 768 ? 'popover' : 'sheet'
}

/** The control that opens the account section at this viewport. */
export function accountOpener(page: Page, role: ShellRole): Locator {
  switch (accountPlace(page, role)) {
    case 'popover':
      return page.getByRole('banner').locator('button[aria-haspopup="dialog"]')
    case 'drawer':
      return page.getByRole('banner').getByRole('button', { name: /^(Mở điều hướng|Open navigation)$/ })
    case 'sheet':
      return page.locator('nav[data-bottom-tabs]').getByRole('button', { name: /^(Thêm|More)$/ })
  }
}

/** Opens the account section (one step) and returns its dialog. */
export async function openAccountSection(page: Page, role: ShellRole): Promise<Locator> {
  await accountOpener(page, role).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // Settled: the sheet's slide-in (or the popover's fade) is over, so positions are final.
  await expect(page.locator('[data-entering]')).toHaveCount(0)
  return dialog
}

/** The workspace display name (`GET /api/v1/meta`, public): the shells' home link text. */
export async function workspaceName(page: Page): Promise<string> {
  const meta = await apiCall<{ displayName: string }>(page, 'GET', '/api/v1/meta')
  expect(meta.status).toBe(200)
  return meta.body.displayName
}
