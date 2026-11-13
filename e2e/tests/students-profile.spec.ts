import type { Locator, Page } from '@playwright/test'
import { apiCall, TUTOR_STATE, TUTOR_USERNAME } from '../support/auth'
import { expectFocusNotLost, expectSettledAccessible } from '../support/checks'
import { evidenceRecord } from '../support/evidence'
import { expect, test } from '../support/fixtures'
import {
  acceptStatus,
  accountRegion,
  box,
  expectActionRow,
  expectToastPlacement,
  fullNameField,
  h1,
  navItem,
  profileStudent,
  shot,
  studentSession,
  toastRegion,
  trySignIn,
  usernameField,
  wide,
} from '../support/students'

// T-M2.14 (edit profile, conflict, status + Undo, reset password, toasts) at the mandatory viewports: AC1, AC3–AC7, AC9,
// AC10. Each test creates its own students (dev data, kept). Student sessions are fresh contexts (never the stored one).

test.use({ storageState: TUTOR_STATE })

/**
 * Records live-announcer entries that still point at a missing element one task after they were inserted (a
 * screen reader or axe would meet them; T-M2.14 CI role-img-alt). Returns a reader of the ids recorded.
 */
async function watchDanglingAnnouncements(page: Page) {
  await page.evaluate(() => {
    const seen: string[] = []
    ;(window as unknown as { __dangling: string[] }).__dangling = seen
    new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes) {
          if (!(node instanceof Element) || !node.closest('[data-live-announcer]')) continue
          const id = node.getAttribute('aria-labelledby')?.split(' ')[0]
          if (!id) continue
          setTimeout(() => {
            if (node.isConnected && !document.getElementById(id)) seen.push(id)
          }, 0)
        }
    }).observe(document.body, { childList: true, subtree: true })
  })
  return () => page.evaluate(() => (window as unknown as { __dangling: string[] }).__dangling)
}

test.describe('Edit profile (T-M2.14)', () => {
  test('AC1/AC10: Edit profile layout, errors, save of only the changed fields, toast, list; axe; the guard asks', async ({
    page,
  }, testInfo) => {
    const created = await profileStudent(page, 'Hồ Sơ Sửa')
    const t = created.student.username.split('-')[2]!
    const requests: Array<Record<string, unknown>> = []
    page.on('request', (r) => {
      if (r.method() === 'PATCH' && r.url().includes('/api/v1/tutor/students/')) requests.push(r.postDataJSON())
    })
    await page.goto(`/tutor/students/${created.student.id}`)
    await expect(h1(page, created.student.fullName)).toBeVisible()
    // The heading row: Edit profile under the heading below 768 px, at the end of the row at ≥ 768 px.
    const heading = page.getByRole('heading', { level: 2, name: 'Thông tin cá nhân' })
    const edit = page.getByRole('button', { name: 'Sửa hồ sơ', exact: true })
    const [h, e, row] = [await box(heading), await box(edit), await box(heading.locator('..'))]
    if (wide(page)) {
      expect(Math.abs(e.y + e.height / 2 - (h.y + h.height / 2)), 'one row').toBeLessThanOrEqual(4)
      expect(Math.abs(e.x + e.width - (row.x + row.width)), 'at the end').toBeLessThanOrEqual(1)
    } else {
      expect(e.y, 'under the heading').toBeGreaterThanOrEqual(h.y + h.height - 1)
      expect(Math.abs(e.x - h.x), 'start-aligned').toBeLessThanOrEqual(1)
    }
    await expectActionRow(page, accountRegion(page).locator('[class*="stackedActions"]'))
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'profile-view-vi')

    await edit.click()
    const form = page.getByRole('form', { name: 'Sửa hồ sơ' })
    await expect(form).toBeVisible()
    await expect(fullNameField(page)).toBeFocused()
    await expectFocusNotLost(page)
    await expect(accountRegion(page).getByText('Hãy lưu hoặc huỷ thay đổi trước.')).toBeVisible()
    // AC12 (e): "Other contacts" is an h4 no larger than the Contacts h3, with no inline padding.
    const sizes = await form.evaluate((el) => {
      const style = (selector: string) => getComputedStyle(el.querySelector(selector)!)
      return {
        h3: parseFloat(style('h3').fontSize),
        h4: parseFloat(style('h4').fontSize),
        padding: style('h4').paddingInlineStart + ' ' + style('h4').paddingInlineEnd,
        h4Left: el.querySelector('h4')!.getBoundingClientRect().left,
        h3Left: el.querySelector('h3')!.getBoundingClientRect().left,
      }
    })
    expect(sizes.h4).toBeLessThanOrEqual(sizes.h3)
    expect(sizes.padding).toBe('0px 0px')
    expect(Math.abs(sizes.h4Left - sizes.h3Left), 'start-aligned with the Contacts heading').toBeLessThanOrEqual(1)
    await expectActionRow(page, form.locator('[class*="stackedActions"]'))
    await shot(page, testInfo, 'edit-form-vi')
    // Client errors: the summary takes focus.
    await fullNameField(page).fill('')
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Chưa lưu được hồ sơ' })).toBeFocused()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'edit-errors-vi')
    expect(requests).toEqual([])

    // The guard: the shell nav asks; Keep editing stays.
    await (await navItem(page, 'Hôm nay')).click()
    const discard = page.getByRole('alertdialog', { name: 'Bỏ các thay đổi?' })
    await expect(discard).toBeVisible()
    await discard.getByRole('button', { name: 'Tiếp tục sửa' }).click()
    await expect(page).toHaveURL(new RegExp(`/tutor/students/${created.student.id}$`))
    // The dialog (and below 1024 px the drawer it was opened from) restores focus once it has closed: let that
    // happen before typing, or the keystrokes follow the restored focus.
    await expect(discard).toHaveCount(0)
    await expect(page.locator('[data-exiting]')).toHaveCount(0)
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await expectFocusNotLost(page)

    await fullNameField(page).fill(created.student.fullName)
    await expect(fullNameField(page)).toHaveValue(created.student.fullName)
    await form.getByRole('textbox', { name: 'Email' }).fill(`moi.${t}@example.com`)
    await form.getByRole('textbox', { name: 'Điện thoại' }).fill('')
    await form.getByRole('button', { name: 'Thêm liên hệ' }).click()
    const handle = form.getByRole('group').last()
    await handle.getByRole('textbox', { name: 'Tên kênh (bắt buộc)' }).fill('Zalo')
    await handle.getByRole('textbox', { name: 'Đường dẫn hoặc ID' }).fill('https://zalo.me/0901234567')
    const dangling = await watchDanglingAnnouncements(page)
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(edit).toBeFocused()
    // React Aria's (first) pending announcement of Save may arrive after the form closed: never left dangling.
    await page.waitForTimeout(600)
    expect(await dangling(), 'announcer entries pointing at a missing element').toEqual([])
    expect(requests).toEqual([
      {
        version: created.student.version,
        email: `moi.${t}@example.com`,
        phone: null,
        contactHandles: [{ label: 'Zalo', value: 'https://zalo.me/0901234567' }],
      },
    ])
    const contacts = page.getByRole('region', { name: 'Liên hệ', exact: true })
    await expect(contacts.getByRole('link', { name: `Gửi email tới moi.${t}@example.com` })).toBeVisible()
    const saved = toastRegion(page).getByRole('status').filter({ hasText: 'Đã lưu hồ sơ' })
    await expect(saved).toBeVisible()
    await expectFocusNotLost(page)
    await expectToastPlacement(page)
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'profile-saved-toast-vi')
    // A toast without an action closes by itself (5 s, interaction-states §4).
    await expect(toastRegion(page)).toBeHidden({ timeout: 15_000 })

    // The list shows the new email.
    await page.goto(`/tutor/students?q=${encodeURIComponent(`moi.${t}`)}`)
    await expect(page.getByRole('link', { name: created.student.fullName })).toBeVisible()
    await expect(page.getByRole('main')).toContainText(`moi.${t}@`)
  })

  test('AC3: a username change; the student signs in with it and a session open before still works', async ({
    page,
    browser,
  }, testInfo) => {
    const created = await profileStudent(page, 'Đổi Tên Đăng Nhập')
    const student = await studentSession(browser, created)
    await page.goto(`/tutor/students/${created.student.id}`)
    await expect(h1(page, created.student.fullName)).toBeVisible()
    await page.getByRole('button', { name: 'Sửa hồ sơ', exact: true }).click()
    const username = usernameField(page)
    await expect(page.getByText('Học viên đăng nhập bằng tên đăng nhập mới.', { exact: false })).toBeVisible()
    // Another student's username: Taken; the student's own: nothing.
    await username.fill(TUTOR_USERNAME)
    await expect(page.getByText('Đã có người dùng')).toBeVisible()
    await username.fill(created.student.username)
    await expect(page.getByText('Đã có người dùng')).toHaveCount(0)
    await expect(page.getByText('Có thể dùng')).toHaveCount(0)
    const next = `${created.student.username}-n`.slice(0, 40)
    await username.fill(next)
    await expect(page.getByText('Có thể dùng')).toBeVisible()
    await shot(page, testInfo, 'edit-username-vi')
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 }).locator('..')).toContainText(`@${next}`)
    // The open session still answers; the new username signs in with the same password.
    const session = await apiCall<{ username: string }>(student.page, 'GET', '/api/v1/auth/session')
    expect(session.status).toBe(200)
    expect(session.body.username).toBe(next)
    expect(await trySignIn(browser, { username: next, password: student.credentials.password })).toBe(200)
    await student.context.close()
  })

  test('AC4: another tab saved first: Save shows "This was changed elsewhere"; Copy my note, Cancel, Reload; a stale status too', async ({
    page,
    context,
    consoleGuard,
  }, testInfo) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const created = await profileStudent(page, 'Hai Tab')
    const url = `/tutor/students/${created.student.id}`
    await page.goto(url)
    await page.getByRole('button', { name: 'Sửa hồ sơ', exact: true }).click()
    const other = await context.newPage()
    await other.goto(url)
    await other.getByRole('button', { name: 'Sửa hồ sơ', exact: true }).click()
    await other.getByRole('textbox', { name: 'Email' }).fill('tab.khac@example.com')
    await other.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(other.getByRole('button', { name: 'Sửa hồ sơ', exact: true })).toBeFocused()

    await page.getByRole('textbox', { name: 'Ghi chú' }).fill('Ghi chú của tab này')
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    const dialog = page.getByRole('alertdialog', { name: 'Đã có thay đổi ở nơi khác' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Huỷ' })).toBeFocused()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'conflict-dialog-vi')
    await dialog.getByRole('button', { name: 'Sao chép ghi chú của tôi' }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Ghi chú của tab này')
    await dialog.getByRole('button', { name: 'Huỷ' }).click()
    await expect(page.getByRole('textbox', { name: 'Ghi chú' })).toHaveValue('Ghi chú của tab này')
    await expect(dialog).toHaveCount(0)
    await expectFocusNotLost(page)
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await dialog.getByRole('button', { name: 'Tải lại' }).click()
    await expect(page.getByRole('form')).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Liên hệ', exact: true })).toContainText('tab.khac@example.com')
    await expectFocusNotLost(page)

    // A status button with a stale version: the same dialog.
    await other.reload()
    await accountRegion(other).getByRole('button', { name: 'Tạm nghỉ' }).click()
    await expect(accountRegion(other)).toContainText('Tạm nghỉ')
    await accountRegion(page).getByRole('button', { name: 'Lưu trữ' }).click()
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Tải lại' }).click()
    await expect(accountRegion(page).getByRole('button', { name: 'Tiếp tục học' })).toBeVisible()
    await expect(dialog).toHaveCount(0)
    await expectFocusNotLost(page)
    acceptStatus(consoleGuard, 409, new RegExp(`^/api/v1/tutor/students/${created.student.id}(/status)?$`))
  })

  test('AC10: keyboard-only edit (Tab, typing, Enter)', async ({ page }, testInfo) => {
    const created = await profileStudent(page, 'Bàn Phím Sửa')
    await page.goto(`/tutor/students/${created.student.id}`)
    await expect(h1(page, created.student.fullName)).toBeVisible()
    const tabTo = async (target: Locator, max = 60) => {
      for (let i = 0; i < max; i++) {
        if (await target.evaluate((el) => el === document.activeElement)) return
        await page.keyboard.press('Tab')
      }
      throw new Error('target never focused')
    }
    const log: string[] = []
    await tabTo(page.getByRole('button', { name: 'Sửa hồ sơ', exact: true }))
    await page.keyboard.press('Enter')
    log.push('Enter on Edit profile')
    await expect(fullNameField(page)).toBeFocused()
    await tabTo(page.getByRole('textbox', { name: 'Ghi chú' }))
    await page.keyboard.type('Gõ bằng bàn phím')
    log.push('type a note')
    await tabTo(page.getByRole('button', { name: 'Lưu', exact: true }))
    await page.keyboard.press('Enter')
    log.push('Enter on Save')
    await expect(page.getByRole('button', { name: 'Sửa hồ sơ', exact: true })).toBeFocused()
    await expect(page.getByRole('region', { name: 'Ghi chú' })).toContainText('Gõ bằng bàn phím')
    await evidenceRecord(testInfo, 'keyboard-edit', { viewport: page.viewportSize(), actions: log })
  })
})
