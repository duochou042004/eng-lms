import type { Locator } from '@playwright/test'
import { TUTOR_STATE } from '../support/auth'
import { expectNoMidWordBreak, expectSettledAccessible } from '../support/checks'
import { expect, test } from '../support/fixtures'
import { apiProfile, lpEdit, lpForm, lpSave, profileStudent, shot, tagGroup } from '../support/students'

// T-M2.20 (M2 polish) at the mandatory viewports: AC1 (the notes limit in the locale's number format, vi and en, with
// the form's h3 summary, AC2) and AC8 (a pasted tag list refused for two reasons shows both). Fictitious values only.

test.use({ storageState: TUTOR_STATE })

/** Pastes `text` into `input` as a clipboard paste (the TagInput splits it). */
const pasteInto = (input: Locator, text: string) =>
  input.evaluate((el, pasted) => {
    const data = new DataTransfer()
    data.setData('text', pasted)
    el.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    )
  }, text)

test.describe('M2 polish (T-M2.20)', () => {
  for (const [locale, copy] of [
    [
      'vi',
      {
        notes: 'Ghi chú học tập',
        summary: 'Chưa lưu được hồ sơ học tập',
        limit: 'Tối đa 2.000 ký tự.',
      },
    ],
    [
      'en',
      {
        notes: 'Learning notes',
        summary: "The learning profile wasn't saved",
        limit: 'Use at most 2,000 characters.',
      },
    ],
  ] as const) {
    test(`AC1/AC2: a 2,001-character note shows the limit with grouped digits (${locale}) in an h3 summary`, async ({
      page,
    }, testInfo) => {
      if (locale === 'en') await page.addInitScript(() => localStorage.setItem('englms.locale', 'en'))
      const created = await profileStudent(page, 'Giới Hạn Ghi Chú')
      await page.goto(`/tutor/students/${created.student.id}`)
      await lpEdit(page).click()
      const form = lpForm(page)
      const notes = form.getByRole('textbox', { name: copy.notes })
      await notes.fill('x'.repeat(2001))
      await lpSave(page).click()
      const summary = form.getByRole('alert', { name: copy.summary })
      await expect(summary).toBeFocused()
      await expect(summary.getByRole('heading', { level: 3, name: copy.summary })).toBeVisible()
      await expect(summary.getByRole('link')).toHaveText([copy.limit])
      await expect(notes).toHaveAccessibleDescription(new RegExp(copy.limit.replace(/\./g, '\\.')))
      await expectSettledAccessible(page)
      await expectNoMidWordBreak(summary.getByRole('link'))
      await shot(page, testInfo, `t-m2-20-notes-limit-${locale}`)
    })
  }

  test('AC8: a pasted tag list refused for two reasons shows both messages; Save shows both in the summary (vi)', async ({
    page,
  }, testInfo) => {
    const created = await profileStudent(page, 'Thẻ Hai Lý Do')
    await page.goto(`/tutor/students/${created.student.id}`)
    await lpEdit(page).click()
    const strengths = tagGroup(page, 'Điểm mạnh')
    const input = strengths.getByRole('textbox')
    await pasteInto(input, 'Nghe, Đọc\nViết\tNGHE,  ,Bad\u0007x')
    await expect(strengths.getByRole('listitem')).toHaveText(['Nghe', 'Đọc', 'Viết'])
    await expect(input).toHaveValue('NGHE, Bad\u0007x')
    const both = 'Đã thêm rồi. Thẻ không được chứa ký tự điều khiển.'
    const error = strengths.getByText(both, { exact: true })
    await expect(error).toBeVisible()
    await expectNoMidWordBreak(error)
    await expectSettledAccessible(page)
    await shot(page, testInfo, 't-m2-20-tag-two-reasons-vi')
    await lpSave(page).click()
    const summary = lpForm(page).getByRole('alert', {
      name: 'Chưa lưu được hồ sơ học tập',
    })
    await expect(summary).toBeFocused()
    await expect(summary.getByRole('link')).toHaveText([both])
    await expect(input).toHaveValue('NGHE, Bad\u0007x')
    await expectSettledAccessible(page)
    await shot(page, testInfo, 't-m2-20-tag-two-reasons-summary-vi')
  })

  test('AC10: text filled in one input event (a comma inside), then Save: the field shows both reasons (vi)', async ({
    page,
  }, testInfo) => {
    const created = await profileStudent(page, 'Thẻ Điền Một Lần')
    await apiProfile(page, created.student.id, { strengths: ['Nghe'] })
    await page.goto(`/tutor/students/${created.student.id}`)
    await lpEdit(page).click()
    const strengths = tagGroup(page, 'Điểm mạnh')
    const input = strengths.getByRole('textbox')
    await input.fill('NGHE, Bad\u0007x')
    await expect(input).toHaveValue('NGHE, Bad\u0007x')
    await lpSave(page).click()
    const summary = lpForm(page).getByRole('alert', { name: 'Chưa lưu được hồ sơ học tập' })
    await expect(summary).toBeFocused()
    const both = 'Đã thêm rồi. Thẻ không được chứa ký tự điều khiển.'
    await expect(summary.getByRole('link')).toHaveText([both])
    const error = strengths.getByText(both, { exact: true })
    await expect(error).toBeVisible()
    await expectNoMidWordBreak(error)
    await expectSettledAccessible(page)
    await shot(page, testInfo, 't-m2-20-tag-fill-save-vi')
  })
})
