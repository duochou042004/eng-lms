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
import { expectNoAxeViolations, expectNoHorizontalScroll } from '../support/checks'
import { evidenceRecord, evidenceShot } from '../support/evidence'
import { expect, test } from '../support/fixtures'
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

async function expectAccessible(page: Page) {
  // A dialog that is still fading in would be measured at part opacity: wait until it has settled.
  await expect(page.locator('[data-entering]')).toHaveCount(0)
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

/** How many line boxes a cell's or element's text takes. */
const lineCount = (target: Locator) =>
  target.evaluate((el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size
  })

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
    await expectAccessible(page)
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
    await expectAccessible(page)
    await shot(page, testInfo, 'profile-view-vi')

    await edit.click()
    const form = page.getByRole('form', { name: 'Sửa hồ sơ' })
    await expect(form).toBeVisible()
    await expect(fullNameField(page)).toBeFocused()
    await expect(accountRegion(page).getByText('Hãy lưu hoặc huỷ thay đổi trước.')).toBeVisible()
    await expectActionRow(page, form.locator('[class*="stackedActions"]'))
    await shot(page, testInfo, 'edit-form-vi')
    // Client errors: the summary takes focus.
    await fullNameField(page).fill('')
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Chưa lưu được hồ sơ' })).toBeFocused()
    await expectAccessible(page)
    await shot(page, testInfo, 'edit-errors-vi')
    expect(requests).toEqual([])

    // The guard: the shell nav asks; Keep editing stays.
    await (await navItem(page, 'Hôm nay')).click()
    const discard = page.getByRole('alertdialog', { name: 'Bỏ các thay đổi?' })
    await expect(discard).toBeVisible()
    await discard.getByRole('button', { name: 'Tiếp tục sửa' }).click()
    await expect(page).toHaveURL(new RegExp(`/tutor/students/${created.student.id}$`))

    await fullNameField(page).fill(created.student.fullName)
    await form.getByRole('textbox', { name: 'Email' }).fill(`moi.${t}@example.com`)
    await form.getByRole('textbox', { name: 'Điện thoại' }).fill('')
    await form.getByRole('button', { name: 'Thêm liên hệ' }).click()
    const handle = form.getByRole('group').last()
    await handle.getByRole('textbox', { name: 'Tên kênh (bắt buộc)' }).fill('Zalo')
    await handle.getByRole('textbox', { name: 'Đường dẫn hoặc ID' }).fill('https://zalo.me/0901234567')
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(edit).toBeFocused()
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
    await expectToastPlacement(page)
    await expectAccessible(page)
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
    await expectAccessible(page)
    await shot(page, testInfo, 'conflict-dialog-vi')
    await dialog.getByRole('button', { name: 'Sao chép ghi chú của tôi' }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Ghi chú của tab này')
    await dialog.getByRole('button', { name: 'Huỷ' }).click()
    await expect(page.getByRole('textbox', { name: 'Ghi chú' })).toHaveValue('Ghi chú của tab này')
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await dialog.getByRole('button', { name: 'Tải lại' }).click()
    await expect(page.getByRole('form')).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Liên hệ', exact: true })).toContainText('tab.khac@example.com')

    // A status button with a stale version: the same dialog.
    await other.reload()
    await accountRegion(other).getByRole('button', { name: 'Tạm nghỉ' }).click()
    await expect(accountRegion(other)).toContainText('Tạm nghỉ')
    await accountRegion(page).getByRole('button', { name: 'Lưu trữ' }).click()
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Tải lại' }).click()
    await expect(accountRegion(page).getByRole('button', { name: 'Học lại' })).toBeVisible()
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
  test('AC5/AC9: Pause, Resume, Archive with Undo (F6, Tab, Enter), sign-in follows; toasts placed; Reactivate', async ({
    page,
    browser,
    consoleGuard,
  }, testInfo) => {
    const created = await profileStudent(page, 'Trạng Thái')
    const student = await studentSession(browser, created)
    await student.context.close()
    const account = accountRegion(page)
    await page.goto(`/tutor/students/${created.student.id}`)
    await expect(h1(page, created.student.fullName)).toBeVisible()
    await shot(page, testInfo, 'account-active-vi')

    await account.getByRole('button', { name: 'Tạm nghỉ' }).click()
    await expect(account.getByRole('button', { name: 'Học lại' })).toBeFocused()
    await expect(page.locator('main header')).toContainText('Tạm nghỉ')
    await expect(toastRegion(page)).toContainText(`${created.student.fullName} đã tạm nghỉ`)
    await expectToastPlacement(page)
    await expectAccessible(page)
    await shot(page, testInfo, 'account-paused-vi')
    await expect(toastRegion(page)).toBeHidden({ timeout: 15_000 })
    await account.getByRole('button', { name: 'Học lại' }).click()
    await expect(account).toContainText('Đang học')
    await expect(toastRegion(page)).toBeHidden({ timeout: 15_000 })

    // Archive: the persistent toast with Undo; the student can no longer sign in.
    await account.getByRole('button', { name: 'Lưu trữ' }).click()
    const reactivate = account.getByRole('button', { name: 'Kích hoạt lại' })
    await expect(reactivate).toBeFocused()
    const archivedToast = toastRegion(page).getByRole('alertdialog').filter({ hasText: 'Đã lưu trữ' })
    await expect(archivedToast).toBeVisible()
    await expect(account).toContainText('Kích hoạt lại học viên để đặt lại mật khẩu.')
    expect(await trySignIn(browser, student.credentials)).toBe(401)
    // The page scrolled to the end: the focused Reactivate stays clear of the toast (WCAG 2.2 SC 2.4.11).
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const [r, toastBox] = [await box(reactivate), await box(toastRegion(page))]
    expect(r.y + r.height, 'Reactivate above the toast').toBeLessThanOrEqual(toastBox.y)
    await expectToastPlacement(page)
    await expectAccessible(page)
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
    expect(await trySignIn(browser, student.credentials)).toBe(200)

    // Archive again; Reactivate closes the archive toast; sign-in works again.
    await account.getByRole('button', { name: 'Lưu trữ' }).click()
    await expect(archivedToast).toBeVisible()
    await shot(page, testInfo, 'account-archived-vi')
    await reactivate.click()
    await expect(archivedToast).toHaveCount(0)
    await expect(toastRegion(page)).toContainText(`Đã kích hoạt lại ${created.student.fullName}`)
    expect(await toastRegion(page).getByRole('alertdialog').count()).toBeLessThanOrEqual(3)
    expect(await trySignIn(browser, student.credentials)).toBe(200)
    // Leaving the page removes an archive toast.
    await account.getByRole('button', { name: 'Lưu trữ' }).click()
    await expect(archivedToast).toBeVisible()
    await page.getByRole('link', { name: 'Về danh sách học viên' }).click()
    await expect(h1(page, 'Học viên')).toBeVisible()
    await expect(archivedToast).toHaveCount(0)
    acceptStatus(consoleGuard, 401, '/api/v1/auth/login')
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
    await expectAccessible(page)
    await shot(page, testInfo, 'account-alert-status-vi')
    await page.unroute(statusUrl)

    // Undo after another tab changed the student: "Couldn't undo".
    await account.getByRole('button', { name: 'Lưu trữ' }).click()
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
    await expectAccessible(page)
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
    await expectAccessible(page)
    await shot(page, testInfo, 'reset-dialog-vi')
    const heading = page.getByRole('heading', { level: 2, name: 'Mật khẩu tạm mới' })
    await steps.step('Confirm Reset password', async () => {
      await dialog.getByRole('button', { name: 'Đặt lại mật khẩu' }).click()
      await expect(heading).toBeFocused()
    })
    const card = page.locator('section[class*="card"]', { has: heading })
    await expect(card).toContainText(`Gửi cho ${created.student.fullName} thông tin đăng nhập mới này.`)
    await expect(card).toContainText(new URL('/login', page.url()).href)
    await expect(page.getByRole('button', { name: 'Sửa hồ sơ' })).toBeDisabled()
    const password = (await card.locator('dd span[class*="secret"]').textContent())!.trim()
    expect(password.length).toBeGreaterThanOrEqual(14)
    await expectActionRow(page, card.locator('[class*="stackedActions"]').first())
    await expectAccessible(page)
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
    await expectAccessible(page)
    await shot(page, testInfo, 'profile-view-en')
    await page.getByRole('button', { name: 'Edit profile' }).click()
    await page.getByRole('textbox', { name: 'Full name (required)' }).fill('')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: "The profile wasn't saved" })).toBeFocused()
    await expectAccessible(page)
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
    await expectAccessible(page)
    await shot(page, testInfo, 'conflict-dialog-en')
    await conflict.getByRole('button', { name: 'Reload' }).click()
    await expect(page.getByRole('form')).toHaveCount(0)
    const account = accountRegion(page)
    await expect(account).toContainText('Paused')
    await shot(page, testInfo, 'account-paused-en')
    await account.getByRole('button', { name: 'Archive' }).click()
    await expect(toastRegion(page)).toContainText('archived. They can no longer sign in.')
    await expect(toastRegion(page).getByRole('button', { name: 'Undo' })).toBeVisible()
    await expectAccessible(page)
    await shot(page, testInfo, 'archive-toast-en')
    await toastRegion(page).getByRole('button', { name: 'Undo' }).click()
    await expect(account.getByRole('button', { name: 'Resume' })).toBeVisible()
    await expect(toastRegion(page)).toContainText('Archiving undone')
    await account.getByRole('button', { name: 'Reset password' }).click()
    const dialog = page.getByRole('alertdialog', { name: `Reset the password for ${created.student.fullName}?` })
    await expect(dialog).toBeVisible()
    await expectAccessible(page)
    await shot(page, testInfo, 'reset-dialog-en')
    await dialog.getByRole('button', { name: 'Reset password' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'New temporary password' })).toBeFocused()
    await expectAccessible(page)
    await shot(page, testInfo, 'reset-card-en')
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(account.getByRole('button', { name: 'Reset password' })).toBeFocused()
  })
})
