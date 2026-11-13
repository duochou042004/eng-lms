import type { Locator, Page } from '@playwright/test'
import { TUTOR_STATE } from '../support/auth'
import { expectFocusNotLost, expectSettledAccessible, lineCount } from '../support/checks'
import { evidenceRecord } from '../support/evidence'
import { expect, test } from '../support/fixtures'
import { StepCounter } from '../support/steps'
import {
  acceptStatus,
  accountRegion,
  apiProfile,
  box,
  expectActionRow,
  expectFieldsStacked,
  failRequests,
  fictitiousGuardian,
  guardiansRegion,
  h1,
  lpEdit,
  lpForm,
  lpRegion,
  lpSave,
  navItem,
  profileStudent,
  shot,
  tagGroup,
  toastRegion,
  wide,
} from '../support/students'

// T-M2.17 (the learning profile on the Profile view) at the mandatory viewports: AC1, AC3, AC5 (two pages, both stale
// cases), AC6, AC8 (axe in vi and en, layout and break rules, the focus targets, keyboard-only, the F12 step log).
// Fictitious values only. Each test creates its own students (dev data, kept).

test.use({ storageState: TUTOR_STATE })

/** The read view's rows: [term, value]. */
const lpRows = (page: Page) =>
  lpRegion(page)
    .locator('dl > div')
    .evaluateAll((items) => items.map((i) => [i.querySelector('dt')!.textContent, i.querySelector('dd')!.textContent]))


/** Records the JSON bodies of the learning-profile saves. */
function profileWrites(page: Page) {
  const writes: unknown[] = []
  page.on('request', (r) => {
    if (r.method() === 'PUT' && /\/api\/v1\/tutor\/students\/[^/]+\/learning-profile$/.test(new URL(r.url()).pathname))
      writes.push(r.postDataJSON())
  })
  return writes
}

/** The heading row: the button under the `h2` below 768 px, at the end of the row from 768 px. */
async function expectHeadingRow(page: Page, heading: Locator, button: Locator) {
  const [h, b, row] = [await box(heading), await box(button), await box(heading.locator('..'))]
  if (wide(page)) {
    expect(Math.abs(b.y + b.height / 2 - (h.y + h.height / 2)), 'one row').toBeLessThanOrEqual(4)
    expect(Math.abs(b.x + b.width - (row.x + row.width)), 'at the end').toBeLessThanOrEqual(1)
  } else {
    expect(b.y, 'under the heading').toBeGreaterThanOrEqual(h.y + h.height - 1)
    expect(Math.abs(b.x - h.x), 'start-aligned').toBeLessThanOrEqual(1)
  }
}

const NOT_ADDED_ROWS = [
  ['Trình độ hiện tại', 'Chưa có'],
  ['Điểm mạnh', 'Chưa có'],
  ['Điểm yếu', 'Chưa có'],
  ['Ghi chú học tập', 'Chưa có'],
]

test.describe('Learning profile (T-M2.17)', () => {
  test('AC1/AC3/AC8: never saved: four rows "Not added"; F12 in ≤ 3 steps; layout; toast; unchanged Save and clean Cancel', async ({
    page,
  }, testInfo) => {
    const created = await profileStudent(page, 'Hồ Sơ Học Tập')
    const writes = profileWrites(page)
    await page.goto(`/tutor/students/${created.student.id}`)
    await expect(h1(page, created.student.fullName)).toBeVisible()
    const section = lpRegion(page)
    await expect(lpEdit(page)).toBeVisible()
    expect(await lpRows(page)).toEqual(NOT_ADDED_ROWS)
    await expectHeadingRow(page, section.getByRole('heading', { level: 2 }), lpEdit(page))
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'learning-profile-empty-vi')

    const steps = new StepCounter()
    const form = lpForm(page)
    const weaknesses = tagGroup(page, 'Điểm yếu')
    await steps.step('Edit learning profile', async () => {
      await lpEdit(page).click()
      await expect(form.getByRole('textbox', { name: 'Trình độ hiện tại' })).toBeFocused()
    })
    await expectFocusNotLost(page)
    await expectFieldsStacked(form)
    await expectActionRow(page, form.locator('[class*="stackedActions"]'))
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'learning-profile-form-vi')
    await steps.step('type a weakness and press Enter', async () => {
      await weaknesses.getByRole('textbox').fill('Phát âm âm cuối')
      await weaknesses.getByRole('textbox').press('Enter')
      await expect(weaknesses.getByRole('listitem')).toHaveText(['Phát âm âm cuối'])
    })
    // Committing a tag keeps focus in the (cleared) input.
    await expect(weaknesses.getByRole('textbox')).toBeFocused()
    await expect(weaknesses.getByRole('textbox')).toHaveValue('')
    await expectFocusNotLost(page)
    await steps.step('Save', async () => {
      await lpSave(page).click()
      await expect(lpEdit(page)).toBeFocused()
    })
    steps.expectAtMost(3)
    await evidenceRecord(testInfo, 'steps-f12', {
      flow: 'F12 Update a learning profile (ux-flows, budget ≤ 3 steps)',
      viewport: page.viewportSize(),
      steps: steps.count,
      named: steps.steps,
      budget: 3,
    })
    await expect(toastRegion(page).getByRole('status').filter({ hasText: 'Đã lưu hồ sơ học tập' })).toBeVisible()
    await expectFocusNotLost(page)
    expect(writes).toEqual([
      {
        version: null,
        currentLevel: null,
        strengths: [],
        weaknesses: ['Phát âm âm cuối'],
        learningNotes: null,
        customFields: [],
      },
    ])
    expect(await lpRows(page)).toEqual([
      NOT_ADDED_ROWS[0],
      NOT_ADDED_ROWS[1],
      ['Điểm yếu', 'Phát âm âm cuối'],
      NOT_ADDED_ROWS[3],
    ])

    // Save with only whitespace typed: no request, no toast, focus on Edit learning profile.
    await expect(toastRegion(page).getByRole('status')).toHaveCount(0, {
      timeout: 15_000,
    })
    await lpEdit(page).click()
    await form.getByRole('textbox', { name: 'Trình độ hiện tại' }).fill('   ')
    await lpSave(page).click()
    await expect(lpEdit(page)).toBeFocused()
    await expectFocusNotLost(page)
    expect(writes).toHaveLength(1)
    await expect(toastRegion(page).getByRole('status')).toHaveCount(0)
    // A clean Cancel: focus on Edit learning profile.
    await lpEdit(page).click()
    await form.getByRole('button', { name: 'Huỷ', exact: true }).click()
    await expect(lpEdit(page)).toBeFocused()
    await expectFocusNotLost(page)
  })

  test('AC1/AC2/AC8: 30 tags per list and 30 custom fields as text; the form at 30; the remove focus targets; discard', async ({
    page,
  }, testInfo) => {
    const tags = Array.from({ length: 30 }, (_, i) => `Kỹ năng ${i + 1}`)
    const fields = Array.from({ length: 30 }, (_, i) =>
      i === 0
        ? { label: 'Trang tham khảo', value: 'https://example.com' }
        : i === 1
          ? { label: 'Đánh dấu', value: '<b>x</b>' }
          : i === 2
            ? { label: 'Phong cách học', value: '' }
            : { label: `Mục thử ${i + 1}`, value: `Giá trị ${i + 1}` },
    )
    const created = await profileStudent(page, 'Ba Mươi Thẻ')
    await apiProfile(page, created.student.id, {
      currentLevel: 'B1',
      strengths: tags,
      weaknesses: tags,
      learningNotes: 'Dòng một\nDòng hai',
      customFields: fields,
    })
    await page.goto(`/tutor/students/${created.student.id}`)
    const section = lpRegion(page)
    await expect(section.getByRole('listitem')).toHaveCount(60)
    await expect(section.getByRole('list').first().getByRole('listitem')).toHaveText(tags)
    const rows = await lpRows(page)
    expect(rows).toHaveLength(34)
    expect(rows.slice(4, 7)).toEqual([
      ['Trang tham khảo', 'https://example.com'],
      ['Đánh dấu', '<b>x</b>'],
      ['Phong cách học', 'Chưa có'],
    ])
    await expect(section.getByRole('link')).toHaveCount(0)
    await expect(section.locator('b')).toHaveCount(0)
    expect(await lineCount(section.locator('[class*="note"]'))).toBe(2)
    // Chips wrap as whole chips: every chip inside the section's column.
    const sectionBox = await box(section)
    for (const chip of await section.getByRole('listitem').all()) {
      const b = await box(chip)
      expect(b.x + b.width, 'inside the column').toBeLessThanOrEqual(sectionBox.x + sectionBox.width + 1)
    }
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'learning-profile-filled-vi')

    await lpEdit(page).click()
    const form = lpForm(page)
    const custom = form.getByRole('group', { name: 'Mục tuỳ chỉnh' })
    await expect(custom.getByRole('group', { name: /^Mục \d+$/ })).toHaveCount(30)
    await expect(custom.getByRole('button', { name: 'Thêm mục' })).toHaveCount(0)
    await expect(custom.getByText('Tối đa 30 mục.')).toBeVisible()
    const strengths = tagGroup(page, 'Điểm mạnh')
    // At 30 tags the input stays enabled; a 31st is refused with its text kept.
    await strengths.getByRole('textbox').fill('Kỹ năng 31')
    await strengths.getByRole('textbox').press('Enter')
    await expect(strengths.getByText('Tối đa 30 thẻ.')).toBeVisible()
    await expect(strengths.getByRole('textbox')).toHaveValue('Kỹ năng 31')
    await expect(strengths.getByRole('textbox')).toBeEnabled()
    await strengths.getByRole('textbox').fill('')
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'learning-profile-form-30-vi')
    // Remove field 30 → Add field, shown again.
    await custom.getByRole('button', { name: 'Xoá mục 30' }).click()
    await expect(custom.getByRole('button', { name: 'Thêm mục' })).toBeFocused()
    await expectFocusNotLost(page)
    // A tag's remove button → the next chip's, else the previous one's (the same tags are in both lists).
    await strengths.getByRole('button', { name: 'Xoá Kỹ năng 1', exact: true }).click()
    await expect(strengths.getByRole('button', { name: 'Xoá Kỹ năng 2', exact: true })).toBeFocused()
    await expectFocusNotLost(page)
    const weaknesses = tagGroup(page, 'Điểm yếu')
    await weaknesses.getByRole('button', { name: 'Xoá Kỹ năng 30', exact: true }).click()
    await expect(weaknesses.getByRole('button', { name: 'Xoá Kỹ năng 29', exact: true })).toBeFocused()
    await expectFocusNotLost(page)
    await expect(weaknesses.getByRole('listitem')).toHaveCount(29)
    await expect(strengths.getByRole('listitem')).toHaveCount(29)
    // Cancel with changes asks; Discard → Edit learning profile; nothing changed.
    await form.getByRole('button', { name: 'Huỷ', exact: true }).click()
    const discard = page.getByRole('alertdialog', { name: 'Bỏ các thay đổi?' })
    await expect(discard).toContainText('Những thay đổi bạn vừa nhập cho hồ sơ học tập này sẽ mất.')
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'learning-profile-discard-vi')
    await discard.getByRole('button', { name: 'Bỏ thay đổi' }).click()
    await expect(lpEdit(page)).toBeFocused()
    await expectFocusNotLost(page)
    await expect(section.getByRole('listitem')).toHaveCount(60)
  })

  test('AC3/AC4/AC8: client errors focus the summary; a refused tag keeps its text; the last chip → the input; a 500 keeps the input', async ({
    page,
    consoleGuard,
  }, testInfo) => {
    const created = await profileStudent(page, 'Lỗi Hồ Sơ')
    await apiProfile(page, created.student.id, { strengths: ['Nghe'] })
    const writes = profileWrites(page)
    await page.goto(`/tutor/students/${created.student.id}`)
    await lpEdit(page).click()
    const form = lpForm(page)
    const level = form.getByRole('textbox', { name: 'Trình độ hiện tại' })
    await level.fill('x'.repeat(41))
    const strengths = tagGroup(page, 'Điểm mạnh')
    await strengths.getByRole('textbox').fill('NGHE')
    await strengths.getByRole('textbox').press('Enter')
    await expect(strengths.getByText('Đã thêm rồi.')).toBeVisible()
    await expect(strengths.getByRole('textbox')).toHaveValue('NGHE')
    const custom = form.getByRole('group', { name: 'Mục tuỳ chỉnh' })
    await custom.getByRole('button', { name: 'Thêm mục' }).click()
    const row = form.getByRole('group', { name: 'Mục 1' })
    await expect(row.getByRole('textbox', { name: 'Nhãn (bắt buộc)' })).toBeFocused()
    await row.getByRole('textbox', { name: 'Giá trị' }).fill('650')
    await lpSave(page).click()
    const summary = form.getByRole('alert').filter({ hasText: 'Chưa lưu được hồ sơ học tập' })
    await expect(summary).toBeFocused()
    await expect(summary.getByRole('link')).toHaveText(['Tối đa 40 ký tự.', 'Đã thêm rồi.', 'Hãy nhập nhãn.'])
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'learning-profile-errors-vi')
    expect(writes).toEqual([])

    await level.fill('B1')
    await strengths.getByRole('textbox').fill('')
    // The only chip's remove button → the input.
    await strengths.getByRole('button', { name: 'Xoá Nghe', exact: true }).click()
    await expect(strengths.getByRole('textbox')).toBeFocused()
    await expectFocusNotLost(page)
    await row.getByRole('textbox', { name: 'Nhãn (bắt buộc)' }).fill('Mục tiêu')
    let failing = true
    await page.route('**/api/v1/tutor/students/*/learning-profile', (route) =>
      failing && route.request().method() === 'PUT'
        ? route.fulfill({
            status: 500,
            contentType: 'application/problem+json',
            body: '{"status":500,"code":"INTERNAL_ERROR"}',
          })
        : route.fallback(),
    )
    await lpSave(page).click()
    await expect(form.getByText('Không lưu được hồ sơ học tập. Thông tin bạn nhập vẫn còn: hãy thử lại.')).toBeVisible()
    await expect(level).toHaveValue('B1')
    await expectFocusNotLost(page)
    failing = false
    await lpSave(page).click()
    await expect(lpEdit(page)).toBeFocused()
    expect(writes).toHaveLength(2)
    // The version the page loaded (the server's first save with values answers 1: it creates the row, then applies).
    expect(writes[1]).toEqual({
      version: expect.any(Number),
      currentLevel: 'B1',
      strengths: [],
      weaknesses: [],
      learningNotes: null,
      customFields: [{ label: 'Mục tiêu', value: '650' }],
    })
    acceptStatus(consoleGuard, 500, `/api/v1/tutor/students/${created.student.id}/learning-profile`)
  })

  test('AC10 (a): a mouse click on Save straight from a cleared Label of a row with a value: the summary; the fix clears while typing; one press saves', async ({
    page,
  }) => {
    const created = await profileStudent(page, 'Bấm Chuột Hồ Sơ')
    const writes = profileWrites(page)
    await page.goto(`/tutor/students/${created.student.id}`)
    await lpEdit(page).click()
    const form = lpForm(page)
    await form.getByRole('button', { name: 'Thêm mục' }).click()
    const row = form.getByRole('group', { name: 'Mục 1' })
    const label = row.getByRole('textbox', { name: 'Nhãn (bắt buộc)' })
    await row.getByRole('textbox', { name: 'Giá trị' }).fill('650')
    await label.fill('Mục tiêu')
    await label.fill('')
    await expect(label).toBeFocused()
    // A real pointer press (mouse down and up) on Save while focus is still in the Label (DEC-142).
    await lpSave(page).click()
    const summary = form.getByRole('alert').filter({ hasText: 'Chưa lưu được hồ sơ học tập' })
    await expect(summary).toBeVisible()
    await expect(summary).toBeFocused()
    await expect(label).toHaveAttribute('aria-invalid', 'true')
    await label.pressSequentially('Mục tiêu')
    await expect(label).not.toHaveAttribute('aria-invalid')
    await expect(row.getByText('Hãy nhập nhãn.')).toHaveCount(0)
    expect(writes).toEqual([])
    await lpSave(page).click()
    await expect(lpEdit(page)).toBeFocused()
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({ customFields: [{ label: 'Mục tiêu', value: '650' }] })
  })

  test('AC5: two pages: a first save after the other page created the profile, then an older version: the conflict dialog', async ({
    page,
    context,
    consoleGuard,
  }, testInfo) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const created = await profileStudent(page, 'Hai Tab Hồ Sơ')
    const url = `/tutor/students/${created.student.id}`
    await page.goto(url)
    await lpEdit(page).click()
    const other = await context.newPage()
    await other.goto(url)
    await lpEdit(other).click()
    await lpForm(other).getByRole('textbox', { name: 'Trình độ hiện tại' }).fill('B2')
    await lpSave(other).click()
    await expect(lpEdit(other)).toBeFocused()

    // This page still has version null: its first save meets the profile the other page created.
    const form = lpForm(page)
    const notes = form.getByRole('textbox', { name: 'Ghi chú học tập' })
    await notes.fill('Ghi chú của tab này')
    await lpSave(page).click()
    const dialog = page.getByRole('alertdialog', {
      name: 'Đã có thay đổi ở nơi khác',
    })
    await expect(dialog).toContainText('Hồ sơ học tập này vừa được thay đổi ở một tab hoặc cửa sổ khác.')
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'learning-profile-conflict-vi')
    await dialog.getByRole('button', { name: 'Sao chép ghi chú học tập của tôi' }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Ghi chú của tab này')
    await dialog.getByRole('button', { name: 'Huỷ' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(notes).toHaveValue('Ghi chú của tab này')
    await expectFocusNotLost(page)
    await expect(lpSave(page)).toBeFocused()
    await lpSave(page).click()
    await dialog.getByRole('button', { name: 'Tải lại' }).click()
    await expect(page.getByRole('form')).toHaveCount(0)
    await expect(lpEdit(page)).toBeFocused()
    await expectFocusNotLost(page)
    expect((await lpRows(page))[0]).toEqual(['Trình độ hiện tại', 'B2'])

    // An older version: this page opens version 0, the other page saves version 1 first.
    await lpEdit(page).click()
    await lpEdit(other).click()
    await lpForm(other).getByRole('textbox', { name: 'Trình độ hiện tại' }).fill('C1')
    await lpSave(other).click()
    await expect(lpEdit(other)).toBeFocused()
    await form.getByRole('textbox', { name: 'Trình độ hiện tại' }).fill('B2 nâng cao')
    await lpSave(page).click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: /^Sao chép/ })).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Tải lại' }).click()
    await expect(lpEdit(page)).toBeFocused()
    await expectFocusNotLost(page)
    expect((await lpRows(page))[0]).toEqual(['Trình độ hiện tại', 'C1'])
    acceptStatus(consoleGuard, 409, `/api/v1/tutor/students/${created.student.id}/learning-profile`)
  })

  test('AC6: one form at a time (hints); a form with only uncommitted tag text asks on navigation and on Cancel', async ({
    page,
  }) => {
    const created = await profileStudent(page, 'Một Biểu Mẫu Hồ Sơ', {
      guardians: [fictitiousGuardian(60, { name: 'Lý Thị Hư Cấu' })],
    })
    await page.goto(`/tutor/students/${created.student.id}`)
    const hint = 'Hãy lưu hoặc huỷ thay đổi trước.'
    await lpEdit(page).click()
    for (const name of ['Sửa hồ sơ', 'Thêm phụ huynh', 'Sửa Lý Thị Hư Cấu', 'Xoá Lý Thị Hư Cấu'])
      await expect(page.getByRole('button', { name, exact: true })).toBeDisabled()
    await expect(guardiansRegion(page).getByText(hint)).toBeVisible()
    await expect(accountRegion(page).getByText(hint)).toBeVisible()
    for (const button of await accountRegion(page).getByRole('button').all()) await expect(button).toBeDisabled()
    await expect(lpRegion(page).getByText(hint)).toHaveCount(0)

    await tagGroup(page, 'Điểm mạnh').getByRole('textbox').fill('Chưa thêm')
    await (await navItem(page, 'Hôm nay')).click()
    const discard = page.getByRole('alertdialog', { name: 'Bỏ các thay đổi?' })
    await expect(discard).toBeVisible()
    await discard.getByRole('button', { name: 'Tiếp tục sửa' }).click()
    await expect(discard).toHaveCount(0)
    await expect(page).toHaveURL(new RegExp(`/tutor/students/${created.student.id}$`))
    await expect(page.locator('[data-exiting]')).toHaveCount(0)
    await expectFocusNotLost(page)
    await lpForm(page).getByRole('button', { name: 'Huỷ', exact: true }).click()
    await discard.getByRole('button', { name: 'Bỏ thay đổi' }).click()
    await expect(lpEdit(page)).toBeFocused()
    await expect(page.getByRole('form')).toHaveCount(0)
    await expectFocusNotLost(page)

    // Another form open: Edit learning profile is disabled with the hint in its section.
    await page.getByRole('button', { name: 'Sửa hồ sơ', exact: true }).click()
    await expect(lpEdit(page)).toBeDisabled()
    await expect(lpRegion(page).getByText(hint)).toBeVisible()
    await page.getByRole('button', { name: 'Huỷ', exact: true }).click()
    await guardiansRegion(page).getByRole('button', { name: 'Thêm phụ huynh' }).click()
    await expect(lpEdit(page)).toBeDisabled()
    await expect(lpRegion(page).getByText(hint)).toBeVisible()
  })

  test('AC8: keyboard-only edit, tag add and remove, field add and remove, save (Tab, typing, Enter)', async ({
    page,
  }, testInfo) => {
    const created = await profileStudent(page, 'Bàn Phím Hồ Sơ')
    await page.goto(`/tutor/students/${created.student.id}`)
    await expect(h1(page, created.student.fullName)).toBeVisible()
    const tabTo = async (target: Locator, max = 120) => {
      for (let i = 0; i < max; i++) {
        if (await target.evaluate((el) => el === document.activeElement)) return
        await page.keyboard.press('Tab')
      }
      throw new Error('target never focused')
    }
    const log: string[] = []
    await tabTo(lpEdit(page))
    await page.keyboard.press('Enter')
    log.push('Enter on Edit learning profile')
    const form = lpForm(page)
    await expect(form.getByRole('textbox', { name: 'Trình độ hiện tại' })).toBeFocused()
    await page.keyboard.type('B1')
    log.push('type the level')
    const strengths = tagGroup(page, 'Điểm mạnh')
    await tabTo(strengths.getByRole('textbox'))
    await page.keyboard.type('Nghe')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Nói')
    await page.keyboard.press('Enter')
    log.push('type two strengths, Enter after each')
    await expect(strengths.getByRole('listitem')).toHaveText(['Nghe', 'Nói'])
    await page.keyboard.press('Shift+Tab')
    await expect(strengths.getByRole('button', { name: 'Xoá Nói', exact: true })).toBeFocused()
    await page.keyboard.press('Enter')
    log.push('Shift+Tab, Enter on Remove Nói')
    await expect(strengths.getByRole('button', { name: 'Xoá Nghe', exact: true })).toBeFocused()
    const add = form.getByRole('button', { name: 'Thêm mục' })
    await tabTo(add)
    await page.keyboard.press('Enter')
    log.push('Enter on Add field')
    await expect(
      form.getByRole('group', { name: 'Mục 1' }).getByRole('textbox', { name: 'Nhãn (bắt buộc)' }),
    ).toBeFocused()
    await page.keyboard.type('Mục tiêu')
    await page.keyboard.press('Tab')
    await page.keyboard.type('650')
    log.push('type the label, Tab, type the value')
    await tabTo(add)
    await page.keyboard.press('Enter')
    log.push('Enter on Add field')
    await tabTo(form.getByRole('button', { name: 'Xoá mục 2' }))
    await page.keyboard.press('Enter')
    log.push('Enter on Remove field 2')
    await expect(add).toBeFocused()
    await tabTo(lpSave(page))
    await page.keyboard.press('Enter')
    log.push('Enter on Save')
    await expect(lpEdit(page)).toBeFocused()
    expect(await lpRows(page)).toEqual([
      ['Trình độ hiện tại', 'B1'],
      ['Điểm mạnh', 'Nghe'],
      ['Điểm yếu', 'Chưa có'],
      ['Ghi chú học tập', 'Chưa có'],
      ['Mục tiêu', '650'],
    ])
    await evidenceRecord(testInfo, 'keyboard-learning-profile', {
      viewport: page.viewportSize(),
      actions: log,
    })
  })

  test('the learning-profile error: Try again (503 until the alert) focuses the section heading; the rest of the page works', async ({
    page,
    consoleGuard,
  }) => {
    const created = await profileStudent(page, 'Thử Lại Hồ Sơ')
    const recover = await failRequests(page, '**/api/v1/tutor/students/*/learning-profile')
    await page.goto(`/tutor/students/${created.student.id}`)
    const alert = lpRegion(page).getByRole('alert')
    await expect(alert).toContainText('Không tải được hồ sơ học tập.', {
      timeout: 15_000,
    })
    await expect(lpEdit(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Sửa hồ sơ', exact: true })).toBeEnabled()
    await expectSettledAccessible(page)
    recover()
    acceptStatus(consoleGuard, 503, `/api/v1/tutor/students/${created.student.id}/learning-profile`)
    await alert.getByRole('button', { name: 'Thử lại' }).click()
    await expect(lpEdit(page)).toBeVisible()
    await expectFocusNotLost(page)
    await expect(page.getByRole('heading', { level: 2, name: 'Hồ sơ học tập' })).toBeFocused()
  })
})

test.describe('English UI (T-M2.17 AC8)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('englms.locale', 'en'))
  })

  test('the Learning profile section (empty, 30 tags and fields), the form with errors, the discard and conflict dialogs', async ({
    page,
    context,
    consoleGuard,
  }, testInfo) => {
    const created = await profileStudent(page, 'English Profile')
    const url = `/tutor/students/${created.student.id}`
    await page.goto(url)
    const section = lpRegion(page)
    await expect(lpEdit(page)).toBeVisible()
    await expect(section.getByText('Not added')).toHaveCount(4)
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'learning-profile-empty-en')

    await lpEdit(page).click()
    const form = lpForm(page)
    await form.getByRole('textbox', { name: 'Current level' }).fill('x'.repeat(41))
    const strengths = tagGroup(page, 'Strengths')
    await strengths.getByRole('textbox').fill('Listening, listening')
    await strengths.getByRole('textbox').press('Enter')
    await expect(strengths.getByText('Already added.')).toBeVisible()
    await lpSave(page).click()
    const summary = form.getByRole('alert').filter({ hasText: "The learning profile wasn't saved" })
    await expect(summary).toBeFocused()
    await expect(summary.getByRole('link')).toHaveText(['Use at most 40 characters.', 'Already added.'])
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'learning-profile-errors-en')
    await form.getByRole('textbox', { name: 'Current level' }).fill('B1')
    await strengths.getByRole('textbox').fill('')
    await form.getByRole('textbox', { name: 'Learning notes' }).fill('Mine')
    await lpSave(page).click()
    await expect(lpEdit(page)).toBeFocused()
    await expect(toastRegion(page).getByRole('status').filter({ hasText: 'Learning profile saved' })).toBeVisible()

    await lpEdit(page).click()
    await tagGroup(page, 'Weaknesses').getByRole('textbox').fill('Grammar')
    await form.getByRole('button', { name: 'Cancel', exact: true }).click()
    const discard = page.getByRole('alertdialog', {
      name: 'Discard your changes?',
    })
    await expect(discard).toContainText('The changes you made to this learning profile will be lost.')
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'learning-profile-discard-en')
    await discard.getByRole('button', { name: 'Keep editing' }).click()
    await expect(discard).toHaveCount(0)

    // Another page saves first: the conflict dialog with Copy my learning notes.
    const other = await context.newPage()
    await other.goto(url)
    await lpEdit(other).click()
    await lpForm(other)
      .getByRole('textbox', { name: /^(Trình độ hiện tại|Current level)$/ })
      .fill('C1')
    await lpSave(other).click()
    await expect(lpEdit(other)).toBeFocused()
    await form.getByRole('textbox', { name: 'Learning notes' }).fill('Mine, changed')
    await lpSave(page).click()
    const dialog = page.getByRole('alertdialog', {
      name: 'This was changed elsewhere',
    })
    await expect(dialog).toContainText('Someone changed this learning profile in another tab or window.')
    await expect(dialog.getByRole('button', { name: 'Copy my learning notes' })).toBeVisible()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'learning-profile-conflict-en')
    await dialog.getByRole('button', { name: 'Reload' }).click()
    await expect(lpEdit(page)).toBeFocused()
    acceptStatus(consoleGuard, 409, `/api/v1/tutor/students/${created.student.id}/learning-profile`)

    // 30 tags per list and 30 custom fields.
    const full = await profileStudent(page, 'English Full Profile')
    await apiProfile(page, full.student.id, {
      strengths: Array.from({ length: 30 }, (_, i) => `Skill ${i + 1}`),
      weaknesses: Array.from({ length: 30 }, (_, i) => `Gap ${i + 1}`),
      customFields: Array.from({ length: 30 }, (_, i) => ({
        label: `Field label ${i + 1}`,
        value: `Value ${i + 1}`,
      })),
    })
    await page.goto(`/tutor/students/${full.student.id}`)
    await expect(section.getByRole('listitem')).toHaveCount(60)
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'learning-profile-filled-en')
  })
})
