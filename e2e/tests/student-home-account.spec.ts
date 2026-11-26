import type { Page, Request } from "@playwright/test";
import { apiCall, STUDENT_STATE, TUTOR_STATE } from "../support/auth";
import {
  expectFocusNotLost,
  expectNoMidWordBreak,
  expectSettledAccessible,
} from "../support/checks";
import { evidenceRecord } from "../support/evidence";
import { accept, acceptStatus, expect, test } from "../support/fixtures";
import { longData } from "../support/longData";
import { accountPlace, openAccountSection } from "../support/shell";
import { StepCounter } from "../support/steps";
import {
  apiStudent,
  h1,
  shot,
  studentSession,
  token,
} from "../support/students";

// T-M2.7: the student's Home greeting (AC3, AC4), the Account link (AC5, AC9a), the Account page (AC6, AC8, AC9).
// Data hygiene (packet Design notes): the shared student's preferences are answered in place by the fixture; a real
// time-zone save runs on a fresh student. The time of day comes from a fixed clock, never the wall clock.

test.describe.configure({ mode: "serial" });

const ACCOUNT = "/api/v1/student/account";
const PREFERENCES = "/api/v1/auth/preferences";
// 02:00 UTC on 26/11/2026: 09:00 in Ho Chi Minh City (UTC+7), 18:00 on the 25th in Los Angeles (UTC−8).
const INSTANT = new Date("2026-11-26T02:00:00Z");

const timeZone = (page: Page) =>
  page.getByRole("combobox", { name: /^(Múi giờ|Time zone)$/ });
const save = (page: Page) =>
  page.getByRole("main").getByRole("button", { name: /^(Lưu|Đang lưu…)$/ });
const greeting = (page: Page) => page.getByRole("main").locator("header p");
const nameBlock = (page: Page) => page.getByRole("main").locator("dl");

/** A fresh student signed in on its own guarded context, its time zone saved for real. */
async function freshStudent(
  page: Page,
  browser: Parameters<typeof studentSession>[0],
  guard: string[],
  zone: string,
  body: Record<string, unknown> = {},
) {
  const t = token();
  const created = await apiStudent(page, {
    fullName: `Học Viên Chào ${t}`,
    username: `e2e-home-${t}`,
    ...body,
  });
  const session = await studentSession(browser, created, guard);
  expect(
    (await apiCall(session.page, "PATCH", PREFERENCES, { timeZone: zone }))
      .status,
  ).toBe(200);
  return { ...session, created };
}

/** The bodies of the preferences PATCHes `page` sends from now on. */
function recordPreferences(page: Page) {
  const sent: unknown[] = [];
  page.on("request", (request: Request) => {
    if (
      request.method() === "PATCH" &&
      new URL(request.url()).pathname === PREFERENCES
    )
      sent.push(request.postDataJSON());
  });
  return sent;
}

test.describe("fresh students (the tutor creates them)", () => {
  test.use({ storageState: TUTOR_STATE });

  test('AC3: one instant greets "buổi sáng" in Asia/Ho_Chi_Minh and "buổi tối" in America/Los_Angeles; vi and en', async ({
    page,
    browser,
    consoleGuard,
  }, testInfo) => {
    await page.goto("/tutor/students");
    for (const [zone, vi, en] of [
      ["Asia/Ho_Chi_Minh", "Chào buổi sáng", "Good morning"],
      ["America/Los_Angeles", "Chào buổi tối", "Good evening"],
    ] as const) {
      const {
        context,
        page: student,
        created,
      } = await freshStudent(page, browser, consoleGuard, zone);
      await student.clock.setFixedTime(INSTANT);
      await student.goto("/student/home");
      await expect(h1(student, "Trang chủ")).toBeVisible();
      await expect(greeting(student)).toHaveText(
        `${vi}, ${created.student.fullName}`,
      );
      // The greeting is a paragraph, not a heading: one h1, and the empty state stays.
      await expect(student.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(
        student.getByRole("heading", { name: "Chưa có gì ở đây" }),
      ).toBeVisible();
      await expectSettledAccessible(student);
      if (zone === "Asia/Ho_Chi_Minh")
        await shot(student, testInfo, "student-home");
      await student.evaluate(() => localStorage.setItem("englms.locale", "en"));
      await student.reload();
      await expect(h1(student, "Home")).toBeVisible();
      await expect(greeting(student)).toHaveText(
        `${en}, ${created.student.fullName}`,
      );
      await context.close();
    }
  });

  test("AC6/AC8: a real time-zone save persists, sends only the zone, and the Home greeting follows the new zone", async ({
    page,
    browser,
    consoleGuard,
  }, testInfo) => {
    await page.goto("/tutor/students");
    const {
      context,
      page: student,
      created,
    } = await freshStudent(page, browser, consoleGuard, "Asia/Ho_Chi_Minh");
    await student.clock.setFixedTime(INSTANT);
    const sent = recordPreferences(student);
    await student.goto("/student/account");
    await expect(h1(student, "Tài khoản")).toBeVisible();
    await expect(nameBlock(student)).toContainText(created.student.fullName);
    await expect(nameBlock(student)).toContainText(created.student.username);
    await expect(
      student.getByRole("textbox", { name: "Tên hiển thị" }),
    ).toHaveCount(0);
    await expect(timeZone(student)).toHaveValue("Asia/Ho_Chi_Minh");
    await expect(save(student)).toHaveAttribute("aria-disabled", "true");
    await timeZone(student).fill("los_angeles");
    await expect(student.getByRole("listbox").getByRole("option")).toHaveText([
      "America/Los_Angeles",
    ]);
    await shot(student, testInfo, "student-account-combobox");
    // DEC-191: only aria-hidden-focus is off while the list is open (React Aria hides the page outside the popover).
    await expectSettledAccessible(student, {
      disableRules: ["aria-hidden-focus"],
    });
    await student.keyboard.press("ArrowDown");
    await student.keyboard.press("Enter");
    await expect(timeZone(student)).toHaveValue("America/Los_Angeles");
    await save(student).click();
    const toasts = student.getByRole("region", { name: "Thông báo" });
    await expect(toasts).toContainText("Đã lưu");
    expect(sent).toEqual([{ timeZone: "America/Los_Angeles" }]);
    await expect(save(student)).toHaveAttribute("aria-disabled", "true");
    await expect(save(student)).toBeFocused();
    await expectFocusNotLost(student);
    // The toast never covers the bottom tabs (below 768 px) nor the focused Save.
    const tabs = student.locator("nav[data-bottom-tabs]");
    const toastBox = (await toasts.boundingBox())!;
    if (await tabs.count())
      expect(
        toastBox.y + toastBox.height,
        "the toast above the bottom tabs",
      ).toBeLessThanOrEqual((await tabs.boundingBox())!.y + 0.5);
    const read = await apiCall<{ timeZone: string }>(
      student,
      "GET",
      "/api/v1/auth/session",
    );
    expect(read.body.timeZone).toBe("America/Los_Angeles");
    // The next visit greets in the new zone: 18:00 in Los Angeles.
    await student.goto("/student/home");
    await expect(greeting(student)).toHaveText(
      `Chào buổi tối, ${created.student.fullName}`,
    );
    await context.close();
  });

  test("AC9: a 120-character name and a 40-character username wrap without a mid-word break or a horizontal scroll", async ({
    page,
    browser,
    consoleGuard,
  }, testInfo) => {
    await page.goto("/tutor/students");
    const t = token();
    const fullName = longData(t).guardianName;
    // Usernames are 3–40 characters (validation-rules): the longest one.
    const username = `e2e-long-${t}`.padEnd(40, "x");
    const { context, page: student } = await freshStudent(
      page,
      browser,
      consoleGuard,
      "Asia/Ho_Chi_Minh",
      {
        fullName,
        username,
      },
    );
    await student.goto("/student/account");
    await expect(nameBlock(student)).toContainText(fullName);
    const name = nameBlock(student).locator("dd").first();
    await expectNoMidWordBreak(name);
    await expect(nameBlock(student).locator("dd").nth(1)).toHaveText(username);
    await expectSettledAccessible(student);
    await shot(student, testInfo, "student-account-long");
    await student.goto("/student/home");
    await expect(greeting(student)).toContainText(fullName);
    await expectNoMidWordBreak(greeting(student));
    await expectSettledAccessible(student);
    await context.close();
  });
});

test.describe("the shared student", () => {
  test.use({ storageState: STUDENT_STATE });

  test("AC4: while the account read is pending and after a 500 the greeting has no name, no alert, the empty state", async ({
    page,
    consoleGuard,
  }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route(`**${ACCOUNT}`, async (route) => {
      await held;
      await route.fallback();
    });
    await page.goto("/student/home");
    await expect(h1(page, "Trang chủ")).toBeVisible();
    await expect(greeting(page)).toHaveText(/^Chào buổi (sáng|chiều|tối)!$/);
    await expect(page.getByRole("alert")).toHaveCount(0);
    release();
    await expect(greeting(page)).toHaveText(/^Chào buổi (sáng|chiều|tối), .+/);

    await page.unrouteAll({ behavior: "wait" });
    let failures = 0;
    await page.route(`**${ACCOUNT}`, (route) => {
      failures++;
      return route.fulfill({
        status: 500,
        contentType: "application/problem+json",
        body: '{"status":500}',
      });
    });
    await page.reload();
    await expect(h1(page, "Trang chủ")).toBeVisible();
    // The query's two retries (1 s, 2 s): the read has failed for good.
    await expect.poll(() => failures, { timeout: 10_000 }).toBe(3);
    await expect(greeting(page)).toHaveText(/^Chào buổi (sáng|chiều|tối)!$/);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Chưa có gì ở đây" }),
    ).toBeVisible();
    acceptStatus(consoleGuard, 500, ACCOUNT);
  });

  test("AC4: offline, Home shows the greeting without a name and sends nothing; the name comes back online", async ({
    page,
    context,
    consoleGuard,
  }) => {
    let reads = 0;
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === ACCOUNT) reads++;
    });
    // Home once (its code and fonts load), then another shell page, so going back to Home needs no download offline.
    await page.goto("/student/home");
    await expect(greeting(page)).toHaveText(/^Chào buổi (sáng|chiều|tối), .+/);
    await page.goto("/student/nope");
    await expect(h1(page, "Không tìm thấy trang")).toBeVisible();
    reads = 0;
    await context.setOffline(true);
    await page.getByRole("link", { name: "Về Trang chủ" }).click();
    await expect(h1(page, "Trang chủ")).toBeVisible();
    await expect(greeting(page)).toHaveText(/^Chào buổi (sáng|chiều|tối)!$/);
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(reads).toBe(0);
    await context.setOffline(false);
    await expect(greeting(page)).toHaveText(/^Chào buổi (sáng|chiều|tối), .+/);
    expect(reads).toBe(1);
    // Only a font the page asked for while offline (the browser's own log, not the product's).
    accept(consoleGuard, (e) =>
      /ERR_INTERNET_DISCONNECTED \[[^\]]+\.woff2?\]$/.test(e),
    );
  });

  test("AC5/AC9a: the account section links to Account (≤ 2 steps from Home and another page); focus on the h1", async ({
    page,
  }, testInfo) => {
    const log: Record<string, readonly string[]> = {};
    for (const from of ["/student/home", "/student/nope"]) {
      await page.goto(from);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const steps = new StepCounter();
      const place = accountPlace(page, "student");
      const dialog = await steps.step(
        place === "sheet" ? "More" : "account menu",
        () => openAccountSection(page, "student"),
      );
      const links = dialog.getByRole("link");
      await expect(links).toHaveText(["Tài khoản", "Đổi mật khẩu"]);
      await steps.step("Account", () =>
        dialog.getByRole("link", { name: "Tài khoản" }).click(),
      );
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page).toHaveURL(/\/student\/account$/);
      await expect(h1(page, "Tài khoản")).toBeFocused();
      await expect(page).toHaveTitle("Tài khoản · Eng-LMS");
      steps.expectAtMost(2);
      log[from] = steps.steps;
    }
    // The student nav stays Home (and More).
    const nav = page.getByRole("navigation", { name: "Điều hướng học viên" });
    await expect(nav.getByRole("link")).toHaveText(["Trang chủ"]);
    await evidenceRecord(testInfo, "ac9a-account-steps", log);
  });

  test("AC6: the page at the viewport; a failed name read: alert with Retry, the rest usable, Retry recovers, focus kept", async ({
    page,
    consoleGuard,
  }, testInfo) => {
    await page.goto("/student/account");
    await expect(h1(page, "Tài khoản")).toBeVisible();
    await expect(nameBlock(page)).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("radiogroup", { name: "Ngôn ngữ" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Đổi mật khẩu" }),
    ).toHaveAttribute("href", "/change-password");
    // UI rules: one column, at most 40rem.
    expect(
      (await page.getByRole("main").locator("section").boundingBox())!.width,
    ).toBeLessThanOrEqual(640.5);
    await expectSettledAccessible(page);
    await shot(page, testInfo, "student-account");

    await page.route(`**${ACCOUNT}`, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/problem+json",
        body: '{"status":500}',
      }),
    );
    await page.reload();
    const alert = page.getByRole("alert");
    await expect(alert).toHaveText(/Không tải được thông tin tài khoản\./, {
      timeout: 10_000,
    });
    await expect(timeZone(page)).toBeEnabled();
    await expectSettledAccessible(page);
    await shot(page, testInfo, "student-account-error");
    await page.unrouteAll({ behavior: "wait" });
    await alert.getByRole("button", { name: "Thử lại" }).click();
    await expect(nameBlock(page)).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    // Retry is replaced by the content: the block (tabIndex -1) holds focus (UI rules).
    await expect(page.locator('main div[tabindex="-1"]:has(dl)')).toBeFocused();
    await expectFocusNotLost(page);
    acceptStatus(consoleGuard, 500, ACCOUNT);
  });

  test("AC6: a 422 moves focus to the summary; a failed save shows the alert; leaving with a change asks first", async ({
    page,
    consoleGuard,
  }) => {
    await page.goto("/student/account");
    await expect(timeZone(page)).toBeVisible();
    await page.route(`**${PREFERENCES}`, (route) =>
      route.fulfill({
        status: 422,
        contentType: "application/problem+json",
        body: JSON.stringify({
          status: 422,
          code: "VALIDATION_FAILED",
          errors: [{ field: "timeZone", code: "INVALID_VALUE" }],
        }),
      }),
    );
    await timeZone(page).fill("bangkok");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await save(page).click();
    const summary = page.getByRole("alert", { name: "Chưa lưu được cài đặt" });
    await expect(summary).toBeFocused();
    await expect(
      summary.getByRole("link", {
        name: "Hãy chọn một múi giờ trong danh sách.",
      }),
    ).toBeVisible();
    await expectSettledAccessible(page);

    await page.unrouteAll({ behavior: "wait" });
    await page.route(`**${PREFERENCES}`, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/problem+json",
        body: '{"status":500}',
      }),
    );
    await save(page).click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Chưa lưu được cài đặt. Hãy thử lại." }),
    ).toBeVisible();

    // The unsaved change guards a navigation away.
    const wideBar = page.viewportSize()!.width >= 768;
    const home = wideBar
      ? page.getByRole("banner").getByRole("link", { name: "Trang chủ" })
      : page
          .locator("nav[data-bottom-tabs]")
          .getByRole("link", { name: "Trang chủ" });
    await home.click();
    await expect(
      page.getByRole("alertdialog", { name: "Bỏ các thay đổi?" }),
    ).toBeVisible();
    acceptStatus(consoleGuard, 422, PREFERENCES);
    acceptStatus(consoleGuard, 500, PREFERENCES);
  });
});
