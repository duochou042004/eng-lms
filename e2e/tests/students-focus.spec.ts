import type { Page } from '@playwright/test'
import { apiCall, TUTOR_STATE } from '../support/auth'
import { expectFocusNotLost } from '../support/checks'
import { expect, test } from '../support/fixtures'
import { acceptStatus, apiStudent, failRequests, guardiansRegion, h1, profileStudent, token } from '../support/students'

// T-M2.19 (automated UI checks): AC4 (focus after the actions that remove or disable their own control, those no other
// test performs), AC5 (the motion tokens as rendered) and AC3 (the long-data walk) at the mandatory viewports.

test.use({ storageState: TUTOR_STATE })

test.describe('Focus after an action removes or disables its own control (T-M2.19 AC4)', () => {
  // AC8 (DEC-135, OQ T-M2.19-1): these controls unmount with their alert or empty state; focus goes to `main h1`, or for
  // Include archived to the toolbar's Include archived.
  const listAlert = (page: Page) => page.getByRole('alert').filter({ hasText: 'Không tải được danh sách học viên' })
  const listShown = (page: Page) => page.getByRole('table').or(page.getByRole('list', { name: 'Học viên' }))
  const anyCheck = (url: URL) => url.searchParams.get('size') === '1'
  /**
   * No active or paused student, only archived ones (simulated): the default view is empty; the rest passes through. With
   * `q`, the archived-inclusive list request (not the `size=1` check) carries it, so the test's own student is on the
   * first page whatever else the DB holds (DEC-165); the page URL keeps no `q`.
   */
  const onlyArchived = (page: Page, q?: string) =>
    page.route('**/api/v1/tutor/students?**', (route) => {
      const url = new URL(route.request().url())
      if (anyCheck(url)) return route.fallback()
      if (!url.searchParams.getAll('status').includes('ARCHIVED'))
        return route.fulfill({ json: { items: [], page: 0, size: 25, totalItems: 0, totalPages: 0 } })
      if (q) url.searchParams.set('q', q)
      return route.fallback({ url: url.toString() })
    })
  const noActive = (page: Page) =>
    page.getByRole('heading', { level: 2, name: 'Không có học viên đang học hoặc tạm nghỉ' })

  test('the list error: Try again: focus to the h1', async ({ page, consoleGuard }) => {
    const recover = await failRequests(page, '**/api/v1/tutor/students?**')
    await page.goto('/tutor/students')
    await expect(listAlert(page)).toBeVisible({ timeout: 15_000 })
    recover()
    acceptStatus(consoleGuard, 503, '/api/v1/tutor/students')
    await listAlert(page).getByRole('button', { name: 'Thử lại' }).click()
    await expect(listAlert(page)).toHaveCount(0)
    await expect(listShown(page)).toBeVisible()
    await expectFocusNotLost(page)
    await expect(h1(page, 'Học viên')).toBeFocused()
  })

  test('the any-student check error: Try again: focus to the h1', async ({ page, consoleGuard }) => {
    const recover = await failRequests(page, '**/api/v1/tutor/students?**', anyCheck)
    await onlyArchived(page)
    await page.goto('/tutor/students')
    await expect(listAlert(page)).toBeVisible({ timeout: 15_000 })
    recover()
    acceptStatus(consoleGuard, 503, '/api/v1/tutor/students')
    await listAlert(page).getByRole('button', { name: 'Thử lại' }).click()
    await expect(noActive(page)).toBeVisible()
    await expectFocusNotLost(page)
    await expect(h1(page, 'Học viên')).toBeFocused()
  })

  test('only archived students: Include archived: focus to the toolbar control', async ({ page }) => {
    const fullName = `Chỉ Lưu Trữ ${token()}`
    await onlyArchived(page, fullName)
    await page.goto('/tutor/students')
    const archived = await apiStudent(page, { fullName, username: `e2e-only-arch-${token()}` })
    const status = await apiCall(page, 'POST', `/api/v1/tutor/students/${archived.student.id}/status`, {
      status: 'ARCHIVED',
      version: archived.student.version,
    })
    expect(status.status).toBe(200)
    await page.getByRole('main').getByRole('button', { name: 'Gồm cả học viên đã lưu trữ' }).click()
    await expect(noActive(page)).toHaveCount(0)
    await expect(page).not.toHaveURL(/[?&]q=/)
    const row = page
      .getByRole('row')
      .or(page.getByRole('listitem'))
      .filter({ has: page.getByRole('link', { name: fullName }) })
    await expect(row.getByText('Đã lưu trữ', { exact: true })).toBeVisible()
    await expectFocusNotLost(page)
    await expect(page.getByRole('checkbox', { name: 'Gồm cả học viên đã lưu trữ' })).toBeFocused()
  })

  test('a search that finds nothing: Clear filters', async ({ page }) => {
    await page.goto(`/tutor/students?q=${encodeURIComponent(`khong co ai ${token()}`)}`)
    await page.getByRole('button', { name: 'Xoá bộ lọc' }).click()
    await expect(listShown(page)).toBeVisible()
    await expectFocusNotLost(page)
  })

  // AC8: the workspace's Try again unmounts with the error view; focus goes to the student's h1.
  test('the workspace error: Try again: focus to the h1', async ({ page, consoleGuard }) => {
    const created = await profileStudent(page, 'Thử Lại')
    const url = `/api/v1/tutor/students/${created.student.id}`
    const recover = await failRequests(page, `**${url}`)
    await page.goto(`/tutor/students/${created.student.id}`)
    const alert = page.getByRole('alert').filter({ hasText: 'Không tải được thông tin học viên' })
    await expect(alert).toBeVisible({ timeout: 15_000 })
    recover()
    acceptStatus(consoleGuard, 503, url)
    await alert.getByRole('button', { name: 'Thử lại' }).click()
    await expect(h1(page, created.student.fullName)).toBeVisible()
    await expectFocusNotLost(page)
    await expect(h1(page, created.student.fullName)).toBeFocused()
  })

  test('the workspace error: a Try again that fails again keeps focus on the h1; the next one shows the student (AC9 (a))', async ({
    page,
    consoleGuard,
  }) => {
    const created = await profileStudent(page, 'Thử Lại Hai Lần')
    const url = `/api/v1/tutor/students/${created.student.id}`
    const recover = await failRequests(page, `**${url}`)
    await page.goto(`/tutor/students/${created.student.id}`)
    const alert = page.getByRole('alert').filter({ hasText: 'Không tải được thông tin học viên' })
    await expect(alert).toBeVisible({ timeout: 15_000 })
    // Still failing: the error view comes back with focus on its h1.
    await alert.getByRole('button', { name: 'Thử lại' }).click()
    await expect(alert).toHaveCount(0)
    await expect(alert).toBeVisible({ timeout: 15_000 })
    await expectFocusNotLost(page)
    await expect(h1(page, 'Học viên')).toBeFocused()
    recover()
    acceptStatus(consoleGuard, 503, url)
    await alert.getByRole('button', { name: 'Thử lại' }).click()
    await expect(h1(page, created.student.fullName)).toBeVisible()
    await expectFocusNotLost(page)
    await expect(h1(page, created.student.fullName)).toBeFocused()
  })

  test('D-4: the guardians error: Try again (503 until the alert, then passed through) focuses the section heading', async ({
    page,
    consoleGuard,
  }) => {
    const created = await profileStudent(page, 'Thử Lại Phụ Huynh')
    const recover = await failRequests(page, '**/api/v1/tutor/students/*/guardians')
    await page.goto(`/tutor/students/${created.student.id}`)
    const alert = guardiansRegion(page).getByRole('alert')
    await expect(alert).toContainText('Không tải được danh sách phụ huynh.', { timeout: 15_000 })
    recover()
    acceptStatus(consoleGuard, 503, `/api/v1/tutor/students/${created.student.id}/guardians`)
    await alert.getByRole('button', { name: 'Thử lại' }).click()
    await expect(guardiansRegion(page).getByText('Chưa thêm phụ huynh nào.')).toBeVisible()
    await expectFocusNotLost(page)
    await expect(page.getByRole('heading', { level: 2, name: 'Phụ huynh', exact: true })).toBeFocused()
  })

  test('Add student: guardian-row Remove of the last, a middle and the first row; the 10th Add guardian; contact handles', async ({
    page,
  }) => {
    await page.goto('/tutor/students/new')
    await page.getByRole('button', { name: 'Phụ huynh (không bắt buộc)' }).click()
    const addRow = page.getByRole('button', { name: 'Thêm phụ huynh' })
    const row = (n: number) => page.getByRole('group', { name: `Phụ huynh ${n}` })
    const names = () =>
      page.getByRole('group', { name: /^Phụ huynh \d+$/ }).getByRole('textbox', { name: 'Tên (bắt buộc)' })
    for (const [n, name] of ['Lý Thị Một', 'Lý Văn Hai', 'Lý Thị Ba'].entries()) {
      await addRow.click()
      await row(n + 1)
        .getByRole('textbox', { name: 'Tên (bắt buộc)' })
        .fill(name)
    }
    const remove = async (n: number, left: string[]) => {
      await row(n)
        .getByRole('button', { name: `Xoá phụ huynh ${n}` })
        .click()
      await expect(names()).toHaveCount(left.length)
      for (const [i, name] of left.entries()) await expect(names().nth(i)).toHaveValue(name)
      await expectFocusNotLost(page)
    }
    await remove(3, ['Lý Thị Một', 'Lý Văn Hai']) // the last
    await addRow.click()
    await row(3).getByRole('textbox', { name: 'Tên (bắt buộc)' }).fill('Lý Văn Bốn')
    await remove(2, ['Lý Thị Một', 'Lý Văn Bốn']) // a middle one
    await remove(1, ['Lý Văn Bốn']) // the first
    await remove(1, []) // the only one: focus on Add guardian
    await expect(addRow).toBeFocused()
    // The 10th Add guardian removes the button (the limit text instead).
    for (let i = 0; i < 10; i++) await addRow.click()
    await expect(addRow).toHaveCount(0)
    await expect(page.getByText('Tối đa 10 phụ huynh. Hãy xoá bớt một người để thêm người khác.')).toBeVisible()
    await expectFocusNotLost(page)

    // Contact handles: Remove, and the 30th Add contact (the button is disabled at the limit).
    await page.getByRole('button', { name: 'Liên hệ (không bắt buộc)' }).click()
    const addHandle = page.getByRole('button', { name: 'Thêm liên hệ' })
    await addHandle.click()
    await addHandle.click()
    await page.getByRole('button', { name: 'Xoá liên hệ 2' }).click()
    await expect(page.getByRole('button', { name: /^Xoá liên hệ \d+$/ })).toHaveCount(1)
    await expectFocusNotLost(page)
    for (let i = 1; i < 30; i++) await addHandle.click()
    await expect(addHandle).toBeDisabled()
    await expect(page.getByText('Bạn có thể thêm tối đa 30 liên hệ.')).toBeVisible()
    await expectFocusNotLost(page)
  })
})
