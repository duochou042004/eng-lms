import type { Locator } from '@playwright/test'
import { ANONYMOUS, apiCall, signInWithForm, TUTOR_STATE } from '../support/auth'
import { expectFocusNotLost, expectSettledAccessible } from '../support/checks'
import { evidenceRecord } from '../support/evidence'
import { expect, test } from '../support/fixtures'
import { StepCounter } from '../support/steps'
import {
  acceptStatus,
  accountRegion,
  box,
  expectActionRow,
  expectToastPlacement,
  h1,
  profileStudent,
  shot,
  studentSession,
  toastRegion,
  trySignIn,
} from '../support/students'

// T-M2.14 (edit profile, conflict, status + Undo, reset password, toasts) at the mandatory viewports: AC1, AC3–AC7, AC9,
// AC10. Each test creates its own students (dev data, kept). Student sessions are fresh contexts (never the stored one).

test.use({ storageState: TUTOR_STATE })

test.describe('Account section (T-M2.14)', () => {
  // AC12 (i): the status flow is split in three, so no test spends ~20 s of its 30 s budget waiting for toasts.
  test('AC5/AC9: Pause and Resume: badges, toasts placed, a timed toast closes by itself', async ({
    page,
  }, testInfo) => {
    const created = await profileStudent(page, 'Trạng Thái')
    const account = accountRegion(page)
    await page.goto(`/tutor/students/${created.student.id}`)
    await expect(h1(page, created.student.fullName)).toBeVisible()
    await shot(page, testInfo, 'account-active-vi')

    await account.getByRole('button', { name: 'Tạm nghỉ' }).click()
    await expect(account.getByRole('button', { name: 'Tiếp tục học' })).toBeFocused()
    await expect(page.locator('main header')).toContainText('Tạm nghỉ')
    await expect(toastRegion(page)).toContainText(`Đã chuyển ${created.student.fullName} sang Tạm nghỉ`)
    await expectToastPlacement(page)
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'account-paused-vi')
    await account.getByRole('button', { name: 'Tiếp tục học' }).click()
    await expect(account).toContainText('Đang học')
    await expect(toastRegion(page)).toContainText(`Đã cho ${created.student.fullName} học tiếp`)
    // Two toasts now: the focused Pause is still clear of them (scope 9, WCAG 2.2 SC 2.4.11).
    const pause = account.getByRole('button', { name: 'Tạm nghỉ' })
    await expect(pause).toBeFocused()
    await expect
      .poll(async () => {
        const [p, t] = [await box(pause), await box(toastRegion(page))]
        return p.y + p.height <= t.y || p.y >= t.y + t.height
      }, 'the focused button is clear of the toasts')
      .toBe(true)
    // Toasts without an action close by themselves (5 s, interaction-states §4); hovering pauses them, so the pointer
    // leaves the region first.
    await page.mouse.move(0, 0)
    await expect(toastRegion(page)).toBeHidden({ timeout: 15_000 })
  })

  test('AC5/AC9: Archive: persistent toast, sign-in refused, Reactivate clear of the toast; F6, Tab, Enter on Undo', async ({
    page,
    browser,
    consoleGuard,
  }, testInfo) => {
    const created = await profileStudent(page, 'Lưu Trữ Hoàn Tác')
    const student = await studentSession(browser, created)
    await student.context.close()
    const account = accountRegion(page)
    await page.goto(`/tutor/students/${created.student.id}`)
    await expect(h1(page, created.student.fullName)).toBeVisible()

    await account.getByRole('button', { name: 'Lưu trữ' }).click()
    const reactivate = account.getByRole('button', { name: 'Kích hoạt lại' })
    await expect(reactivate).toBeFocused()
    const archivedToast = toastRegion(page).getByRole('alertdialog').filter({ hasText: 'Đã lưu trữ' })
    await expect(archivedToast).toBeVisible()
    await expect(account).toContainText('Kích hoạt lại học viên để đặt lại mật khẩu.')
    expect(await trySignIn(browser, student.credentials)).toBe(401)
    // AC12 (f): the icon sits on the message's first line.
    const align = await archivedToast.evaluate((toast) => {
      const icon = toast.querySelector('svg')!.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(toast.querySelector('[role="status"]')!)
      const first = range.getClientRects()[0]!
      return {
        icon: icon.top + icon.height / 2,
        line: first.top + first.height / 2,
        lines: range.getClientRects().length,
      }
    })
    expect(
      Math.abs(align.icon - align.line),
      `icon centre on the first line (${align.lines} line boxes)`,
    ).toBeLessThanOrEqual(2)
    // The page scrolled to the end: the focused Reactivate stays clear of the toast (WCAG 2.2 SC 2.4.11).
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const [r, toastBox] = [await box(reactivate), await box(toastRegion(page))]
    expect(r.y + r.height, 'Reactivate above the toast').toBeLessThanOrEqual(toastBox.y)
    await expectToastPlacement(page)
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'archive-toast-vi')
    // Persistent: still there after 10 s (an action toast has no timeout).
    await page.waitForTimeout(10_500)
    await expect(archivedToast).toBeVisible()

    // Keyboard: F6 to the region, Tab to Undo, Enter.
    await reactivate.focus()
    await page.keyboard.press('F6')
    await expect.poll(() => toastRegion(page).evaluate((el) => el.contains(document.activeElement))).toBe(true)
    const undo = toastRegion(page).getByRole('button', { name: 'Hoàn tác' })
    for (let i = 0; i < 4 && !(await undo.evaluate((el) => el === document.activeElement)); i++)
      await page.keyboard.press('Tab')
    await expect(undo).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(account.getByRole('button', { name: 'Tạm nghỉ' })).toBeVisible()
    await expect(toastRegion(page)).toContainText('Đã hoàn tác lưu trữ')
    await expect(page.getByRole('heading', { level: 2, name: 'Tài khoản' })).toBeFocused()
    await expectFocusNotLost(page)
    expect(await trySignIn(browser, student.credentials)).toBe(200)
    acceptStatus(consoleGuard, 401, '/api/v1/auth/login')
  })

  test('AC5: Reactivate closes the archive toast and sign-in works again; leaving the page removes an archive toast', async ({
    page,
    browser,
    consoleGuard,
  }, testInfo) => {
    const created = await profileStudent(page, 'Kích Hoạt Lại')
    const student = await studentSession(browser, created)
    await student.context.close()
    const account = accountRegion(page)
    await page.goto(`/tutor/students/${created.student.id}`)
    await expect(h1(page, created.student.fullName)).toBeVisible()
    const archivedToast = toastRegion(page).getByRole('alertdialog').filter({ hasText: 'Đã lưu trữ' })
    await account.getByRole('button', { name: 'Lưu trữ' }).click()
    await expect(archivedToast).toBeVisible()
    await shot(page, testInfo, 'account-archived-vi')
    expect(await trySignIn(browser, student.credentials)).toBe(401)
    await account.getByRole('button', { name: 'Kích hoạt lại' }).click()
    await expect(archivedToast).toHaveCount(0)
    await expect(toastRegion(page)).toContainText(`Đã kích hoạt lại ${created.student.fullName}`)
    expect(await toastRegion(page).getByRole('alertdialog').count()).toBeLessThanOrEqual(3)
    expect(await trySignIn(browser, student.credentials)).toBe(200)
    await account.getByRole('button', { name: 'Lưu trữ' }).click()
    await expect(archivedToast).toBeVisible()
    await page.getByRole('link', { name: 'Về danh sách học viên' }).click()
    await expect(h1(page, 'Học viên')).toBeVisible()
    await expect(archivedToast).toHaveCount(0)
    acceptStatus(consoleGuard, 401, '/api/v1/auth/login')
  })

  test('AC12 (a), (b): with three toasts, a dialog covers them (buttons unobscured); Undo leaves the region for the Account heading', async ({
    page,
    consoleGuard,
  }, testInfo) => {
    if (testInfo.project.name === 'phone-small') expect(page.viewportSize()).toEqual({ width: 360, height: 740 })
    const created = await profileStudent(page, 'Ba Thông Báo')
    const account = accountRegion(page)
    const url = `/tutor/students/${created.student.id}`
    await page.goto(url)
    await expect(h1(page, created.student.fullName)).toBeVisible()
    const threeToasts = async () => {
      await account.getByRole('button', { name: 'Tạm nghỉ' }).click()
      await expect(account.getByRole('button', { name: 'Tiếp tục học' })).toBeFocused()
      await account.getByRole('button', { name: 'Tiếp tục học' }).click()
      await expect(account.getByRole('button', { name: 'Tạm nghỉ' })).toBeFocused()
      await account.getByRole('button', { name: 'Lưu trữ' }).click()
      await expect(account.getByRole('button', { name: 'Kích hoạt lại' })).toBeFocused()
      await expect(toastRegion(page).getByRole('alertdialog')).toHaveCount(3)
    }
    /** The focused dialog button is what the pointer hits, and no shown toast overlaps the dialog's buttons. */
    const expectUnobscured = async (dialog: Locator, names: string[]) => {
      await expect(page.locator('[data-entering]')).toHaveCount(0)
      const report = await page.evaluate((labels) => {
        const dialogEl = [...document.querySelectorAll('[role="alertdialog"]')].find(
          (d) => !d.closest('[data-toast-region]'),
        )!
        const buttons = labels.map((l) =>
          [...dialogEl.querySelectorAll('button')].find((b) => b.textContent?.trim() === l)!,
        )
        const toasts = [...document.querySelectorAll('[data-toast-region] [role="alertdialog"]')].filter((t) =>
          (t as HTMLElement).checkVisibility({ visibilityProperty: true }),
        )
        const overlaps = (a: DOMRect, b: DOMRect) =>
          a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
        const focused = document.activeElement as HTMLElement
        const f = focused.getBoundingClientRect()
        return {
          overlapping: buttons.flatMap((btn) =>
            toasts
              .filter((t) => overlaps(btn.getBoundingClientRect(), t.getBoundingClientRect()))
              .map(() => btn.textContent),
          ),
          hit: document.elementFromPoint(f.left + f.width / 2, f.top + f.height / 2)?.closest('button') === focused,
          focusedInDialog: dialogEl.contains(focused),
          regionInert: document.querySelector('[data-toast-region]')?.hasAttribute('inert') ?? true,
        }
      }, names)
      expect(report.overlapping, 'dialog buttons overlapped by a toast').toEqual([])
      expect(report.focusedInDialog).toBe(true)
      expect(report.hit, 'elementFromPoint at the focused button').toBe(true)
      expect(report.regionInert, 'toast region inert under the dialog').toBe(true)
      await expect(dialog).toBeVisible()
    }

    // The conflict dialog over three toasts (a stale Reactivate).
    await threeToasts()
    const latest = await apiCall<{ version: number }>(page, 'GET', `/api/v1/tutor/students/${created.student.id}`)
    expect(
      (
        await apiCall(page, 'POST', `/api/v1/tutor/students/${created.student.id}/status`, {
          status: 'ACTIVE',
          version: latest.body.version,
        })
      ).status,
    ).toBe(200)
    await account.getByRole('button', { name: 'Kích hoạt lại' }).click()
    const conflict = page.getByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })
    await expect(conflict.getByRole('button', { name: 'Huỷ' })).toBeFocused()
    acceptStatus(consoleGuard, 409, `/api/v1/tutor/students/${created.student.id}/status`)
    await expectUnobscured(conflict, ['Tải lại', 'Huỷ'])
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'conflict-over-toasts-vi')
    await conflict.getByRole('button', { name: 'Tải lại' }).click()
    await expect(account.getByRole('button', { name: 'Đặt lại mật khẩu' })).toBeVisible()
    await expect(conflict).toHaveCount(0)
    await expectFocusNotLost(page)
    // The toasts come back once the dialog is closed.
    await expect(toastRegion(page)).toBeVisible()
    await expect(toastRegion(page)).not.toHaveAttribute('inert')

    // The reset dialog over the toasts.
    await account.getByRole('button', { name: 'Đặt lại mật khẩu' }).click()
    const reset = page.getByRole('alertdialog', { name: `Đặt lại mật khẩu cho ${created.student.fullName}?` })
    await expect(reset.getByRole('button', { name: 'Huỷ' })).toBeFocused()
    await expectUnobscured(reset, ['Đặt lại mật khẩu', 'Huỷ'])
    await reset.getByRole('button', { name: 'Huỷ' }).click()
    await expect(reset).toHaveCount(0)
    await expectFocusNotLost(page)

    // AC12 (b): Undo with two other toasts open: focus does not stay in the region.
    await page.reload()
    await expect(h1(page, created.student.fullName)).toBeVisible()
    await threeToasts()
    await page.keyboard.press('F6')
    await expect.poll(() => toastRegion(page).evaluate((el) => el.contains(document.activeElement))).toBe(true)
    const undo = toastRegion(page).getByRole('button', { name: 'Hoàn tác' })
    for (let i = 0; i < 12 && !(await undo.evaluate((el) => el === document.activeElement)); i++)
      await page.keyboard.press('Tab')
    await expect(undo).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(account.getByRole('button', { name: 'Tạm nghỉ' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Tài khoản' })).toBeFocused()
    await expectFocusNotLost(page)
  })

  test('AC5/AC7: the Account alerts: a status error, an Undo failure, a reset on a student archived meanwhile', async ({
    page,
    consoleGuard,
  }, testInfo) => {
    const created = await profileStudent(page, 'Cảnh Báo')
    const account = accountRegion(page)
    const statusUrl = `**/api/v1/tutor/students/${created.student.id}/status`
    await page.goto(`/tutor/students/${created.student.id}`)
    await expect(h1(page, created.student.fullName)).toBeVisible()
    // A server error on Pause: the alert, nothing changed, no toast.
    await page.route(statusUrl, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/problem+json',
        body: '{"status":503,"code":"INTERNAL_ERROR"}',
      }),
    )
    await account.getByRole('button', { name: 'Tạm nghỉ' }).click()
    await expect(account.getByRole('alert')).toHaveText('Không chuyển học viên sang tạm nghỉ được. Hãy thử lại.')
    await expect(toastRegion(page)).toHaveCount(0)
    await expect(account).toContainText('Đang học')
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'account-alert-status-vi')
    await page.unroute(statusUrl)

    // Undo after another tab changed the student: "Couldn't undo".
    await account.getByRole('button', { name: 'Lưu trữ' }).click()
    // AC12 (h): the archive has landed (its toast and Reactivate) before the other tab reads the version.
    await expect(toastRegion(page).getByRole('button', { name: 'Hoàn tác' })).toBeVisible()
    await expect(account.getByRole('button', { name: 'Kích hoạt lại' })).toBeVisible()
    await expect(account.getByRole('alert')).toHaveCount(0)
    const latest = await apiCall<{ version: number }>(page, 'GET', `/api/v1/tutor/students/${created.student.id}`)
    expect(
      (
        await apiCall(page, 'POST', `/api/v1/tutor/students/${created.student.id}/status`, {
          status: 'ACTIVE',
          version: latest.body.version,
        })
      ).status,
    ).toBe(200)
    await toastRegion(page).getByRole('button', { name: 'Hoàn tác' }).click()
    await expect(account.getByRole('alert')).toHaveText('Không hoàn tác được. Hãy dùng Kích hoạt lại.')
    await expect(account.getByRole('button', { name: 'Tạm nghỉ' })).toBeVisible()
    await expect(page.getByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })).toHaveCount(0)
    await shot(page, testInfo, 'account-alert-undo-vi')

    // Reset on a student archived in another tab: the dialog closes, the alert, no card.
    const now = await apiCall<{ version: number }>(page, 'GET', `/api/v1/tutor/students/${created.student.id}`)
    await apiCall(page, 'POST', `/api/v1/tutor/students/${created.student.id}/status`, {
      status: 'ARCHIVED',
      version: now.body.version,
    })
    await account.getByRole('button', { name: 'Đặt lại mật khẩu' }).click()
    const dialog = page.getByRole('alertdialog', { name: `Đặt lại mật khẩu cho ${created.student.fullName}?` })
    await dialog.getByRole('button', { name: 'Đặt lại mật khẩu' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(account.getByRole('alert')).toHaveText('Học viên này đã được lưu trữ. Hãy kích hoạt lại trước.')
    await expect(account.getByRole('button', { name: 'Kích hoạt lại' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Mật khẩu tạm mới' })).toHaveCount(0)
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'account-alert-reset-archived-vi')
    acceptStatus(consoleGuard, 503, `/api/v1/tutor/students/${created.student.id}/status`)
    acceptStatus(
      consoleGuard,
      409,
      new RegExp(`^/api/v1/tutor/students/${created.student.id}/(status|password-reset)$`),
    )
  })
})

test.describe('Reset password (F10, T-M2.14)', () => {
  test('AC6/AC7/AC10: ≤ 3 steps; the card; nothing kept; the student is signed out and must change the password', async ({
    page,
    context,
    browser,
  }, testInfo) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const created = await profileStudent(page, 'Đặt Lại')
    const student = await studentSession(browser, created)
    const account = accountRegion(page)
    await page.goto(`/tutor/students/${created.student.id}`)
    await expect(h1(page, created.student.fullName)).toBeVisible()

    const steps = new StepCounter()
    const dialog = page.getByRole('alertdialog', { name: `Đặt lại mật khẩu cho ${created.student.fullName}?` })
    await steps.step('Reset password', async () => {
      await account.getByRole('button', { name: 'Đặt lại mật khẩu' }).click()
      await expect(dialog).toBeVisible()
    })
    await expect(dialog).toContainText('đăng xuất trên mọi thiết bị')
    await expect(dialog.getByRole('button', { name: 'Huỷ' })).toBeFocused()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'reset-dialog-vi')
    const heading = page.getByRole('heading', { level: 2, name: 'Mật khẩu tạm mới' })
    await steps.step('Confirm Reset password', async () => {
      await dialog.getByRole('button', { name: 'Đặt lại mật khẩu' }).click()
      await expect(heading).toBeFocused()
    })
    await expect(dialog).toHaveCount(0)
    await expectFocusNotLost(page)
    const card = page.locator('section[class*="card"]', { has: heading })
    await expect(card).toContainText(`Gửi cho ${created.student.fullName} thông tin đăng nhập mới này.`)
    await expect(card).toContainText(new URL('/login', page.url()).href)
    await expect(page.getByRole('button', { name: 'Sửa hồ sơ', exact: true })).toBeDisabled()
    const password = (await card.locator('dd span[class*="secret"]').textContent())!.trim()
    expect(password.length).toBeGreaterThanOrEqual(14)
    await expectActionRow(page, card.locator('[class*="stackedActions"]').first())
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'reset-card-vi')
    await steps.step('Copy message', async () => {
      await card.getByRole('button', { name: 'Sao chép tin nhắn' }).click()
      await expect(card.getByRole('status').filter({ hasText: 'Đã sao chép' })).toHaveCount(1)
    })
    steps.expectAtMost(3)
    await evidenceRecord(testInfo, 'steps-f10', {
      flow: "F10 Reset a student's password (ux-flows, budget ≤ 3 steps)",
      viewport: page.viewportSize(),
      steps: steps.count,
      named: steps.steps,
      budget: 3,
    })
    const message = await page.evaluate(() => navigator.clipboard.readText())
    expect(message.split('\n')[0]).toBe('Xin chào,')
    for (const value of [created.student.username, password, new URL('/login', page.url()).href])
      expect(message).toContain(value)
    expect(message).toContain('tự đặt mật khẩu mới ở lần đăng nhập đầu tiên')

    // Nothing kept: storage, history state, URL.
    const kept = await page.evaluate(() =>
      JSON.stringify([{ ...localStorage }, { ...sessionStorage }, history.state, location.href]),
    )
    expect(kept).not.toContain(password)
    await page.getByRole('button', { name: 'Xong' }).click()
    await expect(account.getByRole('button', { name: 'Đặt lại mật khẩu' })).toBeFocused()
    await expectFocusNotLost(page)
    await expect(page.getByText(password)).toHaveCount(0)

    // The student's open session ended; the old password fails; the temporary one signs in to the forced change.
    expect((await apiCall(student.page, 'GET', '/api/v1/auth/session')).status).toBe(401)
    await student.context.close()
    expect(await trySignIn(browser, student.credentials)).toBe(401)
    const fresh = await browser.newContext({ storageState: ANONYMOUS })
    const signIn = await fresh.newPage()
    await signIn.goto('/login')
    await signInWithForm(signIn, { username: created.student.username, password })
    await expect(signIn).toHaveURL(/\/change-password$/)
    await fresh.close()
  })

  test('AC7: Back, forward and a reload after a reset never show the card again', async ({ page }) => {
    const created = await profileStudent(page, 'Không Còn Thẻ')
    const url = `/tutor/students/${created.student.id}`
    await page.goto(url)
    await accountRegion(page).getByRole('button', { name: 'Đặt lại mật khẩu' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Đặt lại mật khẩu' }).click()
    const heading = page.getByRole('heading', { level: 2, name: 'Mật khẩu tạm mới' })
    await expect(heading).toBeFocused()
    const password = (await page.locator('dd span[class*="secret"]').textContent())!.trim()
    await page.getByRole('link', { name: 'Về danh sách học viên' }).click()
    await expect(h1(page, 'Học viên')).toBeVisible()
    await page.goBack()
    await expect(h1(page, created.student.fullName)).toBeVisible()
    await expect(heading).toHaveCount(0)
    await page.goForward()
    await page.goBack()
    await expect(h1(page, created.student.fullName)).toBeVisible()
    await expect(heading).toHaveCount(0)
    await page.reload()
    await expect(h1(page, created.student.fullName)).toBeVisible()
    await expect(heading).toHaveCount(0)
    await expect(page.getByText(password)).toHaveCount(0)
  })
})

test.describe('English UI (T-M2.14 AC10)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('englms.locale', 'en'))
  })

  test('the Profile view, the edit form with errors, the conflict dialog, the Account section, the toast, the reset dialog and card in English', async ({
    page,
    context,
    consoleGuard,
  }, testInfo) => {
    const created = await profileStudent(page, 'English Profile')
    const url = `/tutor/students/${created.student.id}`
    await page.goto(url)
    await expect(h1(page, created.student.fullName)).toBeVisible()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'profile-view-en')
    await page.getByRole('button', { name: 'Edit profile' }).click()
    await page.getByRole('textbox', { name: 'Full name (required)' }).fill('')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: "The profile wasn't saved" })).toBeFocused()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'edit-errors-en')
    // A conflict: another tab saves first.
    await page.getByRole('textbox', { name: 'Full name (required)' }).fill(created.student.fullName)
    const other = await context.newPage()
    await other.goto(url)
    await accountRegion(other).getByRole('button', { name: 'Pause' }).click()
    await expect(accountRegion(other)).toContainText('Paused')
    await other.close()
    await page.getByRole('textbox', { name: 'Note' }).fill('My note')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    const conflict = page.getByRole('alertdialog', { name: 'This was changed elsewhere' })
    await expect(conflict.getByRole('button', { name: 'Copy my note' })).toBeVisible()
    acceptStatus(consoleGuard, 409, url.replace('/tutor', '/api/v1/tutor'))
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'conflict-dialog-en')
    await conflict.getByRole('button', { name: 'Reload' }).click()
    await expect(page.getByRole('form')).toHaveCount(0)
    const account = accountRegion(page)
    await expect(account).toContainText('Paused')
    await shot(page, testInfo, 'account-paused-en')
    await account.getByRole('button', { name: 'Archive' }).click()
    await expect(toastRegion(page)).toContainText('archived. They can no longer sign in.')
    await expect(toastRegion(page).getByRole('button', { name: 'Undo' })).toBeVisible()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'archive-toast-en')
    await toastRegion(page).getByRole('button', { name: 'Undo' }).click()
    await expect(account.getByRole('button', { name: 'Resume' })).toBeVisible()
    await expect(toastRegion(page)).toContainText('Archiving undone')
    await account.getByRole('button', { name: 'Reset password' }).click()
    const dialog = page.getByRole('alertdialog', { name: `Reset the password for ${created.student.fullName}?` })
    await expect(dialog).toBeVisible()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'reset-dialog-en')
    await dialog.getByRole('button', { name: 'Reset password' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'New temporary password' })).toBeFocused()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'reset-card-en')
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(account.getByRole('button', { name: 'Reset password' })).toBeFocused()
  })
})
