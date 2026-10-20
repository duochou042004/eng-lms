import { randomBytes } from 'node:crypto'
import type { Browser, Locator, Page, TestInfo } from '@playwright/test'
import {
  ANONYMOUS,
  apiCall,
  apiChangePassword,
  apiSignIn,
  signInWithForm,
  TUTOR_STATE,
  TUTOR_USERNAME,
  tutorPassword,
} from '../support/auth'
import {
  expectFocusNotLost,
  expectNoAxeViolations,
  expectNoHorizontalScroll,
  expectNoMidWordBreak,
  expectSettledAccessible,
  lineCount,
} from '../support/checks'
import { evidenceRecord, evidenceShot } from '../support/evidence'
import { expect, test } from '../support/fixtures'
import { longData } from '../support/longData'
import { openAccountSection } from '../support/shell'
import { StepCounter } from '../support/steps'

// T-M2.5 (Students list, Add student F2 + the credentials card, the workspace page) at the mandatory viewports:
// AC2/AC3 (list, URL, responsive), AC5 (suggestion, create with contact and note), AC6 (409, summary, guard), AC7 (card,
// hygiene), AC8 (workspace, contact links, not-found), AC9 (the F2 step log; wall time reported, not asserted, DEC-093),
// AC10 (axe in vi and en, keyboard-only F2). Students are created with unique names through the UI and the API (dev
// data, kept); the stored tutor session is never logged out (the sign-out case uses a fresh sign-in). T-M2.14's tests follow
// at the end of the file.

test.use({ storageState: TUTOR_STATE })

const h1 = (page: Page, name: string | RegExp) => page.getByRole('heading', { level: 1, name })
// The temporary password is masked in every evidence screenshot (a working credential of the dev database).
const shot = (page: Page, testInfo: TestInfo, name: string) =>
  evidenceShot(page, testInfo, name, 'impl', [page.locator('[class*="secret"]')])
const token = () => randomBytes(3).toString('hex')

interface Created {
  student: { id: string; username: string; fullName: string; version: number }
  credentials: { username: string; temporaryPassword: string }
}

/** A student created through the API (the tutor's session on `page`). */
async function apiStudent(page: Page, body: Record<string, unknown>) {
  const created = await apiCall<Created>(page, 'POST', '/api/v1/tutor/students', body)
  expect(created.status, `create ${JSON.stringify(body)}`).toBe(201)
  return created.body
}

/** Removes the console entries of a response a test provokes on purpose (only that status from that API path). */
function acceptStatus(consoleGuard: string[], status: number, path: string | RegExp) {
  const prefix = `console.error: Failed to load resource: the server responded with a status of ${status} `
  for (let i = consoleGuard.length - 1; i >= 0; i--) {
    const entry = consoleGuard[i]!
    const url = /\[([^\]]+)\]$/.exec(entry)?.[1]
    const pathname = url ? new URL(url).pathname : ''
    if (entry.startsWith(prefix) && (typeof path === 'string' ? pathname === path : path.test(pathname)))
      consoleGuard.splice(i, 1)
  }
}

const wide = (page: Page) => page.viewportSize()!.width >= 768

/** The tutor navigation's Students item: the sidebar at ≥ 1024 px, else in the drawer (opened first). */
async function navItem(page: Page, name: string): Promise<Locator> {
  if (page.viewportSize()!.width < 1024) await openAccountSection(page, 'tutor')
  return page.getByRole('navigation', { name: 'Điều hướng gia sư' }).getByRole('link', { name })
}

const fullNameField = (page: Page) => page.getByRole('textbox', { name: 'Họ tên (bắt buộc)' })
const usernameField = (page: Page) => page.getByRole('textbox', { name: 'Tên đăng nhập (bắt buộc)' })

test.describe('Add student (F2) and the credentials card', () => {
  test('AC9/AC7/AC5: F2 from the Students list in ≤ 6 steps; the card; Back shows an empty form; nothing stored', async ({
    page,
    context,
  }, testInfo) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const project = testInfo.project.name
    const name = `Nguyễn Văn F2 ${project} ${token()}`
    await page.goto('/tutor/students')
    await expect(h1(page, 'Học viên')).toBeVisible()
    await expect(page.getByRole('table').or(page.getByRole('list', { name: 'Học viên' }))).toBeVisible()

    const steps = new StepCounter()
    const started = Date.now()
    await steps.step('Students → Add student', async () => {
      await page.getByRole('main').getByRole('link', { name: 'Thêm học viên' }).first().click()
      await expect(h1(page, 'Thêm học viên')).toBeFocused()
    })
    await steps.step('Full name (the username is suggested and available)', async () => {
      await fullNameField(page).fill(name)
      await expect(usernameField(page)).toHaveValue(/^nguyenvanf2/)
      await expect(page.getByText('Có thể dùng')).toBeVisible()
    })
    await shot(page, testInfo, 'add-suggestion-vi')
    await steps.step('expand Contact → phone (ux-flows F2 [3])', async () => {
      await page.getByRole('button', { name: 'Liên hệ (không bắt buộc)' }).click()
      await page.getByRole('textbox', { name: 'Điện thoại' }).fill('0901 234 567')
    })
    const username = await usernameField(page).inputValue()
    await steps.step('Create', async () => {
      await page.getByRole('button', { name: 'Tạo', exact: true }).click()
      await expect(page.getByRole('heading', { level: 2, name: 'Đã tạo học viên' })).toBeFocused()
    })
    const card = page.locator('section', { has: page.getByRole('heading', { name: 'Đã tạo học viên' }) })
    const password = (await card.locator('dd span[class*="secret"]').textContent())!.trim()
    expect(password.length).toBeGreaterThanOrEqual(14)
    await expect(card).toContainText(username)
    await expect(card).toContainText(new URL('/login', page.url()).href)
    await expect(card).toContainText('Mật khẩu này chỉ hiện một lần.')
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'credentials-card-vi')
    const copyPassword = card.getByRole('button', { name: 'Sao chép mật khẩu' })
    // Position within the card (the page may scroll to the clicked button).
    const place = () =>
      copyPassword.evaluate((el) => {
        const own = el.getBoundingClientRect()
        const box = el.closest('section')!.getBoundingClientRect()
        return { x: own.left - box.left, y: own.top - box.top, width: own.width, height: own.height }
      })
    const before = await place()
    await steps.step('Copy message', async () => {
      await card.getByRole('button', { name: 'Sao chép tin nhắn' }).click()
      await expect(card.getByRole('status').filter({ hasText: 'Đã sao chép' })).toHaveCount(1)
    })
    // "Copied" is announced without moving anything (AC12 (g)).
    expect(await place()).toEqual(before)
    const message = await page.evaluate(() => navigator.clipboard.readText())
    for (const value of [username, password, new URL('/login', page.url()).href]) expect(message).toContain(value)
    // A neutral greeting, no name; the expiry as "10:25, 23/10/2026" (AC12 (f)).
    expect(message.split('\n')[0]).toBe('Xin chào,')
    expect(message).not.toContain(name)
    expect(message).toMatch(/hết hạn lúc \d\d:\d\d, \d\d\/\d\d\/\d{4}\./)
    expect(message).toContain('tự đặt mật khẩu mới ở lần đăng nhập đầu tiên')
    await steps.step('Open workspace', async () => {
      await card.getByRole('link', { name: 'Mở không gian học viên' }).click()
      await expect(h1(page, name)).toBeVisible()
    })
    const wallSeconds = (Date.now() - started) / 1000
    steps.expectAtMost(6)
    await expect(
      page.getByRole('navigation', { name: 'Liên hệ học viên' }).getByRole('link', { name: 'Gọi 0901 234 567' }),
    ).toHaveAttribute('href', 'tel:0901234567')
    await evidenceRecord(testInfo, 'steps-f2', {
      flow: 'F2 Add student (ux-flows, budget ≤ 6 steps, ≤ 90 s reported)',
      viewport: page.viewportSize(),
      steps: steps.count,
      named: steps.steps,
      budget: 6,
      wallSeconds: Number(wallSeconds.toFixed(1)),
      note: 'Wall time includes Playwright waits for the suggestion, availability and focus assertions; not asserted (DEC-093).',
    })

    // Back: the address of the form shows an empty form; the password is nowhere in storage, history or the URL.
    await page.goBack()
    await expect(h1(page, 'Thêm học viên')).toBeVisible()
    await expect(fullNameField(page)).toHaveValue('')
    await expect(page.getByText(password)).toHaveCount(0)
    const kept = await page.evaluate(() =>
      JSON.stringify([{ ...localStorage }, { ...sessionStorage }, history.state, location.href]),
    )
    expect(kept).not.toContain(password)
  })

  test('AC5/AC8: Contact (email, phone, two handles) and a Note are sent and shown on the workspace page', async ({
    page,
  }, testInfo) => {
    const t = token()
    const name = `Trần Thị Liên Hệ ${testInfo.project.name} ${t}`
    await page.goto('/tutor/students/new')
    await expect(h1(page, 'Thêm học viên')).toBeVisible()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'add-empty-vi')
    await fullNameField(page).fill(name)
    await expect(usernameField(page)).toHaveValue(/^tranthilienhe/)
    await page.getByRole('button', { name: 'Liên hệ (không bắt buộc)' }).click()
    await page.getByRole('textbox', { name: 'Email' }).fill(`lienhe.${t}@example.com`)
    await page.getByRole('textbox', { name: 'Điện thoại' }).fill('+84 90 123 4567')
    for (const [label, value] of [
      ['Zalo', 'https://zalo.me/0901234567'],
      ['Facebook', `lien.he.${t}`],
    ]) {
      await page.getByRole('button', { name: 'Thêm liên hệ' }).click()
      const row = page.getByRole('group').last()
      await row.getByRole('textbox', { name: 'Tên kênh (bắt buộc)' }).fill(label!)
      await row.getByRole('textbox', { name: 'Đường dẫn hoặc ID' }).fill(value!)
    }
    await page.getByRole('button', { name: 'Ghi chú (không bắt buộc)' }).click()
    await page.getByRole('textbox', { name: 'Ghi chú' }).fill('Thích luyện nói.\nHọc tối thứ Ba.')
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'add-filled-vi')
    await page.getByRole('button', { name: 'Tạo', exact: true }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Đã tạo học viên' })).toBeFocused()
    await page.getByRole('link', { name: 'Mở không gian học viên' }).click()
    await expect(h1(page, name)).toBeVisible()

    const contacts = page.getByRole('region', { name: 'Liên hệ', exact: true })
    await expect(contacts.getByRole('link', { name: `Gửi email tới lienhe.${t}@example.com` })).toHaveAttribute(
      'href',
      `mailto:lienhe.${t}@example.com`,
    )
    await expect(contacts.getByRole('link', { name: 'Gọi +84 90 123 4567' })).toHaveAttribute(
      'href',
      'tel:+84901234567',
    )
    const zalo = contacts.getByRole('link', { name: 'Mở liên kết Zalo https://zalo.me/0901234567' })
    await expect(zalo).toHaveAttribute('target', '_blank')
    await expect(zalo).toHaveAttribute('rel', 'noopener noreferrer')
    await expect(contacts.getByText(`lien.he.${t}`)).toBeVisible()
    await expect(contacts.getByRole('button', { name: 'Sao chép Facebook' })).toBeVisible()
    const note = page.getByRole('region', { name: 'Ghi chú' }).locator('p')
    await expect(note).toHaveText('Thích luyện nói.\nHọc tối thứ Ba.')
    // Two lines: the line break is kept (white-space: pre-wrap).
    expect(await note.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe('pre-wrap')
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'workspace-vi')
  })

  test('AC6: a username taken in another tab (409) shows on Username with focus; client errors focus the summary', async ({
    page,
    consoleGuard,
  }, testInfo) => {
    const t = token()
    await page.goto('/tutor/students/new')
    await expect(h1(page, 'Thêm học viên')).toBeVisible()
    // Client checks: the summary takes focus.
    await page.getByRole('button', { name: 'Tạo', exact: true }).click()
    const summary = page.getByRole('alert').filter({ hasText: 'Chưa tạo được học viên' })
    await expect(summary).toBeFocused()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'add-errors-vi')

    const username = `e2e-taken-${t}`
    await fullNameField(page).fill(`Học Viên Trùng ${t}`)
    await usernameField(page).fill(username)
    await expect(page.getByText('Có thể dùng')).toBeVisible()
    // Another tab takes the username between the check and Create.
    await apiStudent(page, { fullName: `Tab khác ${t}`, username })
    await page.getByRole('button', { name: 'Tạo', exact: true }).click()
    await expect(usernameField(page)).toBeFocused()
    await expect(usernameField(page)).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Tên đăng nhập này đã có người dùng. Hãy chọn tên khác.')).toBeVisible()
    acceptStatus(consoleGuard, 409, '/api/v1/tutor/students')
    // The availability check now says Taken for that username.
    await usernameField(page).fill(`${username}x`)
    await usernameField(page).fill(username)
    await expect(page.getByText('Đã có người dùng')).toBeVisible()
    await expectSettledAccessible(page)
  })

  test('AC6: leaving a dirty form asks (navigation, home link); a clean or created form leaves; sign-out never asks', async ({
    page,
    browser,
  }, testInfo) => {
    await page.goto('/tutor/students/new')
    await expect(h1(page, 'Thêm học viên')).toBeVisible()
    await fullNameField(page).fill('Chưa lưu')
    await (await navItem(page, 'Hôm nay')).click()
    const dialog = page.getByRole('alertdialog', { name: 'Bỏ học viên này?' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Tiếp tục nhập' })).toBeFocused()
    await expectNoAxeViolations(page)
    await shot(page, testInfo, 'add-discard-dialog-vi')
    await dialog.getByRole('button', { name: 'Tiếp tục nhập' }).click()
    await expect(page).toHaveURL(/\/tutor\/students\/new$/)
    await expect(fullNameField(page)).toHaveValue('Chưa lưu')
    await expect(dialog).toHaveCount(0)
    await expectFocusNotLost(page)
    await page.getByRole('banner').getByRole('link').first().click() // the workspace name: the home link
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Bỏ', exact: true }).click()
    await expect(page).toHaveURL(/\/tutor\/today$/)
    await expectFocusNotLost(page)

    // A clean form leaves without asking.
    await page.goto('/tutor/students/new')
    await page.getByRole('link', { name: 'Huỷ' }).click()
    await expect(h1(page, 'Học viên')).toBeVisible()

    // A fresh sign-in (the stored session stays): Log out from a dirty form lands on /login without a dialog.
    const fresh = await browser.newContext({ storageState: ANONYMOUS })
    const other = await fresh.newPage()
    await other.goto('/login')
    expect((await apiSignIn(other, { username: TUTOR_USERNAME, password: tutorPassword() })).status).toBe(200)
    await other.goto('/tutor/students/new')
    await fullNameField(other).fill('Chưa lưu')
    const account = await openAccountSection(other, 'tutor')
    await account.getByRole('button', { name: 'Đăng xuất' }).click()
    await expect(other).toHaveURL(/\/login$/)
    await expect(other.getByRole('alertdialog')).toHaveCount(0)
    await fresh.close()
  })

  test('AC7: a refused clipboard shows the manual-copy text; the password stays selectable', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new DOMException('refused', 'NotAllowedError')) },
      })
    })
    await page.goto('/tutor/students/new')
    await fullNameField(page).fill(`Không Sao Chép ${token()}`)
    await expect(usernameField(page)).not.toHaveValue('')
    await page.getByRole('button', { name: 'Tạo', exact: true }).click()
    const card = page.locator('section', { has: page.getByRole('heading', { name: 'Đã tạo học viên' }) })
    await card.getByRole('button', { name: 'Sao chép mật khẩu' }).click()
    await expect(card.getByText('Không sao chép được. Hãy chọn đoạn chữ rồi tự sao chép.')).toBeVisible()
    expect(await card.locator('dd span[class*="secret"]').evaluate((el) => getComputedStyle(el).userSelect)).toBe('all')
  })

  test('AC10: keyboard-only F2 (Tab and Enter only)', async ({ page }, testInfo) => {
    const name = `Bàn Phím ${testInfo.project.name} ${token()}`
    await page.goto('/tutor/students')
    await expect(h1(page, 'Học viên')).toBeVisible()
    const log: string[] = []
    const tabTo = async (target: Locator, max = 40) => {
      for (let i = 0; i < max; i++) {
        if (await target.evaluate((el) => el === document.activeElement)) return
        await page.keyboard.press('Tab')
      }
      throw new Error('target never focused')
    }
    await tabTo(page.getByRole('main').getByRole('link', { name: 'Thêm học viên' }).first())
    await page.keyboard.press('Enter')
    log.push('Enter on Add student')
    await expect(h1(page, 'Thêm học viên')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(fullNameField(page)).toBeFocused()
    await page.keyboard.type(name)
    log.push('type the name')
    await expect(page.getByText('Có thể dùng')).toBeVisible()
    await tabTo(page.getByRole('button', { name: 'Tạo', exact: true }))
    await page.keyboard.press('Enter')
    log.push('Enter on Create')
    const cardHeading = page.getByRole('heading', { level: 2, name: 'Đã tạo học viên' })
    await expect(cardHeading).toBeFocused()
    await tabTo(page.getByRole('link', { name: 'Mở không gian học viên' }))
    await page.keyboard.press('Enter')
    log.push('Enter on Open workspace')
    await expect(h1(page, name)).toBeFocused()
    await evidenceRecord(testInfo, 'keyboard-f2', { viewport: page.viewportSize(), actions: log })
  })
})

test.describe('Students list', () => {
  /** 26 students under a per-project prefix: reused across runs (only the missing ones are created). */
  async function pagingSet(page: Page, project: string) {
    const prefix = `E2E Paging ${project}`
    const found = await apiCall<{ totalItems: number; items: Array<{ fullName: string }> }>(
      page,
      'GET',
      `/api/v1/tutor/students?q=${encodeURIComponent(prefix)}&size=100`,
    )
    const have = new Set(found.body.items.map((s) => s.fullName))
    for (let n = 1; n <= 26; n++) {
      const fullName = `${prefix} ${String(n).padStart(2, '0')}`
      if (!have.has(fullName)) await apiStudent(page, { fullName, username: `e2e-pg-${project}-${n}-${token()}` })
    }
    return prefix
  }

  test('AC2/AC3/AC4/AC10: search (diacritics), Include archived, Newest, paging, URL with Back and reload, fallbacks, layout', async ({
    page,
  }, testInfo) => {
    const project = testInfo.project.name
    const t = token()
    await page.goto('/tutor/students')
    await expect(h1(page, 'Học viên')).toBeVisible()
    const nav = await navItem(page, 'Học viên')
    await expect(nav).toHaveAttribute('aria-current', 'page')
    if (page.viewportSize()!.width < 1024) await page.keyboard.press('Escape')
    const prefix = await pagingSet(page, project)
    const diacritic = await apiStudent(page, { fullName: `Nguyễn Thị Dấu ${t}`, username: `e2e-dau-${t}` })
    const archived = await apiStudent(page, { fullName: `Lưu Trữ ${t}`, username: `e2e-arch-${t}` })
    const status = await apiCall(page, 'POST', `/api/v1/tutor/students/${archived.student.id}/status`, {
      status: 'ARCHIVED',
      version: archived.student.version,
    })
    expect(status.status).toBe(200)
    const longName = `Nguyễn Thị Phương Lan Anh Hoàng Bảo Ngọc Trâm Khuê Diệp ${t}`
    await apiStudent(page, {
      fullName: longName,
      // 40 characters, the longest username: it may wrap, fully visible, never a horizontal scroll (AC3, AC12 (p)).
      username: `e2e-long-${t}-`.padEnd(40, 'x'),
      phone: '+84 90 123 4567',
      email: `nguyen.thi.phuong.lan.anh.hoang.bao.ngoc.${t}@example.com`,
    })
    // A three-word Vietnamese name, a 20-character username and a 20-character email (AC12 (q)).
    const twenty = `e2e-twenty-ab-${t}`
    const threeWords = `Phạm Ngọc ${t}`
    const email20 = `h.${t}@example.com`
    expect(twenty).toHaveLength(20)
    expect(email20).toHaveLength(20)
    await apiStudent(page, { fullName: threeWords, username: twenty, phone: '0901 234 567', email: email20 })
    // QA-R3-1: a long email on the same page must not squeeze the name column or break short values (AC12 (s)).
    const longEmail = `nguyen.thi.phuong.lan.anh.hoang.${t}@subdomain.example-long.com`
    const dotted = `nguyenvanan.${t}`
    await apiStudent(page, { fullName: `Nguyễn Văn An ${t}`, username: dotted, email: longEmail })
    await page.reload()
    await expect(h1(page, 'Học viên')).toBeVisible()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'list-populated-vi')

    const box = page.getByRole('searchbox', { name: 'Tìm kiếm' })
    // Accent-insensitive server search.
    await box.fill(`nguyen thi dau ${t}`)
    await expect(page.getByRole('link', { name: diacritic.student.fullName })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`\\?q=nguyen\\+thi\\+dau\\+${t}$`))
    await expect(box).toBeFocused()

    // Archived only with Include archived (filtered empty first).
    await box.fill(`luu tru ${t}`)
    await expect(
      page.getByRole('heading', { level: 2, name: `Không có học viên nào khớp với “luu tru ${t}”` }),
    ).toBeVisible()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'list-filtered-empty-vi')
    await page.getByText('Gồm cả học viên đã lưu trữ').click()
    await expect(page.getByRole('link', { name: `Lưu Trữ ${t}` })).toBeVisible()
    await expect(page.getByText('Đã lưu trữ', { exact: true })).toBeVisible()
    await expect(page).toHaveURL(/archived=1/)

    // Paging through 26 under the prefix, 1-based page in the URL; Back and reload restore it.
    await page.goto(`/tutor/students?q=${encodeURIComponent(prefix)}`)
    await expect(page.getByRole('link', { name: `${prefix} 01` })).toBeVisible()
    const pages = page.getByRole('navigation', { name: 'Phân trang' })
    await expect(pages).toContainText('Trang 1 / 2')
    // Previous at the start, Next at the end on one row, the position between (AC12 (c)).
    const pager = await pages.evaluate((nav) => {
      const box = (el: Element) => el.getBoundingClientRect()
      const [prev, number, next] = [...nav.children].map(box)
      return { nav: box(nav), prev: prev!, number: number!, next: next! }
    })
    expect(Math.abs(pager.prev.left - pager.nav.left)).toBeLessThanOrEqual(1)
    expect(Math.abs(pager.next.right - pager.nav.right)).toBeLessThanOrEqual(1)
    expect(Math.abs(pager.prev.top - pager.next.top)).toBeLessThanOrEqual(1)
    expect(pager.number.left).toBeGreaterThanOrEqual(pager.prev.right)
    expect(pager.number.right).toBeLessThanOrEqual(pager.next.left)
    await shot(page, testInfo, 'list-pager-vi')
    await pages.getByRole('button', { name: 'Trang sau' }).click()
    await expect(page.getByRole('link', { name: `${prefix} 26` })).toBeVisible()
    await expect(page).toHaveURL(/page=2/)
    // Next is disabled on the last page: focus moved to Previous, not the body; the page is announced (AC12 (a), (b)).
    await expect(pages.getByRole('button', { name: 'Trang trước' })).toBeFocused()
    await expect(pages.getByRole('status')).toHaveText('Trang 2 / 2')
    await expectFocusNotLost(page)
    await page.reload()
    await expect(page.getByRole('link', { name: `${prefix} 26` })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('link', { name: `${prefix} 01` })).toBeVisible()
    await page.goForward()
    await expect(page.getByRole('link', { name: `${prefix} 26` })).toBeVisible()
    // T-M2.19 AC4: Previous on the second page is disabled by its own press: focus moves to Next.
    await pages.getByRole('button', { name: 'Trang trước' }).click()
    await expect(page.getByRole('link', { name: `${prefix} 01` })).toBeVisible()
    await expect(pages.getByRole('status')).toHaveText('Trang 1 / 2')
    await expectFocusNotLost(page)

    // Newest: by creation, newest first.
    await page.goto(`/tutor/students?q=${encodeURIComponent(prefix)}`)
    await page.getByRole('radio', { name: 'Mới nhất' }).click()
    await expect(page).toHaveURL(/sort=newest/)
    const firstName = page
      .getByRole('main')
      .getByRole('link', { name: new RegExp(`^${prefix} \\d\\d$`) })
      .first()
    await expect(firstName).toHaveText(`${prefix} 26`)

    // Garbage params show the default view; a page past the end lands on the last page; a control character is dropped.
    for (const params of ['page=-1', 'page=abc', 'sort=x']) {
      await page.goto(`/tutor/students?${params}`)
      await expect(page.getByRole('main').getByRole('link').nth(1)).toBeVisible()
      await expect(page.getByRole('alert')).toHaveCount(0)
    }
    await page.goto(`/tutor/students?q=${encodeURIComponent(prefix)}&page=99`)
    await expect(page.getByRole('link', { name: `${prefix} 26` })).toBeVisible()
    await expect(page).toHaveURL(/page=2$/)
    await page.goto(`/tutor/students?q=%01${encodeURIComponent(prefix)}`)
    await expect(page.getByRole('link', { name: `${prefix} 01` })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)

    // Layout: a list below 768 px (no horizontal scroll), a table with column headers at ≥ 768 px; a long name and email
    // wrap inside the viewport with the full text there.
    await page.goto(`/tutor/students?q=${t}`)
    const link = page.getByRole('link', { name: longName })
    await expect(link).toBeVisible()
    if (wide(page)) {
      await expect(page.getByRole('table', { name: 'Học viên' })).toBeVisible()
      // No Username column (AC12 (q)): `@username` is the name cell's second line.
      await expect(page.getByRole('columnheader')).toHaveText(['Họ tên', 'Trạng thái', 'Email', 'Điện thoại'])
      // Phone and status stay on one line (AC12 (d)). A three-word name and a 20-character email take at most 2 lines,
      // a 20-character username one (AC12 (q)); a 40-character username is fully there.
      expect(await lineCount(page.getByRole('cell', { name: '+84 90 123 4567' }))).toBe(1)
      for (const name of [threeWords, diacritic.student.fullName])
        expect(await lineCount(page.getByRole('link', { name, exact: true })), name).toBeLessThanOrEqual(2)
      expect(await lineCount(page.getByRole('cell', { name: email20, exact: true }))).toBeLessThanOrEqual(2)
      // AC12 (s): with the long email on the page, a short email and the usernames stay whole on one line; the long
      // email wraps between its parts and stays fully there.
      expect(await lineCount(page.getByRole('cell', { name: email20, exact: true }))).toBe(1)
      expect(await lineCount(page.getByText(`@${dotted}`, { exact: true }))).toBe(1)
      await expect(page.getByRole('cell', { name: longEmail, exact: true })).toHaveText(longEmail)
      expect(await lineCount(page.getByText(`@${twenty}`, { exact: true }))).toBe(1)
      await expect(page.getByText(`@${`e2e-long-${t}-`.padEnd(40, 'x')}`, { exact: true })).toBeVisible()
    } else {
      await expect(page.getByRole('table')).toHaveCount(0)
      await expect(page.getByRole('list', { name: 'Học viên' })).toBeVisible()
      // The title row holds the name, `@username` and the badge; the meta line email and phone (AC12 (e), (q)).
      const item = page.getByRole('listitem').filter({ has: link })
      await expect(item.locator(':scope > div').first()).toContainText('Đang học')
      await expect(item.locator(':scope > div').first()).toContainText(`@e2e-long-${t}-`)
      await expect(item.locator(':scope > div').last()).not.toContainText('e2e-long-')
      await expect(item.locator(':scope > div').last()).not.toContainText('Đang học')
      await expect(item.locator(':scope > div').last()).toContainText('+84 90 123 4567')
    }
    await expectNoHorizontalScroll(page)
    const viewport = page.viewportSize()!.width
    for (const target of [link, page.getByText(`nguyen.thi.phuong.lan.anh.hoang.bao.ngoc.${t}@example.com`)]) {
      const bounds = (await target.boundingBox())!
      expect(bounds.x + bounds.width, 'inside the viewport').toBeLessThanOrEqual(viewport)
    }
    await expect(link).toHaveText(longName)
    await shot(page, testInfo, 'list-long-name-vi')
  })

  test('AC4/AC10: first use (no student in any status): the empty state with one Add student', async ({
    page,
  }, testInfo) => {
    // The E2E tutor has students: the API's empty answer is simulated for this view only.
    await page.route('**/api/v1/tutor/students?**', (route) =>
      route.fulfill({ json: { items: [], page: 0, size: 25, totalItems: 0, totalPages: 0 } }),
    )
    await page.goto('/tutor/students')
    await expect(page.getByRole('heading', { level: 2, name: 'Thêm học viên đầu tiên' })).toBeVisible()
    await expect(page.getByRole('main').getByRole('link', { name: 'Thêm học viên' })).toHaveCount(1)
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'list-first-use-vi')
  })
})

test.describe('Students table with realistic data (AC12 (t))', () => {
  test('fixed column shares at 768, 1024 and 1280 in vi and en: no horizontal scroll, every value whole', async ({
    page,
  }, testInfo) => {
    const project = testInfo.project.name
    test.skip(project === 'phone-small', 'the table starts at 768 px')
    const widths = project === 'laptop' ? [768, 1024, 1280] : [page.viewportSize()!.width]
    const t = token()
    await page.goto('/tutor/students')
    // QA-R4-1's rows, QA-R3-1's long email and a three-word name with a 20-character username and email.
    const twenty = `e2e-twenty-ab-${t}`
    const email20 = `h.${t}@example.com`
    await apiStudent(page, {
      fullName: 'Nguyễn Hoàng Phương Thảo',
      username: `nguyenhoangphuongthao${t}`,
      email: `phuongthao.${t}@gmail.com`,
      phone: '+84 90 123 4567',
    })
    await apiStudent(page, {
      fullName: 'Lê Văn Bình',
      username: `binh.le.${t}`,
      email: `binh.le.${t}@gmail.com`,
      phone: '0901 234 567',
    })
    await apiStudent(page, {
      fullName: 'Nguyễn Văn An',
      username: `nguyenvanan.${t}`,
      email: `nguyen.thi.phuong.lan.anh.hoang.${t}@subdomain.example-long.com`,
    })
    // QA-R5-1: a short example.com email and a phone with a hyphen group (AC12 (u)).
    await apiStudent(page, {
      fullName: 'Trần Văn An',
      username: `an.${t}`,
      email: `an.${t}@example.com`,
      phone: '+84 (90) 123-4567',
    })
    const archived = await apiStudent(page, {
      fullName: 'Phạm Ngọc Anh',
      username: twenty,
      email: email20,
      phone: '+84 90 123 4567',
    })
    // An archived row too, so the longest badge ("Đã lưu trữ" / "Archived") is measured.
    expect(
      (
        await apiCall(page, 'POST', `/api/v1/tutor/students/${archived.student.id}/status`, {
          status: 'ARCHIVED',
          version: archived.student.version,
        })
      ).status,
    ).toBe(200)
    for (const lang of ['vi', 'en'] as const) {
      await page.evaluate((l) => localStorage.setItem('englms.locale', l), lang)
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(`/tutor/students?q=${t}&archived=1`)
        const table = page.getByRole('table')
        await expect(table.getByRole('row')).toHaveCount(6)
        await expectNoHorizontalScroll(page)
        const report = await table.evaluate((el) => {
          const overflowing = [...el.querySelectorAll('td, th')]
            .filter((cell) => cell.scrollWidth > cell.clientWidth + 1)
            .map((cell) => cell.textContent)
          // Each badge inside its cell.
          const badges = [...el.querySelectorAll('tbody td span[class*="badge"]')].filter((badge) => {
            const cell = badge.closest('td')!.getBoundingClientRect()
            const box = badge.getBoundingClientRect()
            return box.right > cell.right || box.left < cell.left
          })
          return {
            tableWidth: el.getBoundingClientRect().width,
            parentWidth: el.parentElement!.getBoundingClientRect().width,
            overflowing,
            badges: badges.length,
          }
        })
        const label = `${lang} ${width}px`
        expect(report.tableWidth, `${label}: the table fits its container`).toBeLessThanOrEqual(report.parentWidth + 1)
        expect(report.overflowing, `${label}: no cell content overflows`).toEqual([])
        expect(report.badges, `${label}: badges inside their cells`).toBe(0)
        expect(await lineCount(page.getByText(`@${twenty}`, { exact: true })), `${label}: 20-character username`).toBe(
          1,
        )
        expect(
          await lineCount(page.getByRole('cell', { name: email20, exact: true })),
          `${label}: 20-character email`,
        ).toBe(1)
        for (const phone of await page.getByRole('cell', { name: /^\+84 90 123 4567$/ }).all())
          expect(await lineCount(phone), `${label}: phone`).toBe(1)
        // Emails wrap only after @ or before a dot: the domain stays on one line; the hyphen phone stays whole (AC12 (u)).
        for (const email of [`binh.le.${t}@gmail.com`, `phuongthao.${t}@gmail.com`, `an.${t}@example.com`]) {
          const domainLines = await page.getByRole('cell', { name: email, exact: true }).evaluate((cell) => {
            const nodes = [...cell.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE)
            const at = nodes.findIndex((n) => n.textContent!.endsWith('@'))
            const range = document.createRange()
            range.setStartBefore(nodes[at + 1]!)
            range.setEndAfter(nodes.at(-1)!)
            return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size
          })
          expect(domainLines, `${label}: ${email} domain on one line`).toBe(1)
        }
        if (width <= 1024)
          expect(
            await lineCount(page.getByRole('cell', { name: '+84 (90) 123-4567', exact: true })),
            `${label}: +84 (90) 123-4567`,
          ).toBe(1)
        await shot(page, testInfo, `list-realistic-${lang}-${width}`)
      }
    }
    await page.evaluate(() => localStorage.setItem('englms.locale', 'vi'))
  })
})

test.describe('Workspace page', () => {
  test('AC8: refused contact values are text with a copy button (no link); unknown and malformed ids show not-found', async ({
    page,
    consoleGuard,
  }, testInfo) => {
    const t = token()
    await page.goto('/tutor/students')
    const refused = [
      'an.nguyen',
      'http://zalo.me/1',
      'javascript:alert(1)',
      'data:text/html,x',
      'mailto:a@b?cc=c',
      '//evil.example',
      'https://zalo.me@evil.example/',
    ]
    const created = await apiStudent(page, {
      fullName: `Giá Trị Lạ ${t}`,
      username: `e2e-odd-${t}`,
      contactHandles: refused.map((value, i) => ({ label: `Kênh ${i + 1}`, value })),
    })
    await page.goto(`/tutor/students/${created.student.id}`)
    await expect(h1(page, `Giá Trị Lạ ${t}`)).toBeVisible()
    const contacts = page.getByRole('region', { name: 'Liên hệ', exact: true })
    for (const [i, value] of refused.entries()) {
      await expect(contacts.getByText(value, { exact: true })).toBeVisible()
      await expect(contacts.getByRole('button', { name: `Sao chép Kênh ${i + 1}` })).toBeVisible()
    }
    expect(await page.locator('main a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual([
      '/tutor/students',
    ])
    await expect(contacts.getByText('Chưa có').first()).toBeVisible()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'workspace-refused-values-vi')

    await page.goto('/tutor/students/00000000-0000-4000-8000-000000000000')
    await expect(h1(page, 'Không tìm thấy học viên')).toBeVisible()
    await expect(page.getByRole('main').getByRole('link', { name: 'Về danh sách học viên' })).toHaveAttribute(
      'href',
      '/tutor/students',
    )
    acceptStatus(consoleGuard, 404, /^\/api\/v1\/tutor\/students\//)
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'workspace-not-found-vi')
    const requests: string[] = []
    page.on('request', (r) => requests.push(new URL(r.url()).pathname))
    await page.goto('/tutor/students/not-a-uuid')
    await expect(h1(page, 'Không tìm thấy học viên')).toBeVisible()
    expect(requests.filter((p) => p.startsWith('/api/v1/tutor/students/'))).toEqual([])
  })
})

test.describe('English UI (AC10)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('englms.locale', 'en'))
  })

  test('the list, the form with errors, the card and the workspace are axe clean in English', async ({
    page,
  }, testInfo) => {
    await page.goto('/tutor/students')
    await expect(h1(page, 'Students')).toBeVisible()
    await expect(page.getByRole('table').or(page.getByRole('list', { name: 'Students' }))).toBeVisible()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'list-populated-en')
    await page.getByRole('main').getByRole('link', { name: 'Add student' }).first().click()
    await expect(h1(page, 'Add student')).toBeFocused()
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: "The student wasn't created" })).toBeFocused()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'add-errors-en')
    const name = `English Card ${testInfo.project.name} ${token()}`
    await page.getByRole('textbox', { name: 'Full name (required)' }).fill(name)
    await expect(page.getByText('Available', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Student created' })).toBeFocused()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'credentials-card-en')
    await page.getByRole('link', { name: 'Open workspace' }).click()
    await expect(h1(page, name)).toBeVisible()
    await expect(page.getByText('Not added').first()).toBeVisible()
    await expectSettledAccessible(page)
    await shot(page, testInfo, 'workspace-en')
  })
})

// ---------------------------------------------------------------------------------------------------------------------
// T-M2.14 (edit profile, conflict, status + Undo, reset password, toasts) at the mandatory viewports: AC1, AC3–AC7, AC9,
// AC10. Each test creates its own students (dev data, kept). Student sessions are fresh contexts (never the stored one).

const accountRegion = (page: Page) => page.getByRole('region', { name: /^(Tài khoản|Account)$/ })
const toastRegion = (page: Page) => page.getByRole('region', { name: /^(Thông báo|Notifications)$/ })
const box = async (target: Locator) => (await target.boundingBox())!

/** A student created through the API, with a phone and an email (unique per test). */
async function profileStudent(page: Page, label: string, extra: Record<string, unknown> = {}) {
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
async function studentSession(browser: Browser, created: Created) {
  const context = await browser.newContext({ storageState: ANONYMOUS })
  const page = await context.newPage()
  await page.goto('/login')
  const first = { username: created.credentials.username, password: created.credentials.temporaryPassword }
  expect((await apiSignIn(page, first)).status).toBe(200)
  const credentials = await apiChangePassword(page, first)
  return { context, page, credentials }
}

/** A sign-in attempt on a fresh context (its own cookies), closed afterwards. */
async function trySignIn(browser: Browser, credentials: { username: string; password: string }) {
  const context = await browser.newContext({ storageState: ANONYMOUS })
  const page = await context.newPage()
  await page.goto('/login')
  const status = (await apiSignIn(page, credentials)).status
  await context.close()
  return status
}

/** Below 768 px the buttons of an action row stack full width in source order; at ≥ 768 px they sit inline, start-aligned. */
async function expectActionRow(page: Page, row: Locator) {
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
async function expectToastPlacement(page: Page) {
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
    const edit = page.getByRole('button', { name: 'Sửa hồ sơ' })
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
    await page.getByRole('button', { name: 'Sửa hồ sơ' }).click()
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
    await page.getByRole('button', { name: 'Sửa hồ sơ' }).click()
    const other = await context.newPage()
    await other.goto(url)
    await other.getByRole('button', { name: 'Sửa hồ sơ' }).click()
    await other.getByRole('textbox', { name: 'Email' }).fill('tab.khac@example.com')
    await other.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(other.getByRole('button', { name: 'Sửa hồ sơ' })).toBeFocused()

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
    await tabTo(page.getByRole('button', { name: 'Sửa hồ sơ' }))
    await page.keyboard.press('Enter')
    log.push('Enter on Edit profile')
    await expect(fullNameField(page)).toBeFocused()
    await tabTo(page.getByRole('textbox', { name: 'Ghi chú' }))
    await page.keyboard.type('Gõ bằng bàn phím')
    log.push('type a note')
    await tabTo(page.getByRole('button', { name: 'Lưu', exact: true }))
    await page.keyboard.press('Enter')
    log.push('Enter on Save')
    await expect(page.getByRole('button', { name: 'Sửa hồ sơ' })).toBeFocused()
    await expect(page.getByRole('region', { name: 'Ghi chú' })).toContainText('Gõ bằng bàn phím')
    await evidenceRecord(testInfo, 'keyboard-edit', { viewport: page.viewportSize(), actions: log })
  })
})

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
    await expect(page.getByRole('button', { name: 'Sửa hồ sơ' })).toBeDisabled()
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

// ---------------------------------------------------------------------------------------------------------------------
// T-M2.15 (guardians on the Profile view and in Add student) at the mandatory viewports: AC1–AC7, AC9 (axe in vi and en,
// layout rules, keyboard-only, the F11 step log). Fictitious guardians only: invented names, example.com emails, phones
// from the range reserved for fiction (+1 555 0100–0199). Each test creates its own students (dev data, kept).

const guardiansRegion = (page: Page) => page.getByRole('region', { name: /^(Phụ huynh|Guardians)$/ })
const guardianNames = (page: Page) => guardiansRegion(page).getByRole('heading', { level: 3 }).allTextContents()

/** A fictitious guardian for the API (index 0–99 → phone +1 555 01nn). */
function fictitiousGuardian(index: number, extra: Record<string, unknown> = {}) {
  return {
    name: `Phụ Huynh Thử ${index + 1}`,
    relationship: 'Mẹ',
    phone: `+1 555 01${String(index % 100).padStart(2, '0')}`,
    email: `guardian.${index + 1}@example.com`,
    ...extra,
  }
}

/** Every input of a form is full width of the column and alone on its row (T-M2.15 layout rules). */
async function expectFieldsStacked(form: Locator) {
  const boxes = await Promise.all((await form.locator('input, textarea').all()).map(box))
  for (const [i, b] of boxes.entries()) {
    expect(Math.abs(b.x - boxes[0]!.x), 'start-aligned').toBeLessThanOrEqual(1)
    expect(Math.abs(b.width - boxes[0]!.width), 'full width').toBeLessThanOrEqual(1)
    if (i > 0) expect(b.y, 'one per row').toBeGreaterThan(boxes[i - 1]!.y + boxes[i - 1]!.height - 1)
  }
}

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
    await expect(page.getByRole('button', { name: 'Sửa hồ sơ' })).toBeDisabled()
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
    expect(await guardianNames(page)).toEqual(['Vũ Thị Hư Cấu'])
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
    await page.getByRole('button', { name: 'Sửa hồ sơ' }).click()
    await expect(section.getByText('Hãy lưu hoặc huỷ thay đổi trước.')).toBeVisible()
    for (const name of ['Sửa Hồ Thị Hư Cấu', 'Xoá Hồ Thị Hư Cấu', 'Thêm phụ huynh'])
      await expect(section.getByRole('button', { name })).toBeDisabled()
    await page.getByRole('button', { name: 'Huỷ', exact: true }).click()
    await expect(page.getByRole('form')).toHaveCount(0)
    await expectFocusNotLost(page)
    await section.getByRole('button', { name: 'Thêm phụ huynh' }).click()
    await expect(page.getByRole('button', { name: 'Sửa hồ sơ' })).toBeDisabled()
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

// ---------------------------------------------------------------------------------------------------------------------
// T-M2.19 (automated UI checks): AC4 (focus after the actions that remove or disable their own control, those no other
// test performs), AC5 (the motion tokens as rendered) and AC3 (the long-data walk) at the mandatory viewports.

/** Answers 503 to the requests `matches` selects (the rest pass through) until `stop` is called. */
async function failRequests(page: Page, url: string, matches: (requestUrl: URL) => boolean = () => true) {
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

test.describe('Focus after an action removes or disables its own control (T-M2.19 AC4)', () => {
  // OQ T-M2.19-1: these controls unmount with their alert or empty state and focus drops to body (no focus target in
  // StudentsListPage). A focus change is out of this packet's scope (UI rules): each check is kept as an expected
  // failure, which turns into an error once the focus is fixed (remove its `test.fail` then).
  const listAlert = (page: Page) => page.getByRole('alert').filter({ hasText: 'Không tải được danh sách học viên' })
  const listShown = (page: Page) => page.getByRole('table').or(page.getByRole('list', { name: 'Học viên' }))
  const anyCheck = (url: URL) => url.searchParams.get('size') === '1'
  /** No active or paused student, only archived ones (simulated): the default view is empty; the rest passes through. */
  const onlyArchived = (page: Page) =>
    page.route('**/api/v1/tutor/students?**', (route) => {
      const url = new URL(route.request().url())
      return anyCheck(url) || url.searchParams.getAll('status').includes('ARCHIVED')
        ? route.fallback()
        : route.fulfill({ json: { items: [], page: 0, size: 25, totalItems: 0, totalPages: 0 } })
    })
  const noActive = (page: Page) =>
    page.getByRole('heading', { level: 2, name: 'Không có học viên đang học hoặc tạm nghỉ' })

  test('the list error: Try again (expected to fail: focus drops to body, OQ T-M2.19-1)', async ({
    page,
    consoleGuard,
  }) => {
    test.fail(true, 'known: focus is lost after the list error Try again (OQ T-M2.19-1)')
    const recover = await failRequests(page, '**/api/v1/tutor/students?**')
    await page.goto('/tutor/students')
    await expect(listAlert(page)).toBeVisible({ timeout: 15_000 })
    recover()
    acceptStatus(consoleGuard, 503, '/api/v1/tutor/students')
    await listAlert(page).getByRole('button', { name: 'Thử lại' }).click()
    await expect(listAlert(page)).toHaveCount(0)
    await expect(listShown(page)).toBeVisible()
    await expectFocusNotLost(page)
  })

  test('the any-student check error: Try again (expected to fail: focus drops to body, OQ T-M2.19-1)', async ({
    page,
    consoleGuard,
  }) => {
    test.fail(true, 'known: focus is lost after the any-student check Try again (OQ T-M2.19-1)')
    const recover = await failRequests(page, '**/api/v1/tutor/students?**', anyCheck)
    await onlyArchived(page)
    await page.goto('/tutor/students')
    await expect(listAlert(page)).toBeVisible({ timeout: 15_000 })
    recover()
    acceptStatus(consoleGuard, 503, '/api/v1/tutor/students')
    await listAlert(page).getByRole('button', { name: 'Thử lại' }).click()
    await expect(noActive(page)).toBeVisible()
    await expectFocusNotLost(page)
  })

  test('only archived students: Include archived (expected to fail: focus drops to body, OQ T-M2.19-1)', async ({
    page,
  }) => {
    test.fail(true, 'known: focus is lost after the empty state Include archived (OQ T-M2.19-1)')
    await onlyArchived(page)
    await page.goto('/tutor/students')
    await page.getByRole('main').getByRole('button', { name: 'Gồm cả học viên đã lưu trữ' }).click()
    await expect(noActive(page)).toHaveCount(0)
    await expect(page.getByText('Đã lưu trữ', { exact: true }).first()).toBeVisible()
    await expectFocusNotLost(page)
  })

  test('a search that finds nothing: Clear filters', async ({ page }) => {
    await page.goto(`/tutor/students?q=${encodeURIComponent(`khong co ai ${token()}`)}`)
    await page.getByRole('button', { name: 'Xoá bộ lọc' }).click()
    await expect(listShown(page)).toBeVisible()
    await expectFocusNotLost(page)
  })

  // OQ T-M2.19-1: as the list's, the workspace's Try again unmounts with its alert and focus drops to body.
  test('the workspace error: Try again (expected to fail: focus drops to body, OQ T-M2.19-1)', async ({
    page,
    consoleGuard,
  }) => {
    test.fail(true, 'known: focus is lost after the workspace error Try again (OQ T-M2.19-1)')
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

test.describe('Motion tokens as rendered (T-M2.19 AC5)', () => {
  /** The computed animation of an element: its duration and whether one runs at all. */
  const animation = (target: Locator) =>
    target.evaluate((el) => {
      const style = getComputedStyle(el)
      return { duration: style.animationDuration, running: style.animationName !== 'none' }
    })

  for (const reduced of [false, true]) {
    test(`the Skeleton pulses in 1.4 s and the Spinner turns in 800 ms${reduced ? '; with reduced motion neither moves' : ''}`, async ({
      page,
    }) => {
      if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' })
      // The list request is held past the 150 ms skeleton delay.
      let releaseList!: () => void
      const listHeld = new Promise<void>((resolve) => (releaseList = resolve))
      await page.route('**/api/v1/tutor/students?**', async (route) => {
        await listHeld
        await route.fallback()
      })
      await page.goto('/tutor/students')
      const skeleton = page.locator('[class*="_skeleton_"]').first()
      await expect(skeleton).toBeVisible()
      expect(await animation(skeleton)).toEqual(
        reduced ? { duration: '0s', running: false } : { duration: '1.4s', running: true },
      )
      releaseList()
      await page.unrouteAll({ behavior: 'wait' })

      // A guardian Save held: the pending Button shows the Spinner.
      const created = await profileStudent(page, reduced ? 'Chuyển Động Giảm' : 'Chuyển Động')
      let releaseSave!: () => void
      const saveHeld = new Promise<void>((resolve) => (releaseSave = resolve))
      await page.route('**/api/v1/tutor/students/*/guardians', async (route) => {
        if (route.request().method() === 'POST') await saveHeld
        await route.fallback()
      })
      await page.goto(`/tutor/students/${created.student.id}`)
      await guardiansRegion(page).getByRole('button', { name: 'Thêm phụ huynh' }).click()
      const form = page.getByRole('form', { name: 'Phụ huynh mới' })
      await form.getByRole('textbox', { name: 'Tên (bắt buộc)' }).fill('Lê Thị Chờ Lưu')
      await form.getByRole('button', { name: 'Lưu', exact: true }).click()
      const spinner = form.locator('[class*="_spinner_"]')
      await expect(spinner).toBeAttached()
      expect(await animation(spinner)).toEqual(
        reduced ? { duration: '0s', running: false } : { duration: '0.8s', running: true },
      )
      if (reduced) expect(await spinner.evaluate((el) => getComputedStyle(el).opacity)).toBe('0.6')
      releaseSave()
      await expect(page.getByRole('button', { name: 'Sửa Lê Thị Chờ Lưu' })).toBeFocused()
    })
  }
})

test.describe('Long data (T-M2.19)', () => {
  for (const lang of ['vi', 'en'] as const) {
    test(`[${lang}] the list, the Profile view with a guardian, Edit profile, the guardian form and Add student: settled, accessible, no word broken`, async ({
      page,
    }, testInfo) => {
      const copy = {
        vi: {
          students: 'Học viên',
          editProfile: 'Sửa hồ sơ',
          cancel: 'Huỷ',
          contact: 'Liên hệ (không bắt buộc)',
          guardiansOptional: 'Phụ huynh (không bắt buộc)',
          addGuardian: 'Thêm phụ huynh',
          fullName: 'Họ tên (bắt buộc)',
          username: 'Tên đăng nhập (bắt buộc)',
          guardianName: 'Tên (bắt buộc)',
          relationship: 'Quan hệ',
          editGuardian: 'Sửa',
          guardianRow: 'Phụ huynh 1',
        },
        en: {
          students: 'Students',
          editProfile: 'Edit profile',
          cancel: 'Cancel',
          contact: 'Contact (optional)',
          guardiansOptional: 'Guardians (optional)',
          addGuardian: 'Add guardian',
          fullName: 'Full name (required)',
          username: 'Username (required)',
          guardianName: 'Name (required)',
          relationship: 'Relationship',
          editGuardian: 'Edit',
          guardianRow: 'Guardian 1',
        },
      }[lang]
      const data = longData(token())
      await page.addInitScript((l) => localStorage.setItem('englms.locale', l), lang)
      await profileStudent(page, 'x', {
        fullName: data.fullName,
        username: data.username,
        email: data.email,
        guardians: [{ name: data.guardianName, relationship: data.guardianRelationship }],
      })
      const main = page.getByRole('main')
      /** Every visible button with text in `scope` (icon-only copy buttons carry no text to break). */
      const textButtons = async (scope: Locator) => {
        const found: Locator[] = []
        for (const button of await scope.getByRole('button').all())
          if ((await button.isVisible()) && (await button.innerText()).trim()) found.push(button)
        return found
      }
      const noBreaks = async (targets: Locator[]) => {
        for (const target of targets) await expectNoMidWordBreak(target)
      }

      // The Students list, filtered to the new student.
      await page.goto(`/tutor/students?q=${encodeURIComponent(data.username)}`)
      const row = main.getByRole('link', { name: data.fullName })
      await expect(row).toBeVisible()
      await expectSettledAccessible(page)
      await noBreaks([row, h1(page, copy.students)])
      await shot(page, testInfo, `long-list-${lang}`)

      // The Profile view with one guardian.
      await row.click()
      await expect(h1(page, data.fullName)).toBeVisible()
      const guardian = guardiansRegion(page).getByRole('heading', { level: 3, name: data.guardianName })
      await expect(guardian).toBeVisible()
      await expectSettledAccessible(page)
      await noBreaks([h1(page, data.fullName), guardian, ...(await main.getByRole('heading', { level: 2 }).all())])
      await noBreaks(await textButtons(main))
      await shot(page, testInfo, `long-profile-${lang}`)

      // Edit profile.
      await main.getByRole('button', { name: copy.editProfile }).click()
      const form = page.getByRole('form', { name: copy.editProfile })
      await expect(form).toBeVisible()
      await expectSettledAccessible(page)
      await noBreaks([h1(page, data.fullName), ...(await main.getByRole('heading', { level: 2 }).all())])
      await noBreaks(await textButtons(form))
      await shot(page, testInfo, `long-edit-profile-${lang}`)
      await form.getByRole('button', { name: copy.cancel, exact: true }).click()
      await expect(form).toHaveCount(0)

      // The guardian form.
      await guardiansRegion(page)
        .getByRole('button', { name: `${copy.editGuardian} ${data.guardianName}` })
        .click()
      const guardianForm = guardiansRegion(page).getByRole('form')
      await expect(guardianForm.getByRole('textbox', { name: copy.guardianName })).toHaveValue(data.guardianName)
      await expectSettledAccessible(page)
      await noBreaks(await main.getByRole('heading', { level: 2 }).all())
      await noBreaks(await textButtons(guardianForm))
      await shot(page, testInfo, `long-guardian-form-${lang}`)
      await guardianForm.getByRole('button', { name: copy.cancel, exact: true }).click()
      await expect(guardianForm).toHaveCount(0)

      // Add student with the long values typed (another run's token: the username stays free).
      const typed = longData(token())
      await page.goto('/tutor/students/new')
      await page.getByRole('textbox', { name: copy.fullName, exact: true }).fill(typed.fullName)
      await page.getByRole('textbox', { name: copy.username }).fill(typed.username)
      await page.getByRole('button', { name: copy.contact }).click()
      await main.getByRole('textbox', { name: 'Email' }).fill(typed.email)
      await page.getByRole('button', { name: copy.guardiansOptional }).click()
      await main.getByRole('button', { name: copy.addGuardian }).click()
      const guardianRow = main.getByRole('group', { name: copy.guardianRow })
      await guardianRow.getByRole('textbox', { name: copy.guardianName }).fill(typed.guardianName)
      await guardianRow.getByRole('textbox', { name: copy.relationship }).fill(typed.guardianRelationship)
      await expectSettledAccessible(page)
      await noBreaks([
        page.getByRole('heading', { level: 1 }),
        ...(await main.getByRole('heading', { level: 2 }).all()),
      ])
      await noBreaks(await textButtons(main))
      await shot(page, testInfo, `long-add-student-${lang}`)
    })
  }
})
