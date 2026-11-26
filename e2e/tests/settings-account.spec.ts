import type { BrowserContext, Page, Request, Route } from "@playwright/test";
import { ANONYMOUS, apiCall, apiSignIn, TUTOR_STATE } from "../support/auth";
import {
  expectFocusNotLost,
  expectNoHorizontalScroll,
  expectNoMidWordBreak,
  expectSettledAccessible,
} from "../support/checks";
import { evidenceRecord } from "../support/evidence";
import {
  answerPreferencesInPlace,
  expect,
  guardContext,
  test,
} from "../support/fixtures";
import { longData } from "../support/longData";
import { openAccountSection } from "../support/shell";
import {
  acceptStatus,
  apiStudent,
  h1,
  navItem,
  profileStudent,
  shot,
  studentSession,
  token,
} from "../support/students";

// T-M2.6 (Settings › Account, the account's language and time zone) at the mandatory viewports: AC5–AC10.
// Data hygiene (packet Design notes): the three projects, and the gate's ×3 repeats, run this file in parallel workers, so
// a real write of the shared tutor's display name or time zone would race with another copy's (seen: AC9 read another
// copy's zone). The tutor's preferences therefore live in each page (`isolate`: the session read and the preferences save
// answered here, from the real session); the server is never written for the tutor. The real endpoint is exercised on
// fresh students (AC8: locale and time zone saved, read back and applied) and by the global setup's reset.

test.describe.configure({ mode: "serial" });
// The fresh students' contexts are not the fixture's; the tutor's page answers its own saves (`isolate`).
test.use({ storageState: TUTOR_STATE, realPreferences: true });

const PATH = "/tutor/settings/account";
const PREFERENCES = "/api/v1/auth/preferences";
const DEFAULTS = { timeZone: "Asia/Ho_Chi_Minh", displayName: null };

const displayName = (page: Page) =>
  page.getByRole("textbox", { name: "Tên hiển thị" });
const timeZone = (page: Page) =>
  page.getByRole("combobox", { name: "Múi giờ" });
const save = (page: Page) =>
  page.getByRole("main").getByRole("button", { name: /^(Lưu|Đang lưu…)$/ });
const options = (page: Page) => page.getByRole("listbox").getByRole("option");

/** The bodies of the preferences PATCHes `target` sends from now on. */
function recordPreferences(target: Page | BrowserContext) {
  const sent: unknown[] = [];
  target.on("request", (request: Request) => {
    if (
      request.method() === "PATCH" &&
      new URL(request.url()).pathname === PREFERENCES
    )
      sent.push(request.postDataJSON());
  });
  return sent;
}

async function openAccount(page: Page) {
  await page.goto(PATH);
  await expect(h1(page, "Cài đặt")).toBeVisible();
  await expect(displayName(page)).toBeVisible();
}

/** The tutor's preferences in this page only, starting from the defaults (see the header). */
async function isolate(page: Page) {
  const state: Record<string, unknown> = { ...DEFAULTS };
  const answer = async (route: Route) => {
    const url = new URL("/api/v1/auth/session", route.request().url()).href;
    const response = await route.fetch({ url, method: "GET", postData: "" });
    if (response.status() !== 200) return route.fulfill({ response });
    await route.fulfill({ json: { ...(await response.json()), ...state } });
  };
  await page.route("**/api/v1/auth/session", answer);
  await page.route("**/api/v1/auth/preferences", async (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    Object.assign(state, route.request().postDataJSON());
    await answer(route);
  });
}

test.beforeEach(({ page }) => isolate(page));

test.describe("AC5: Settings in the tutor shell", () => {
  // T-M2.35: the Settings item now lands on the Workspace tab (its step budget and the redirect: settings-workspace.spec);
  // the Account tab is one more click on "Tài khoản".
  test("Settings, then the Account tab: /tutor/settings/account; focus on the h1; both current; the title", async ({
    page,
  }) => {
    await page.goto("/tutor/today");
    await expect(h1(page, "Hôm nay")).toBeVisible();
    await (await navItem(page, "Cài đặt")).click();
    await expect(page).toHaveURL(/\/tutor\/settings\/workspace$/);
    const tabs = page.getByRole("navigation", { name: "Các mục cài đặt" });
    await tabs.getByRole("link", { name: "Tài khoản" }).click();
    await expect(page).toHaveURL(/\/tutor\/settings\/account$/);
    await expect(h1(page, "Cài đặt")).toBeFocused();
    await expect(page).toHaveTitle("Cài đặt tài khoản · Eng-LMS");
    await expect(tabs.getByRole("link", { name: "Tài khoản" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(await navItem(page, "Cài đặt")).toHaveAttribute(
      "aria-current",
      "page",
    );
    if (page.viewportSize()!.width < 1024) await page.keyboard.press("Escape");
    await expectSettledAccessible(page);
  });

  test("keyboard: the Settings item (sidebar) and the tab are in the Tab order", async ({
    page,
  }) => {
    test.skip(
      page.viewportSize()!.width < 1024,
      "the sidebar exists at ≥ 1024 px; the drawer is a dialog (shells.spec)",
    );
    await page.goto("/tutor/today");
    await expect(h1(page, "Hôm nay")).toBeVisible();
    const item = page
      .getByRole("navigation", { name: "Điều hướng gia sư" })
      .getByRole("link", { name: "Cài đặt" });
    for (
      let i = 0;
      i < 12 && !(await item.evaluate((el) => el === document.activeElement));
      i++
    )
      await page.keyboard.press("Tab");
    await expect(item).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(h1(page, "Cài đặt")).toBeFocused();
    // T-M2.35: the tabs are Workspace, Account.
    const tabs = page.getByRole("navigation", { name: "Các mục cài đặt" });
    await page.keyboard.press("Tab");
    await expect(
      tabs.getByRole("link", { name: "Không gian làm việc" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(tabs.getByRole("link", { name: "Tài khoản" })).toBeFocused();
  });
});

test.describe("AC6, AC10: the Account page", () => {
  test("loads the saved values; Save sends only what changed, toasts, keeps focus; long data at the viewport", async ({
    page,
  }, testInfo) => {
    const sent = recordPreferences(page);
    await openAccount(page);
    // T-M2.35 AC8: a visible "Ngôn ngữ" label names the switcher group.
    const language = page
      .getByRole("main")
      .getByRole("radiogroup", { name: "Ngôn ngữ" });
    await expect(language).toBeVisible();
    const label = page.getByRole("main").getByText("Ngôn ngữ", { exact: true });
    await expect(label).toBeVisible();
    await expect(language).toHaveAttribute(
      "aria-labelledby",
      (await label.getAttribute("id"))!,
    );
    expect(
      (await label.boundingBox())!.y,
      "the label above the group",
    ).toBeLessThan((await language.boundingBox())!.y);
    await shot(page, testInfo, "settings-account-label");
    await expect(displayName(page)).toHaveValue("");
    await expect(timeZone(page)).toHaveValue("Asia/Ho_Chi_Minh");
    await expect(save(page)).toHaveAttribute("aria-disabled", "true");
    await expectSettledAccessible(page);
    await shot(page, testInfo, "settings-account-default");

    // UI rules: one column, at most 40rem.
    const form = page.getByRole("form", { name: "Thông tin tài khoản" });
    expect((await form.boundingBox())!.width).toBeLessThanOrEqual(640.5);

    await displayName(page).fill("  Cô Lan E2E ");
    await expect(save(page)).not.toHaveAttribute("aria-disabled");
    await save(page).click();
    await expect(page.getByRole("region", { name: "Thông báo" })).toContainText(
      "Đã lưu",
    );
    expect(sent).toEqual([{ displayName: "Cô Lan E2E" }]);
    await expect(save(page)).toHaveAttribute("aria-disabled", "true");
    await expect(save(page)).toBeFocused();
    await expectFocusNotLost(page);
    await expect(displayName(page)).toHaveValue("Cô Lan E2E");
    const session = await apiCall<{ displayName: string; timeZone: string }>(
      page,
      "GET",
      "/api/v1/auth/session",
    );
    expect(session.body).toMatchObject({
      displayName: "Cô Lan E2E",
      timeZone: "Asia/Ho_Chi_Minh",
    });

    // Emptying it clears it (null); the shell shows the username again.
    await displayName(page).fill("");
    await save(page).click();
    await expect.poll(() => sent.length).toBe(2);
    expect(sent[1]).toEqual({ displayName: null });
    await expect(save(page)).toHaveAttribute("aria-disabled", "true");
  });

  test("a long display name (120 characters, served by this page only) wraps at spaces in the shell", async ({
    page,
  }, testInfo) => {
    const long = longData(token()).guardianName;
    // The shared account keeps its short name: the session is answered here with the long one.
    await page.route("**/api/v1/auth/session", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: { ...(await response.json()), displayName: long },
      });
    });
    await openAccount(page);
    await expect(displayName(page)).toHaveValue(long);
    await expectNoHorizontalScroll(page);
    if (page.viewportSize()!.width < 1024) {
      const drawer = await openAccountSection(page, "tutor");
      const signedIn = drawer.getByText(/^Đã đăng nhập:/);
      await expectNoMidWordBreak(signedIn);
      await expectSettledAccessible(page);
      await shot(page, testInfo, "settings-account-long-name-drawer");
    } else {
      await expect(
        page
          .getByRole("banner")
          .locator('button[aria-haspopup="dialog"] [title]'),
      ).toHaveAttribute("title", long);
    }
  });

  // AC11 (a) (G3 QA-1): the client's own failure focuses the summary in a real browser too, by a click and by Enter.
  test("a client error (121 characters): Save, clicked or by Enter, moves focus to the summary; nothing is sent", async ({
    page,
  }, testInfo) => {
    const sent = recordPreferences(page);
    await openAccount(page);
    await displayName(page).fill("a".repeat(121));
    await save(page).click();
    const summary = page
      .getByRole("alert")
      .filter({ hasText: "Chưa lưu được cài đặt" });
    await expect(summary).toBeFocused();
    await expect(summary.getByRole("link")).toHaveText([
      "Tên hiển thị tối đa 120 ký tự.",
    ]);
    await expectSettledAccessible(page);
    await shot(page, testInfo, "settings-account-client-error");
    await displayName(page).press("Enter");
    await expect(summary).toBeFocused();
    await expect(displayName(page)).toHaveAttribute("aria-invalid", "true");
    expect(sent).toEqual([]);
  });

  // T-M2.33 AC6: the client rule names the invisible character it found, in the field and in the summary.
  test("a name with U+200B: the field and the summary name U+200B; nothing is sent", async ({
    page,
  }, testInfo) => {
    const sent = recordPreferences(page);
    await openAccount(page);
    await displayName(page).fill("Cô\u200BLan");
    await save(page).click();
    const message =
      "Tên này chứa ký tự ẩn hoặc ký tự điều khiển (U+200B). Hãy xoá ký tự đó và gõ lại tên.";
    const summary = page
      .getByRole("alert")
      .filter({ hasText: "Chưa lưu được cài đặt" });
    await expect(summary).toBeFocused();
    await expect(summary.getByRole("link")).toHaveText([message]);
    await expect(displayName(page)).toHaveAttribute("aria-invalid", "true");
    await expect(displayName(page)).toHaveAccessibleDescription(
      new RegExp(message.replace(/[.()+]/g, "\\$&")),
    );
    expect(sent).toEqual([]);
    await expectSettledAccessible(page);
    await shot(page, testInfo, "settings-account-invisible-character");
  });

  test("a 422 shows each field problem in the summary (focused) and on the fields; leaving asks first", async ({
    page,
    consoleGuard,
  }, testInfo) => {
    // A value the client accepts but the server refuses cannot be typed (the rules match), so the 422 is answered here.
    await page.route("**/api/v1/auth/preferences", (route) =>
      route.fulfill({
        status: 422,
        contentType: "application/problem+json",
        json: {
          type: "about:blank",
          title: "Validation failed",
          status: 422,
          code: "VALIDATION_FAILED",
          requestId: "e2e",
          errors: [
            { field: "displayName", code: "INVALID_FORMAT" },
            { field: "timeZone", code: "INVALID_VALUE" },
          ],
        },
      }),
    );
    await openAccount(page);
    await displayName(page).fill("Cô Lan");
    await save(page).click();
    const summary = page
      .getByRole("alert")
      .filter({ hasText: "Chưa lưu được cài đặt" });
    await expect(summary).toBeFocused();
    await expect(summary.getByRole("link")).toHaveText([
      "Tên này chứa ký tự ẩn hoặc ký tự điều khiển. Hãy xoá ký tự đó và gõ lại tên.",
      "Hãy chọn một múi giờ trong danh sách.",
    ]);
    await expect(displayName(page)).toHaveAttribute("aria-invalid", "true");
    await expect(timeZone(page)).toHaveAttribute("aria-invalid", "true");
    acceptStatus(consoleGuard, 422, PREFERENCES);
    await expectSettledAccessible(page);
    await shot(page, testInfo, "settings-account-error");
    // A summary link moves focus to its field.
    await summary
      .getByRole("link", { name: "Hãy chọn một múi giờ trong danh sách." })
      .click();
    await expect(timeZone(page)).toBeFocused();

    // The form still holds the unsaved name: leaving asks first (the unsaved-changes guard).
    await (await navItem(page, "Hôm nay")).click();
    const dialog = page.getByRole("alertdialog", { name: "Bỏ các thay đổi?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Bỏ thay đổi" }).click();
    await expect(h1(page, "Hôm nay")).toBeVisible();
  });
});

test.describe("AC7: the time-zone ComboBox", () => {
  test("keyboard: filter, arrows, Enter; Escape returns focus; at most 50 options; no long task over 200 ms", async ({
    page,
  }, testInfo) => {
    const sent = recordPreferences(page);
    await openAccount(page);
    const input = timeZone(page);
    await input.click();
    await page.keyboard.press("ControlOrMeta+a");
    // AC7 timing on the Chromium phone-small project: every long task while typing "ho" and the list updating.
    const timing = testInfo.project.name === "phone-small";
    if (timing) {
      await page.evaluate(() => {
        const w = window as unknown as { __longTasks: number[] };
        w.__longTasks = [];
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            w.__longTasks.push(entry.duration);
        }).observe({ type: "longtask" });
      });
      // The observer is seen red first (coding-agent-rules §4.5): a 250 ms busy task is recorded, then the record is cleared.
      // A page task (a timer), not the evaluate itself: work run by the evaluate call is not reported as a long task.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            setTimeout(() => {
              const end = performance.now() + 250;
              while (performance.now() < end);
              resolve();
            }),
          ),
      );
      await expect
        .poll(() =>
          page.evaluate(() =>
            Math.max(
              0,
              ...(window as unknown as { __longTasks: number[] }).__longTasks,
            ),
          ),
        )
        .toBeGreaterThan(200);
      await page.evaluate(
        () =>
          ((window as unknown as { __longTasks: number[] }).__longTasks = []),
      );
    }
    await page.keyboard.type("ho");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await expect(options(page).first()).toBeVisible();
    await expect.poll(() => options(page).count()).toBeGreaterThan(0);
    expect(await options(page).count(), "rendered options").toBeLessThanOrEqual(
      50,
    );
    if (timing) {
      // Two frames after the list shows: the observer has delivered the tasks of the typing and the render.
      await page.evaluate(
        () =>
          new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r)),
          ),
      );
      const tasks = await page.evaluate(
        () => (window as unknown as { __longTasks: number[] }).__longTasks,
      );
      await evidenceRecord(testInfo, "ac7-longtasks-typing-ho", {
        tasks,
        max: Math.max(0, ...tasks),
      });
      expect(
        Math.max(0, ...tasks),
        `long tasks while typing "ho": ${tasks.join(", ")}`,
      ).toBeLessThan(200);
    }
    // The popover: below the field, the field's width (UI rules).
    const field = await input.locator("..").boundingBox();
    const popover = await page.getByRole("listbox").locator("..").boundingBox();
    expect(
      Math.abs(popover!.width - field!.width),
      "the field width",
    ).toBeLessThanOrEqual(2);
    // Below the field, or above it when there is no room below (the field sits low on these viewports).
    const below = popover!.y >= field!.y + field!.height - 1;
    const above = popover!.y + popover!.height <= field!.y + 1;
    expect(
      below || above,
      `beside the field: popover ${JSON.stringify(popover)}, field ${JSON.stringify(field)}`,
    ).toBe(true);
    await expectNoHorizontalScroll(page);
    await shot(page, testInfo, "settings-account-combobox-open");
    // AC11 (e): axe with the list open. DEC-191: only aria-hidden-focus is off (React Aria hides the page outside the popover).
    await expectSettledAccessible(page, {
      disableRules: ["aria-hidden-focus"],
    });
    await expect(
      page.getByRole("listbox", { name: "Các múi giờ" }),
    ).toBeVisible();

    // Narrow to one zone, arrow to it, Enter.
    await page.keyboard.type("nolulu");
    await expect(options(page)).toHaveText(["Pacific/Honolulu"]);
    await page.keyboard.press("ArrowDown");
    const option = page.getByRole("option", { name: "Pacific/Honolulu" });
    await expect(input).toHaveAttribute(
      "aria-activedescendant",
      (await option.getAttribute("id"))!,
    );
    await page.keyboard.press("Enter");
    await expect(input).toHaveValue("Pacific/Honolulu");
    await expect(page.getByRole("listbox")).toHaveCount(0);

    // Escape closes the list, focus stays on the input, the choice is kept.
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("lond");
    await expect(options(page)).toHaveText(["Europe/London"]);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("Pacific/Honolulu");

    // The whole list from the button: still at most 50 rendered.
    await page
      .getByRole("main")
      .locator('button[aria-haspopup="listbox"]')
      .click();
    await expect(options(page).first()).toBeVisible();
    expect(
      await options(page).count(),
      "rendered options of the whole list",
    ).toBeLessThanOrEqual(50);
    await page.keyboard.press("Escape");

    await save(page).click();
    await expect(page.getByRole("region", { name: "Thông báo" })).toContainText(
      "Đã lưu",
    );
    expect(sent).toEqual([{ timeZone: "Pacific/Honolulu" }]);
    await expectSettledAccessible(page);
  });
});

test.describe("AC8: the switcher and the account locale", () => {
  test("the tutor: a switch sends PATCH {locale} (answered here) and the device language changes", async ({
    page,
  }) => {
    const sent: unknown[] = [];
    await page.route("**/api/v1/auth/preferences", async (route) => {
      sent.push(route.request().postDataJSON());
      const session = await apiCall<Record<string, unknown>>(
        page,
        "GET",
        "/api/v1/auth/session",
      );
      await route.fulfill({
        json: { ...session.body, ...route.request().postDataJSON() },
      });
    });
    await openAccount(page);
    await page
      .getByRole("main")
      .getByRole("radio", { name: "English" })
      .click();
    await expect(h1(page, "Settings")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect.poll(() => sent).toEqual([{ locale: "en" }]);
    const session = await apiCall<{ locale: string }>(
      page,
      "GET",
      "/api/v1/auth/session",
    );
    expect(session.body.locale, "the shared account keeps vi").toBe("vi");
  });

  test("must change the password: the switch on /change-password sends nothing", async ({
    page,
    browser,
    consoleGuard,
  }) => {
    const created = await profileStudent(page, "Ngôn Ngữ Đổi");
    const context = await browser.newContext({ storageState: ANONYMOUS });
    await guardContext(context, consoleGuard);
    const sent = recordPreferences(context);
    const student = await context.newPage();
    await student.goto("/login");
    const signedIn = await apiSignIn(student, {
      username: created.credentials.username,
      password: created.credentials.temporaryPassword,
    });
    expect(signedIn.body.mustChangePassword).toBe(true);
    await student.goto("/change-password");
    await expect(h1(student, "Đổi mật khẩu")).toBeVisible();
    await student.getByRole("radio", { name: "English" }).click();
    await expect(h1(student, "Change password")).toBeVisible();
    // Nothing to wait for: the switch would have sent at once; the tab reloads to prove the device choice stayed alone.
    await student.reload();
    await expect(h1(student, "Change password")).toBeVisible();
    expect(sent).toEqual([]);
    await context.close();
  });

  test("a fresh student whose locale is en: English on a device without a choice; a stored choice wins", async ({
    consoleGuard,
    page,
    browser,
  }) => {
    const created = await profileStudent(page, "Ngôn Ngữ Anh");
    const {
      context,
      page: student,
      credentials,
    } = await studentSession(browser, created, consoleGuard);
    // The real endpoint: the locale and a time zone saved, the session body back, a new read the same.
    const saved = await apiCall<{ locale: string; timeZone: string }>(
      student,
      "PATCH",
      PREFERENCES,
      {
        locale: "en",
        timeZone: "Pacific/Kiritimati",
      },
    );
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({
      locale: "en",
      timeZone: "Pacific/Kiritimati",
    });
    const read = await apiCall(student, "GET", "/api/v1/auth/session");
    expect(read.body).toMatchObject({
      locale: "en",
      timeZone: "Pacific/Kiritimati",
    });
    await student.goto("/student/home");
    await expect(h1(student, "Home")).toBeVisible();
    await expect(student.locator("html")).toHaveAttribute("lang", "en");
    expect(
      await student.evaluate(() => localStorage.getItem("englms.locale")),
    ).toBe("en");
    await context.close();

    const origin = new URL(page.url()).origin;
    const stored = await browser.newContext({
      storageState: {
        cookies: [],
        origins: [
          { origin, localStorage: [{ name: "englms.locale", value: "vi" }] },
        ],
      },
    });
    await guardContext(stored, consoleGuard);
    const again = await stored.newPage();
    await again.goto("/login");
    expect((await apiSignIn(again, credentials)).status).toBe(200);
    await again.goto("/student/home");
    await expect(h1(again, "Trang chủ")).toBeVisible();
    expect(
      await again.evaluate(() => localStorage.getItem("englms.locale")),
    ).toBe("vi");
    await stored.close();
  });

  test("the suite helper answers the PATCH in place (the server keeps vi); without it the save is real", async ({
    consoleGuard,
    page,
    browser,
  }) => {
    const created = await profileStudent(page, "Ngôn Ngữ Trợ");
    const locale = async (context: BrowserContext, answered: boolean) => {
      if (answered) await answerPreferencesInPlace(context);
      const student = await context.newPage();
      await student.goto("/student/home");
      await expect(h1(student, "Trang chủ")).toBeVisible();
      const answer = student.waitForResponse(
        (r) => new URL(r.url()).pathname === PREFERENCES,
      );
      const dialog = await openAccountSection(student, "student");
      await dialog.getByRole("radio", { name: "English" }).click();
      expect((await answer).status()).toBe(200);
      expect(((await (await answer).json()) as { locale: string }).locale).toBe(
        "en",
      );
      const session = await apiCall<{ locale: string }>(
        student,
        "GET",
        "/api/v1/auth/session",
      );
      await student.evaluate(() => localStorage.setItem("englms.locale", "vi"));
      return session.body.locale;
    };
    const first = await studentSession(browser, created, consoleGuard);
    expect(await locale(first.context, true), "answered in place").toBe("vi");
    await first.context.close();
    // A second device of the same student without the helper: the save reaches the server.
    const second = await browser.newContext({ storageState: ANONYMOUS });
    await guardContext(second, consoleGuard);
    const page2 = await second.newPage();
    await page2.goto("/login");
    expect((await apiSignIn(page2, first.credentials)).status).toBe(200);
    await page2.close();
    expect(await locale(second, false), "the helper off: the real save").toBe(
      "en",
    );
    await second.close();
  });
});

test.describe("AC9: dates in the account time zone", () => {
  test("a student created now shows a date one day later in Pacific/Kiritimati than in Pacific/Honolulu", async ({
    page,
  }, testInfo) => {
    await page.goto("/tutor/today");
    const created = await apiStudent(page, {
      fullName: `Múi Giờ ${token()}`,
      username: `e2e-tz-${token()}`,
    });
    const addedOn = async (zone: string) => {
      expect(
        (await apiCall(page, "PATCH", PREFERENCES, { timeZone: zone })).status,
      ).toBe(200);
      await page.goto(`/tutor/students/${created.student.id}`);
      await expect(h1(page, created.student.fullName)).toBeVisible();
      const value = page
        .getByRole("region", { name: "Thông tin cá nhân" })
        .locator('dt:has-text("Ngày thêm") + dd');
      const text = (await value.textContent())!.trim();
      expect(text).toMatch(/^\d\d\/\d\d\/\d{4}$/);
      const [d, m, y] = text.split("/").map(Number) as [number, number, number];
      return { text, utcDay: Date.UTC(y, m - 1, d) / 86_400_000 };
    };
    const kiritimati = await addedOn("Pacific/Kiritimati");
    const honolulu = await addedOn("Pacific/Honolulu");
    await evidenceRecord(testInfo, "ac9-added-on", {
      kiritimati: kiritimati.text,
      honolulu: honolulu.text,
    });
    expect(
      kiritimati.utcDay - honolulu.utcDay,
      `${kiritimati.text} vs ${honolulu.text}`,
    ).toBe(1);
  });
});
