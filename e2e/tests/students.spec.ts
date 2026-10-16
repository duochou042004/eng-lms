import { randomBytes } from 'node:crypto'
import type { Locator, Page, TestInfo } from '@playwright/test'
import { ANONYMOUS, apiCall, apiSignIn, TUTOR_STATE, TUTOR_USERNAME, tutorPassword } from '../support/auth'
import { expectNoAxeViolations, expectNoHorizontalScroll } from '../support/checks'
import { evidenceRecord, evidenceShot } from '../support/evidence'
import { expect, test } from '../support/fixtures'
import { openAccountSection } from '../support/shell'
import { StepCounter } from '../support/steps'

// T-M2.5 (Students list, Add student F2 + the credentials card, the workspace page) at the mandatory viewports:
// AC2/AC3 (list, URL, responsive), AC5 (suggestion, create with contact and note), AC6 (409, summary, guard), AC7 (card,
// hygiene), AC8 (workspace, contact links, not-found), AC9 (the F2 step log; wall time reported, not asserted, DEC-093),
// AC10 (axe in vi and en, keyboard-only F2). Students are created with unique names through the UI and the API (dev
// data, kept); the stored tutor session is never logged out (the sign-out case uses a fresh sign-in).

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

async function expectAccessible(page: Page) {
  await expectNoAxeViolations(page)
  await expectNoHorizontalScroll(page)
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
    await expectAccessible(page)
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
    await expectAccessible(page)
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
    await expectAccessible(page)
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
    await expectAccessible(page)
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
    await expectAccessible(page)
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
    await expectAccessible(page)
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
    await page.getByRole('banner').getByRole('link').first().click() // the workspace name: the home link
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Bỏ', exact: true }).click()
    await expect(page).toHaveURL(/\/tutor\/today$/)

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
    // 20 characters: stays on one line at 768 and 1280 (AC12 (p)).
    const twenty = `e2e-twenty-ab-${t}`
    await apiStudent(page, {
      fullName: `Hai Mươi Ký Tự ${t}`,
      username: twenty,
      phone: '0901 234 567',
      email: `hm.${t}@example.com`,
    })
    await page.reload()
    await expect(h1(page, 'Học viên')).toBeVisible()
    await expectAccessible(page)
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
    await expectAccessible(page)
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
    await page.reload()
    await expect(page.getByRole('link', { name: `${prefix} 26` })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('link', { name: `${prefix} 01` })).toBeVisible()
    await page.goForward()
    await expect(page.getByRole('link', { name: `${prefix} 26` })).toBeVisible()

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
      await expect(page.getByRole('columnheader')).toHaveText([
        'Họ tên',
        'Tên đăng nhập',
        'Trạng thái',
        'Email',
        'Điện thoại',
      ])
      const lineCount = (target: Locator) =>
        target.evaluate((cell) => {
          const range = document.createRange()
          range.selectNodeContents(cell)
          return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size
        })
      // Phone and status stay on one line (AC12 (d)); so do a 20-character username and the Username header (AC12 (p)).
      expect(await lineCount(page.getByRole('cell', { name: '+84 90 123 4567' }))).toBe(1)
      expect(await lineCount(page.getByRole('cell', { name: twenty, exact: true }))).toBe(1)
      expect(await lineCount(page.getByRole('columnheader', { name: 'Tên đăng nhập' }))).toBe(1)
      await expect(page.getByRole('cell', { name: `e2e-long-${t}-`.padEnd(40, 'x'), exact: true })).toBeVisible()
    } else {
      await expect(page.getByRole('table')).toHaveCount(0)
      await expect(page.getByRole('list', { name: 'Học viên' })).toBeVisible()
      // The status badge sits in the title row; the meta line holds username, email and phone (AC12 (e)).
      const item = page.getByRole('listitem').filter({ has: link })
      await expect(item.locator(':scope > div').first()).toContainText('Đang học')
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
    await expectAccessible(page)
    await shot(page, testInfo, 'list-first-use-vi')
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
    await expectAccessible(page)
    await shot(page, testInfo, 'workspace-refused-values-vi')

    await page.goto('/tutor/students/00000000-0000-4000-8000-000000000000')
    await expect(h1(page, 'Không tìm thấy học viên')).toBeVisible()
    await expect(page.getByRole('main').getByRole('link', { name: 'Về danh sách học viên' })).toHaveAttribute(
      'href',
      '/tutor/students',
    )
    acceptStatus(consoleGuard, 404, /^\/api\/v1\/tutor\/students\//)
    await expectAccessible(page)
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
    await expectAccessible(page)
    await shot(page, testInfo, 'list-populated-en')
    await page.getByRole('main').getByRole('link', { name: 'Add student' }).first().click()
    await expect(h1(page, 'Add student')).toBeFocused()
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: "The student wasn't created" })).toBeFocused()
    await expectAccessible(page)
    await shot(page, testInfo, 'add-errors-en')
    const name = `English Card ${testInfo.project.name} ${token()}`
    await page.getByRole('textbox', { name: 'Full name (required)' }).fill(name)
    await expect(page.getByText('Available', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Student created' })).toBeFocused()
    await expectAccessible(page)
    await shot(page, testInfo, 'credentials-card-en')
    await page.getByRole('link', { name: 'Open workspace' }).click()
    await expect(h1(page, name)).toBeVisible()
    await expect(page.getByText('Not added').first()).toBeVisible()
    await expectAccessible(page)
    await shot(page, testInfo, 'workspace-en')
  })
})
