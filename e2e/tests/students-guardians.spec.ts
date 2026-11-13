import type { Locator, Page } from '@playwright/test'
import { apiCall, TUTOR_STATE } from '../support/auth'
import { expectFocusNotLost, expectSettledAccessible, lineCount } from '../support/checks'
import { evidenceRecord } from '../support/evidence'
import { expect, test } from '../support/fixtures'
import { StepCounter } from '../support/steps'
import {
  acceptStatus,
  accountRegion,
  box,
  expectActionRow,
  expectFieldsStacked,
  fictitiousGuardian,
  fullNameField,
  guardiansRegion,
  h1,
  navItem,
  profileStudent,
  shot,
  toastRegion,
  token,
} from '../support/students'

// T-M2.15 (guardians on the Profile view and in Add student) at the mandatory viewports: AC1–AC7, AC9 (axe in vi and en,
// layout rules, keyboard-only, the F11 step log). Fictitious guardians only: invented names, example.com emails, phones
// from the range reserved for fiction (+1 555 0100–0199). Each test creates its own students (dev data, kept).

test.use({ storageState: TUTOR_STATE })

const guardianNames = (page: Page) => guardiansRegion(page).getByRole('heading', { level: 3 }).allTextContents()

/** Records the JSON bodies of the guardian writes (POST …/guardians, PATCH and DELETE /tutor/guardians/{gid}). */
function guardianWrites(page: Page) {
  const writes: Array<{ method: string; body: unknown }> = []
  page.on('request', (r) => {
    const url = new URL(r.url()).pathname
    if (
      (r.method() === 'POST' && /\/api\/v1\/tutor\/students\/[^/]+\/guardians$/.test(url)) ||
      (['PATCH', 'DELETE'].includes(r.method()) && url.startsWith('/api/v1/tutor/guardians/'))
    )
      writes.push({
        method: r.method(),
        body: r.method() === 'DELETE' ? null : r.postDataJSON(),
      })
  })
  return writes
}

test.describe('Guardians (T-M2.15)', () => {
  test('AC1/AC2/AC9: none yet, F11 add in ≤ 3 steps, then a second with all fields; layout rules; axe', async ({
    page,
  }, testInfo) => {
    const created = await profileStudent(page, 'Phụ Huynh Mới')
    const writes = guardianWrites(page)
    await page.goto(`/tutor/students/${created.student.id}`)
    await expect(h1(page, created.student.fullName)).toBeVisible()
    const section = guardiansRegion(page)
    await expect(section.getByText('Chưa thêm phụ huynh nào.')).toBeVisible()
    expect(await page.getByRole('main').getByRole('heading', { level: 2 }).allTextContents()).toEqual([
      'Thông tin cá nhân',
      'Liên hệ',
      'Ghi chú',
      'Phụ huynh',
      // T-M2.17 (DEC-140 (1)): the Learning profile section sits between Guardians and Account.
      'Hồ sơ học tập',
      'Tài khoản',
    ])
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'guardians-empty-vi')

    const steps = new StepCounter()
    const form = page.getByRole('form', { name: 'Phụ huynh mới' })
    await steps.step('Add guardian', async () => {
      await section.getByRole('button', { name: 'Thêm phụ huynh' }).click()
      await expect(form.getByRole('textbox', { name: 'Tên (bắt buộc)' })).toBeFocused()
    })
    await expectFocusNotLost(page)
    await expectFieldsStacked(form)
    await expectActionRow(page, form.locator('[class*="stackedActions"]'))
    await shot(page, testInfo, 'guardian-add-form-vi')
    await steps.step('type the name', async () => {
      await form.getByRole('textbox', { name: 'Tên (bắt buộc)' }).fill('Lê Thị Hư Cấu')
    })
    await steps.step('Save', async () => {
      await form.getByRole('button', { name: 'Lưu', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Sửa Lê Thị Hư Cấu' })).toBeFocused()
    })
    steps.expectAtMost(3)
    await evidenceRecord(testInfo, 'steps-f11', {
      flow: 'F11 Add a guardian (ux-flows, budget ≤ 3 steps)',
      viewport: page.viewportSize(),
      steps: steps.count,
      named: steps.steps,
      budget: 3,
    })
    await expect(toastRegion(page).getByRole('status').filter({ hasText: 'Đã thêm phụ huynh' })).toBeVisible()
    await expectFocusNotLost(page)
    expect(writes).toEqual([{ method: 'POST', body: { name: 'Lê Thị Hư Cấu' } }])

    await section.getByRole('button', { name: 'Thêm phụ huynh' }).click()
    await form.getByRole('textbox', { name: 'Tên (bắt buộc)' }).fill(' Trần Văn Giả Định ')
    await form.getByRole('textbox', { name: 'Quan hệ' }).fill('Bố')
    await form.getByRole('textbox', { name: 'Điện thoại' }).fill('+1 555 0142')
    await form.getByRole('textbox', { name: 'Email' }).fill('gia.dinh@example.com')
    await form.getByRole('textbox', { name: 'Ghi chú' }).fill('Gọi sau 18 giờ\nKhông nhắn tin')
    await form.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Sửa Trần Văn Giả Định' })).toBeFocused()
    expect(writes[1]).toEqual({
      method: 'POST',
      body: {
        name: 'Trần Văn Giả Định',
        relationship: 'Bố',
        phone: '+1 555 0142',
        email: 'gia.dinh@example.com',
        notes: 'Gọi sau 18 giờ\nKhông nhắn tin',
      },
    })
    expect(await guardianNames(page)).toEqual(['Lê Thị Hư Cấu', 'Trần Văn Giả Định'])
    const second = section.getByRole('listitem').nth(1)
    await expect(second.getByRole('link', { name: 'Gửi email tới gia.dinh@example.com' })).toBeVisible()
    await expect(second.getByRole('link', { name: /^Gọi \+1 555 0142$/ })).toBeVisible()
    expect(await lineCount(second.locator('[class*="note"]'))).toBe(2)
    await expect(section.getByRole('listitem').first().getByText('Chưa có')).toHaveCount(4)
    // The divider sits between the guardians, not above the first.
    const borders = await section
      .getByRole('listitem')
      .evaluateAll((items) => items.map((li) => getComputedStyle(li).borderTopWidth))
    expect(borders).toEqual(['0px', '1px'])
    await expectActionRow(page, second.locator('[class*="stackedActions"]'))
    await expect(toastRegion(page)).toBeHidden({ timeout: 15_000 })
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'guardians-two-vi')
    // The list stays after a reload (insertion order).
    await page.reload()
    await expect(section.getByRole('heading', { level: 3 })).toHaveCount(2)
    expect(await guardianNames(page)).toEqual(['Lê Thị Hư Cấu', 'Trần Văn Giả Định'])
  })

  test('AC1/AC9: ten guardians, a 120-character name and a 2,000-character note: no Add, the limit text, no horizontal scroll', async ({
    page,
  }, testInfo) => {
    const longName = `Phụ Huynh Tên Dài ${'Nguyễn'.repeat(17)}`.slice(0, 120)
    const longNote = `${'Ghi chú rất dài không có khoảng trắng '.repeat(40)}${'x'.repeat(2000)}`.slice(0, 2000)
    const guardians = Array.from({ length: 10 }, (_, i) =>
      i === 0
        ? fictitiousGuardian(i, {
            name: longName,
            notes: longNote,
            email: `${'rat.dai.'.repeat(20)}x@example.com`,
          })
        : fictitiousGuardian(i),
    )
    expect([...longName].length).toBe(120)
    const created = await profileStudent(page, 'Mười Phụ Huynh', { guardians })
    await page.goto(`/tutor/students/${created.student.id}`)
    const section = guardiansRegion(page)
    await expect(section.getByRole('heading', { level: 3 })).toHaveCount(10)
    expect(await guardianNames(page)).toEqual(guardians.map((g) => g.name))
    await expect(section.getByRole('button', { name: 'Thêm phụ huynh' })).toHaveCount(0)
    await expect(section.getByText('Tối đa 10 phụ huynh. Hãy xoá bớt một người để thêm người khác.')).toBeVisible()
    const first = section.getByRole('listitem').first()
    const sectionBox = await box(section)
    // The heading and the Notes value (its block `dd`: pre-wrap's trailing spaces hang past an inline box).
    for (const part of [first.getByRole('heading', { level: 3 }), first.locator('dd').last()]) {
      const b = await box(part)
      expect(b.x + b.width, 'inside the column').toBeLessThanOrEqual(sectionBox.x + sectionBox.width + 1)
    }
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'guardians-ten-vi')
  })

  test('AC3/AC9: edit opens with the saved values; errors focus the summary; only the changed fields are sent', async ({
    page,
  }, testInfo) => {
    const created = await profileStudent(page, 'Sửa Phụ Huynh', {
      guardians: [fictitiousGuardian(10, { name: 'Đỗ Thị Hư Cấu', notes: 'Dòng một' })],
    })
    const writes = guardianWrites(page)
    await page.goto(`/tutor/students/${created.student.id}`)
    await page.getByRole('button', { name: 'Sửa Đỗ Thị Hư Cấu' }).click()
    const form = page.getByRole('form', {
      name: 'Sửa phụ huynh Đỗ Thị Hư Cấu',
    })
    const name = form.getByRole('textbox', { name: 'Tên (bắt buộc)' })
    await expect(name).toBeFocused()
    await expectFocusNotLost(page)
    await expect(form.getByRole('textbox', { name: 'Điện thoại' })).toHaveValue('+1 555 0110')
    await expect(form.getByRole('textbox', { name: 'Email' })).toHaveValue('guardian.11@example.com')
    await expectFieldsStacked(form)
    await expect(page.getByRole('button', { name: 'Sửa hồ sơ', exact: true })).toBeDisabled()
    await name.fill('')
    await form.getByRole('textbox', { name: 'Email' }).fill('khong-hop-le')
    await form.getByRole('button', { name: 'Lưu', exact: true }).click()
    const summary = page.getByRole('alert').filter({ hasText: 'Chưa lưu được phụ huynh' })
    await expect(summary).toBeFocused()
    await expect(summary.getByRole('link')).toHaveText([
      'Hãy nhập tên phụ huynh.',
      'Hãy nhập địa chỉ email dạng ten@vidu.com.',
    ])
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'guardian-edit-errors-vi')
    expect(writes).toEqual([])
    await name.fill('Đỗ Thị Hư Cấu')
    await form.getByRole('textbox', { name: 'Điện thoại' }).fill('+1 555 0177')
    await form.getByRole('textbox', { name: 'Email' }).fill('')
    await form.getByRole('button', { name: 'Lưu', exact: true }).click()
    const edit = page.getByRole('button', { name: 'Sửa Đỗ Thị Hư Cấu' })
    await expect(edit).toBeFocused()
    expect(writes).toEqual([
      {
        method: 'PATCH',
        body: { version: 0, phone: '+1 555 0177', email: null },
      },
    ])
    const item = guardiansRegion(page).getByRole('listitem').first()
    await expect(item.getByRole('link', { name: /^Gọi \+1 555 0177$/ })).toBeVisible()
    await expect(toastRegion(page).getByRole('status').filter({ hasText: 'Đã lưu thông tin phụ huynh' })).toBeVisible()
    await expectFocusNotLost(page)
    // Unchanged: no request.
    await edit.click()
    await form.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(edit).toBeFocused()
    expect(writes).toHaveLength(1)
    // T-M2.19 AC4: a clean Cancel closes the form.
    await edit.click()
    await form.getByRole('button', { name: 'Huỷ' }).click()
    await expect(page.getByRole('form')).toHaveCount(0)
    await expectFocusNotLost(page)
  })

  test('AC4: two pages: a stale save opens the conflict dialog (Copy my notes, Cancel, Reload); a removed guardian shows the alert', async ({
    page,
    context,
    consoleGuard,
  }, testInfo) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const created = await profileStudent(page, 'Hai Tab Phụ Huynh', {
      guardians: [fictitiousGuardian(20, { name: 'Vũ Thị Hư Cấu' }), fictitiousGuardian(21, { name: 'Vũ Văn Giả' })],
    })
    const url = `/tutor/students/${created.student.id}`
    await page.goto(url)
    await page.getByRole('button', { name: 'Sửa Vũ Thị Hư Cấu' }).click()
    const other = await context.newPage()
    await other.goto(url)
    await other.getByRole('button', { name: 'Sửa Vũ Thị Hư Cấu' }).click()
    await other.getByRole('textbox', { name: 'Điện thoại' }).fill('+1 555 0199')
    await other.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(other.getByRole('button', { name: 'Sửa Vũ Thị Hư Cấu' })).toBeFocused()

    await page.getByRole('textbox', { name: 'Ghi chú' }).fill('Ghi chú của tab này')
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    const dialog = page.getByRole('alertdialog', {
      name: 'Đã có thay đổi ở nơi khác',
    })
    await expect(dialog).toBeVisible()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'guardian-conflict-vi')
    await dialog.getByRole('button', { name: 'Sao chép ghi chú phụ huynh của tôi' }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Ghi chú của tab này')
    await dialog.getByRole('button', { name: 'Huỷ' }).click()
    await expect(page.getByRole('textbox', { name: 'Ghi chú' })).toHaveValue('Ghi chú của tab này')
    await expect(dialog).toHaveCount(0)
    await expectFocusNotLost(page)
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await dialog.getByRole('button', { name: 'Tải lại' }).click()
    await expect(page.getByRole('form')).toHaveCount(0)
    await expect(guardiansRegion(page).getByRole('link', { name: /^Gọi \+1 555 0199$/ })).toBeVisible()
    await expectFocusNotLost(page)

    // The other page removes the second guardian; this page saves it: 404 → refetched, the alert has focus.
    await page.getByRole('button', { name: 'Sửa Vũ Văn Giả' }).click()
    await other.getByRole('button', { name: 'Xoá Vũ Văn Giả' }).click()
    await other.getByRole('alertdialog').getByRole('button', { name: 'Xoá phụ huynh' }).click()
    await expect(other.getByRole('heading', { level: 2, name: 'Phụ huynh', exact: true })).toBeFocused()
    await page.getByRole('textbox', { name: 'Quan hệ' }).fill('Bác')
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    const removed = guardiansRegion(page).getByText('Phụ huynh này đã bị xoá ở một tab hoặc cửa sổ khác.')
    await expect(removed).toBeVisible()
    await expect(page.locator('#guardians-removed')).toBeFocused()
    await expect.poll(() => guardianNames(page)).toEqual(['Vũ Thị Hư Cấu'])
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'guardian-removed-elsewhere-vi')
    await page.getByRole('button', { name: 'Thêm phụ huynh' }).click()
    await expect(removed).toHaveCount(0)
    acceptStatus(consoleGuard, 409, /^\/api\/v1\/tutor\/guardians\//)
    acceptStatus(consoleGuard, 404, /^\/api\/v1\/tutor\/guardians\//)
  })

  test("AC2: two pages: another page's 10th guardian → the 10-guardians alert and the refetched list", async ({
    page,
    context,
    consoleGuard,
  }) => {
    const created = await profileStudent(page, 'Chín Phụ Huynh', {
      guardians: Array.from({ length: 9 }, (_, i) => fictitiousGuardian(30 + i)),
    })
    await page.goto(`/tutor/students/${created.student.id}`)
    await page.getByRole('button', { name: 'Thêm phụ huynh' }).click()
    await page.getByRole('textbox', { name: 'Tên (bắt buộc)' }).fill('Người Thứ Mười Một')
    const other = await context.newPage()
    await other.goto(`/tutor/students/${created.student.id}`)
    await other.getByRole('button', { name: 'Thêm phụ huynh' }).click()
    await other.getByRole('textbox', { name: 'Tên (bắt buộc)' }).fill('Người Thứ Mười')
    await other.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(other.getByRole('button', { name: 'Sửa Người Thứ Mười' })).toBeFocused()
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    const alert = page.getByRole('form').getByRole('alert').filter({ hasText: 'Học viên này đã có 10 phụ huynh.' })
    await expect(alert).toBeVisible()
    await expect(alert.locator('..')).toBeFocused()
    await expect(guardiansRegion(page).getByRole('heading', { level: 3 })).toHaveCount(10)
    await expect(page.getByRole('textbox', { name: 'Tên (bắt buộc)' })).toHaveValue('Người Thứ Mười Một')
    await expectSettledAccessible(page)
    acceptStatus(consoleGuard, 422, new RegExp(`^/api/v1/tutor/students/${created.student.id}/guardians$`))
  })

  test('AC5: Remove asks first; Cancel keeps it; a 5xx keeps the dialog with its alert; confirm toasts and focuses the heading', async ({
    page,
    consoleGuard,
  }, testInfo) => {
    const created = await profileStudent(page, 'Xoá Phụ Huynh', {
      guardians: [
        fictitiousGuardian(40, { name: 'Phan Thị Hư Cấu' }),
        fictitiousGuardian(41, { name: 'Phan Văn Giả' }),
      ],
    })
    const writes = guardianWrites(page)
    await page.goto(`/tutor/students/${created.student.id}`)
    const remove = page.getByRole('button', { name: 'Xoá Phan Thị Hư Cấu' })
    await remove.click()
    const dialog = page.getByRole('alertdialog', {
      name: 'Xoá Phan Thị Hư Cấu khỏi danh sách phụ huynh?',
    })
    await expect(dialog).toContainText('Không thể hoàn tác.')
    await expect(dialog.getByRole('button', { name: 'Huỷ' })).toBeFocused()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'guardian-remove-dialog-vi')
    await dialog.getByRole('button', { name: 'Huỷ' }).click()
    await expect(remove).toBeFocused()
    await expectFocusNotLost(page)
    expect(writes).toEqual([])
    // A server failure (once): the dialog stays with its alert.
    await page.route('**/api/v1/tutor/guardians/*', (route) =>
      route.request().method() === 'DELETE'
        ? route.fulfill({
            status: 500,
            contentType: 'application/problem+json',
            body: JSON.stringify({
              type: 'about:blank',
              title: 'Error',
              status: 500,
              code: 'INTERNAL_ERROR',
            }),
          })
        : route.fallback(),
    )
    await remove.click()
    await dialog.getByRole('button', { name: 'Xoá phụ huynh' }).click()
    await expect(dialog.getByRole('alert')).toHaveText('Không xoá được phụ huynh. Hãy thử lại.')
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'guardian-remove-error-vi')
    await page.unroute('**/api/v1/tutor/guardians/*')
    await dialog.getByRole('button', { name: 'Xoá phụ huynh' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 2, name: 'Phụ huynh', exact: true })).toBeFocused()
    await expect(toastRegion(page).getByRole('status').filter({ hasText: 'Đã xoá Phan Thị Hư Cấu' })).toBeVisible()
    await expectFocusNotLost(page)
    expect(await guardianNames(page)).toEqual(['Phan Văn Giả'])
    await page.reload()
    await expect(guardiansRegion(page).getByRole('heading', { level: 3 })).toHaveText(['Phan Văn Giả'])
    acceptStatus(consoleGuard, 500, /^\/api\/v1\/tutor\/guardians\//)
  })

  test('AC6: one form at a time (hints); a dirty guardian form asks on navigation and on Cancel', async ({ page }) => {
    const created = await profileStudent(page, 'Một Biểu Mẫu', {
      guardians: [fictitiousGuardian(50, { name: 'Hồ Thị Hư Cấu' })],
    })
    await page.goto(`/tutor/students/${created.student.id}`)
    const section = guardiansRegion(page)
    await page.getByRole('button', { name: 'Sửa hồ sơ', exact: true }).click()
    await expect(section.getByText('Hãy lưu hoặc huỷ thay đổi trước.')).toBeVisible()
    for (const name of ['Sửa Hồ Thị Hư Cấu', 'Xoá Hồ Thị Hư Cấu', 'Thêm phụ huynh'])
      await expect(section.getByRole('button', { name })).toBeDisabled()
    await page.getByRole('button', { name: 'Huỷ', exact: true }).click()
    await expect(page.getByRole('form')).toHaveCount(0)
    await expectFocusNotLost(page)
    await section.getByRole('button', { name: 'Thêm phụ huynh' }).click()
    await expect(page.getByRole('button', { name: 'Sửa hồ sơ', exact: true })).toBeDisabled()
    await expect(section.getByRole('button', { name: 'Sửa Hồ Thị Hư Cấu' })).toBeDisabled()
    await expect(accountRegion(page).getByText('Hãy lưu hoặc huỷ thay đổi trước.')).toBeVisible()
    await expect(accountRegion(page).getByRole('button', { name: 'Tạm nghỉ' })).toBeDisabled()
    await expect(section.getByText('Hãy lưu hoặc huỷ thay đổi trước.')).toHaveCount(0)
    await page.getByRole('textbox', { name: 'Tên (bắt buộc)' }).fill('Chưa lưu')
    await (await navItem(page, 'Hôm nay')).click()
    const discard = page.getByRole('alertdialog', { name: 'Bỏ các thay đổi?' })
    await expect(discard).toBeVisible()
    await discard.getByRole('button', { name: 'Tiếp tục sửa' }).click()
    await expect(discard).toHaveCount(0)
    await expect(page).toHaveURL(new RegExp(`/tutor/students/${created.student.id}$`))
    await expect(page.locator('[data-exiting]')).toHaveCount(0)
    await expectFocusNotLost(page)
    await page.getByRole('form', { name: 'Phụ huynh mới' }).getByRole('button', { name: 'Huỷ' }).click()
    await discard.getByRole('button', { name: 'Bỏ thay đổi' }).click()
    await expect(section.getByRole('button', { name: 'Thêm phụ huynh' })).toBeFocused()
    await expect(page.getByRole('form')).toHaveCount(0)
    await expectFocusNotLost(page)
  })

  test('AC7/AC9: Add student with guardian rows: the name error opens the section; the filled rows are sent and listed', async ({
    page,
  }, testInfo) => {
    const name = `Học Viên Có Phụ Huynh ${testInfo.project.name} ${token()}`
    const bodies: Array<Record<string, unknown>> = []
    page.on('request', (r) => {
      if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/v1/tutor/students') bodies.push(r.postDataJSON())
    })
    await page.goto('/tutor/students/new')
    await fullNameField(page).fill(name)
    await expect(page.getByText('Có thể dùng')).toBeVisible()
    const trigger = page.getByRole('button', {
      name: 'Phụ huynh (không bắt buộc)',
    })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await trigger.click()
    const addRow = page.getByRole('button', { name: 'Thêm phụ huynh' })
    for (let i = 0; i < 3; i++) await addRow.click()
    const row = (n: number) => page.getByRole('group', { name: `Phụ huynh ${n}` })
    await expect(row(3).getByRole('textbox', { name: 'Tên (bắt buộc)' })).toBeFocused()
    await expectFocusNotLost(page)
    await row(1).getByRole('textbox', { name: 'Tên (bắt buộc)' }).fill('Lý Thị Hư Cấu')
    await row(1).getByRole('textbox', { name: 'Điện thoại' }).fill('+1 555 0160')
    await row(2).getByRole('textbox', { name: 'Quan hệ' }).fill('   ')
    await row(3).getByRole('textbox', { name: 'Điện thoại' }).fill('+1 555 0161')
    await trigger.click()
    await page.getByRole('button', { name: 'Tạo', exact: true }).click()
    const summary = page.getByRole('alert').filter({ hasText: 'Chưa tạo được học viên' })
    await expect(summary).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(row(3).getByText('Hãy nhập tên phụ huynh.')).toBeVisible()
    // Each row: legend alone, fields stacked, Remove last and start-aligned.
    await expectFieldsStacked(row(1))
    const removeBox = await box(row(1).getByRole('button', { name: 'Xoá phụ huynh 1' }))
    const nameBox = await box(row(1).getByRole('textbox', { name: 'Tên (bắt buộc)' }))
    expect(Math.abs(removeBox.x - nameBox.x), 'Remove start-aligned').toBeLessThanOrEqual(1)
    expect(removeBox.y, 'Remove last').toBeGreaterThan(nameBox.y)
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'add-guardian-rows-error-vi')
    expect(bodies).toEqual([])
    await row(3).getByRole('textbox', { name: 'Tên (bắt buộc)' }).fill('Lý Văn Giả')
    await page.getByRole('button', { name: 'Tạo', exact: true }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Đã tạo học viên' })).toBeFocused()
    expect(bodies).toHaveLength(1)
    expect(bodies[0]!.guardians).toEqual([
      { name: 'Lý Thị Hư Cấu', phone: '+1 555 0160' },
      { name: 'Lý Văn Giả', phone: '+1 555 0161' },
    ])
    await page.getByRole('link', { name: 'Mở không gian học viên' }).click()
    await expect(h1(page, name)).toBeVisible()
    await expect(guardiansRegion(page).getByRole('heading', { level: 3 })).toHaveText(['Lý Thị Hư Cấu', 'Lý Văn Giả'])
  })

  test('AC7: a student without guardians: the request has no guardians', async ({ page }, testInfo) => {
    const bodies: Array<Record<string, unknown>> = []
    page.on('request', (r) => {
      if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/v1/tutor/students') bodies.push(r.postDataJSON())
    })
    await page.goto('/tutor/students/new')
    await fullNameField(page).fill(`Không Phụ Huynh ${testInfo.project.name} ${token()}`)
    await expect(page.getByText('Có thể dùng')).toBeVisible()
    await page.getByRole('button', { name: 'Tạo', exact: true }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Đã tạo học viên' })).toBeFocused()
    expect(bodies).toHaveLength(1)
    expect(bodies[0]).not.toHaveProperty('guardians')
    // T-M2.19 AC4: Add another replaces the card with an empty form.
    await page.getByRole('button', { name: 'Thêm học viên khác' }).click()
    await expect(fullNameField(page)).toHaveValue('')
    await expectFocusNotLost(page)
  })

  test('AC9: keyboard-only add, edit and remove (Tab, typing, Enter)', async ({ page }, testInfo) => {
    const created = await profileStudent(page, 'Bàn Phím Phụ Huynh')
    await page.goto(`/tutor/students/${created.student.id}`)
    await expect(h1(page, created.student.fullName)).toBeVisible()
    const tabTo = async (target: Locator, max = 80) => {
      for (let i = 0; i < max; i++) {
        if (await target.evaluate((el) => el === document.activeElement)) return
        await page.keyboard.press('Tab')
      }
      throw new Error('target never focused')
    }
    const log: string[] = []
    await tabTo(page.getByRole('button', { name: 'Thêm phụ huynh' }))
    await page.keyboard.press('Enter')
    log.push('Enter on Add guardian')
    await expect(page.getByRole('textbox', { name: 'Tên (bắt buộc)' })).toBeFocused()
    await page.keyboard.type('Mai Thị Bàn Phím')
    log.push('type the name')
    await tabTo(page.getByRole('button', { name: 'Lưu', exact: true }))
    await page.keyboard.press('Enter')
    log.push('Enter on Save')
    const edit = page.getByRole('button', { name: 'Sửa Mai Thị Bàn Phím' })
    await expect(edit).toBeFocused()
    await page.keyboard.press('Enter')
    log.push('Enter on Edit (focused after Save)')
    await tabTo(page.getByRole('textbox', { name: 'Quan hệ' }))
    await page.keyboard.type('Cô')
    log.push('type a relationship')
    await tabTo(page.getByRole('button', { name: 'Lưu', exact: true }))
    await page.keyboard.press('Enter')
    log.push('Enter on Save')
    await expect(edit).toBeFocused()
    await expect(guardiansRegion(page)).toContainText('Cô')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Xoá Mai Thị Bàn Phím' })).toBeFocused()
    await page.keyboard.press('Enter')
    log.push('Tab, Enter on Remove')
    const dialog = page.getByRole('alertdialog', {
      name: /^Xoá Mai Thị Bàn Phím/,
    })
    await expect(dialog.getByRole('button', { name: 'Huỷ' })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(dialog.getByRole('button', { name: 'Xoá phụ huynh' })).toBeFocused()
    await page.keyboard.press('Enter')
    log.push('Shift+Tab, Enter on Remove guardian')
    await expect(page.getByRole('heading', { level: 2, name: 'Phụ huynh', exact: true })).toBeFocused()
    await expect(guardiansRegion(page).getByText('Chưa thêm phụ huynh nào.')).toBeVisible()
    await evidenceRecord(testInfo, 'keyboard-guardians', {
      viewport: page.viewportSize(),
      actions: log,
    })
  })
})

test.describe('English UI (T-M2.15 AC9)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('englms.locale', 'en'))
  })

  test('the Guardians section (0, 2, 10), the form with errors, the remove dialog and the add form rows with an error', async ({
    page,
  }, testInfo) => {
    const none = await profileStudent(page, 'English No Guardians')
    await page.goto(`/tutor/students/${none.student.id}`)
    await expect(guardiansRegion(page).getByText('No guardians added.')).toBeVisible()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'guardians-empty-en')

    const ten = await profileStudent(page, 'English Ten Guardians', {
      guardians: Array.from({ length: 10 }, (_, i) =>
        fictitiousGuardian(60 + i, { name: `Invented Guardian ${i + 1}` }),
      ),
    })
    await page.goto(`/tutor/students/${ten.student.id}`)
    await expect(guardiansRegion(page).getByRole('heading', { level: 3 })).toHaveCount(10)
    await expect(guardiansRegion(page).getByText('Up to 10 guardians. Remove one to add another.')).toBeVisible()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'guardians-ten-en')

    const two = await profileStudent(page, 'English Two Guardians', {
      guardians: [
        fictitiousGuardian(80, {
          name: 'Jane Invented',
          relationship: 'Mother',
          notes: 'Call after 6 pm\nNo texts',
        }),
        { name: 'John Madeup' },
      ],
    })
    await page.goto(`/tutor/students/${two.student.id}`)
    await expect(guardiansRegion(page).getByRole('heading', { level: 3 })).toHaveText(['Jane Invented', 'John Madeup'])
    await expect(guardiansRegion(page).getByText('Not added')).toHaveCount(4)
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'guardians-two-en')
    await page.getByRole('button', { name: 'Edit Jane Invented' }).click()
    const form = page.getByRole('form', {
      name: 'Edit guardian Jane Invented',
    })
    await form.getByRole('textbox', { name: 'Name (required)' }).fill('')
    await form.getByRole('textbox', { name: 'Email' }).fill('not-an-email')
    await form.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: "The guardian wasn't saved" })).toBeFocused()
    // The summary's link and the field's own message.
    await expect(form.getByText("Enter the guardian's name.")).toHaveCount(2)
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'guardian-edit-errors-en')
    await form.getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Discard' }).click()
    await page.getByRole('button', { name: 'Remove John Madeup' }).click()
    const dialog = page.getByRole('alertdialog', {
      name: 'Remove John Madeup from the guardians?',
    })
    await expect(dialog).toContainText("Their contact details will be deleted. This can't be undone.")
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'guardian-remove-dialog-en')
    await dialog.getByRole('button', { name: 'Cancel' }).click()

    await page.goto('/tutor/students/new')
    await page.getByRole('button', { name: 'Guardians (optional)' }).click()
    await page.getByRole('button', { name: 'Add guardian' }).click()
    await page.getByRole('button', { name: 'Add guardian' }).click()
    await page
      .getByRole('group', { name: 'Guardian 1' })
      .getByRole('textbox', { name: 'Name (required)' })
      .fill('Ann Fiction')
    await page.getByRole('group', { name: 'Guardian 2' }).getByRole('textbox', { name: 'Email' }).fill('x@example.com')
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: "The student wasn't created" })).toBeFocused()
    await expect(page.getByRole('group', { name: 'Guardian 2' }).getByText("Enter the guardian's name.")).toBeVisible()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'add-guardian-rows-error-en')
  })

  test('the conflict dialog with Copy my notes and the removed-elsewhere alert in English', async ({
    page,
    context,
    consoleGuard,
  }, testInfo) => {
    const created = await profileStudent(page, 'English Conflict', {
      guardians: [{ name: 'Rose Invented', notes: 'First' }, { name: 'Tom Invented' }],
    })
    const url = `/tutor/students/${created.student.id}`
    const ids = (
      await apiCall<Array<{ id: string; version: number }>>(
        page,
        'GET',
        `/api/v1/tutor/students/${created.student.id}/guardians`,
      )
    ).body
    await page.goto(url)
    await page.getByRole('button', { name: 'Edit Rose Invented' }).click()
    const other = await context.newPage()
    await other.goto(url)
    expect(
      (
        await apiCall(other, 'PATCH', `/api/v1/tutor/guardians/${ids[0]!.id}`, {
          version: ids[0]!.version,
          relationship: 'Aunt',
        })
      ).status,
    ).toBe(200)
    await page.getByRole('textbox', { name: 'Notes' }).fill('My notes')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    const conflict = page.getByRole('alertdialog', {
      name: 'This was changed elsewhere',
    })
    await expect(conflict.getByRole('button', { name: 'Copy my notes' })).toBeVisible()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'guardian-conflict-en')
    await conflict.getByRole('button', { name: 'Reload' }).click()
    await expect(page.getByRole('form')).toHaveCount(0)
    await expect(guardiansRegion(page)).toContainText('Aunt')
    await page.getByRole('button', { name: 'Edit Tom Invented' }).click()
    expect((await apiCall(other, 'DELETE', `/api/v1/tutor/guardians/${ids[1]!.id}`)).status).toBe(204)
    await page.getByRole('textbox', { name: 'Relationship' }).fill('Uncle')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(guardiansRegion(page).getByText('This guardian was removed in another tab or window.')).toBeVisible()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'guardian-removed-elsewhere-en')
    acceptStatus(consoleGuard, 409, /^\/api\/v1\/tutor\/guardians\//)
    acceptStatus(consoleGuard, 404, /^\/api\/v1\/tutor\/guardians\//)
  })
})
