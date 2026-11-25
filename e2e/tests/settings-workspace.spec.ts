import type { Page, Route } from "@playwright/test";
import { TUTOR_STATE } from "../support/auth";
import {
  expectFocusNotLost,
  expectNoMidWordBreak,
  expectSettledAccessible,
} from "../support/checks";
import { evidenceRecord } from "../support/evidence";
import { expect, test } from "../support/fixtures";
import { longData } from "../support/longData";
import { StepCounter } from "../support/steps";
import { acceptStatus, h1, navItem, shot, token } from "../support/students";

// T-M2.35 (Settings › Workspace, FR-SET-01) at the mandatory viewports: AC6, AC7, AC9.
// Data hygiene (scope 9): the workspace document is shared by every spec and the suite runs in parallel, so this file
// never writes it: `GET` / `PATCH /tutor/settings` and the name in `GET /meta` are answered in the page from a local
// document (the request bodies are asserted). The real round trip, `/meta` and the student defaults are the BE
// integration tests'.

test.use({ storageState: TUTOR_STATE });

const PATH = "/tutor/settings/workspace";
const SETTINGS = "/api/v1/tutor/settings";

const name = (page: Page) =>
  page.getByRole("textbox", { name: "Tên không gian làm việc (bắt buộc)" });
const zone = (page: Page) =>
  page.getByRole("combobox", { name: "Múi giờ mặc định" });
const languages = (page: Page) =>
  page.getByRole("radiogroup", { name: "Ngôn ngữ mặc định" });
const save = (page: Page) =>
  page.getByRole("main").getByRole("button", { name: /^(Lưu|Đang lưu…)$/ });
const summary = (page: Page) =>
  page.getByRole("alert").filter({ hasText: "Chưa lưu được cài đặt" });
const conflictDialog = (page: Page) =>
  page.getByRole("alertdialog", { name: "Đã có thay đổi ở nơi khác" });

interface Doc {
  displayName: string;
  defaultLocale: string;
  defaultTimeZone: string;
  version: number;
  updatedAt: string;
}

/**
 * The workspace document of this page only (see the header): `GET` answers it, `PATCH` applies the body (or answers
 * `next`, once, when set) and bumps the version, `/meta` carries its name. `sent` holds the PATCH bodies.
 */
async function isolate(page: Page, initial: Partial<Doc> = {}) {
  const doc: Doc = {
    displayName: "Lớp tiếng Anh E2E",
    defaultLocale: "vi",
    defaultTimeZone: "Asia/Ho_Chi_Minh",
    version: 4,
    updatedAt: "2026-11-25T00:00:00Z",
    ...initial,
  };
  const sent: Record<string, unknown>[] = [];
  const control = {
    doc,
    sent,
    next: null as null | ((route: Route) => Promise<void>),
  };
  await page.route(`**${SETTINGS}`, async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: doc });
    if (route.request().method() !== "PATCH") return route.fallback();
    const body = route.request().postDataJSON() as Record<string, unknown>;
    sent.push(body);
    const answer = control.next;
    if (answer) {
      control.next = null;
      return answer(route);
    }
    const { version: _version, ...changes } = body;
    Object.assign(doc, changes, { version: doc.version + 1 });
    await route.fulfill({ json: doc });
  });
  await page.route("**/api/v1/meta", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: { ...(await response.json()), displayName: doc.displayName },
    });
  });
  return control;
}

const problem =
  (status: number, code: string, errors: unknown[] = []) =>
  (route: Route) =>
    route.fulfill({
      status,
      contentType: "application/problem+json",
      json: {
        type: "about:blank",
        title: code,
        status,
        code,
        requestId: "e2e",
        errors,
      },
    });

async function openWorkspace(page: Page) {
  await page.goto(PATH);
  await expect(h1(page, "Cài đặt")).toBeVisible();
  await expect(name(page)).toBeVisible();
}

/** The shell's workspace name: the banner's home link. */
const shellName = (page: Page, text: string) =>
  page.getByRole("banner").getByRole("link", { name: text, exact: true });

test.describe("AC6: Settings lands on the Workspace tab", () => {
  test("the Settings item opens /tutor/settings → Workspace in ≤ 2 steps; focus on the h1; tabs and title", async ({
    page,
  }, testInfo) => {
    await isolate(page);
    await page.goto("/tutor/today");
    await expect(h1(page, "Hôm nay")).toBeVisible();
    const steps = new StepCounter();
    // Below 1024 px the item sits in the drawer (one step to open it, counted).
    const item = await (page.viewportSize()!.width < 1024
      ? steps.step("open the navigation drawer", () => navItem(page, "Cài đặt"))
      : navItem(page, "Cài đặt"));
    await expect(item).toHaveAttribute("href", "/tutor/settings");
    await steps.step("choose Settings", () => item.click());
    await expect(page).toHaveURL(/\/tutor\/settings\/workspace$/);
    await expect(h1(page, "Cài đặt")).toBeFocused();
    steps.expectAtMost(2);
    await expect(page).toHaveTitle("Cài đặt không gian làm việc · Eng-LMS");
    const tabs = page.getByRole("navigation", { name: "Các mục cài đặt" });
    await expect(tabs.getByRole("link")).toHaveText([
      "Không gian làm việc",
      "Tài khoản",
    ]);
    await expect(
      tabs.getByRole("link", { name: "Không gian làm việc" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      tabs.getByRole("link", { name: "Tài khoản" }),
    ).not.toHaveAttribute("aria-current");
    await expect(await navItem(page, "Cài đặt")).toHaveAttribute(
      "aria-current",
      "page",
    );
    if (page.viewportSize()!.width < 1024) await page.keyboard.press("Escape");
    await expect(name(page)).toBeVisible();
    await expectSettledAccessible(page);
    await evidenceRecord(testInfo, "ac6-settings-steps", {
      steps: steps.steps,
    });

    // The address itself redirects too.
    await page.goto("/tutor/settings");
    await expect(page).toHaveURL(/\/tutor\/settings\/workspace$/);
    await expect(h1(page, "Cài đặt")).toBeVisible();
  });
});

test.describe("AC7, AC9: the Workspace form", () => {
  test("loads the values; Save sends version + only the changes; toast, focus on Save; the shell name updates", async ({
    page,
  }, testInfo) => {
    const ws = await isolate(page);
    await openWorkspace(page);
    await expect(name(page)).toHaveValue("Lớp tiếng Anh E2E");
    await expect(zone(page)).toHaveValue("Asia/Ho_Chi_Minh");
    await expect(
      languages(page).getByRole("radio", { name: "Tiếng Việt" }),
    ).toHaveAttribute("aria-checked", "true");
    await expect(
      page.getByText("Áp dụng cho học viên thêm từ nay về sau."),
    ).toBeVisible();
    await expect(save(page)).toHaveAttribute("aria-disabled", "true");
    await expectSettledAccessible(page);
    await shot(page, testInfo, "settings-workspace-default");
    // UI rules: one column, at most 40rem.
    const form = page.getByRole("form", {
      name: "Thông tin không gian làm việc",
    });
    expect((await form.boundingBox())!.width).toBeLessThanOrEqual(640.5);

    await name(page).fill("  Lớp cô Lan E2E ");
    await expect(save(page)).not.toHaveAttribute("aria-disabled");
    await save(page).click();
    await expect(page.getByRole("region", { name: "Thông báo" })).toContainText(
      "Đã lưu",
    );
    expect(ws.sent).toEqual([{ version: 4, displayName: "Lớp cô Lan E2E" }]);
    await expect(save(page)).toHaveAttribute("aria-disabled", "true");
    await expect(save(page)).toBeFocused();
    await expectFocusNotLost(page);
    // The shell shows the new name without a reload (its /meta is not read again: the cache was updated).
    await expect(shellName(page, "Lớp cô Lan E2E")).toBeVisible();

    // The defaults: the next save carries the new version and only them; the UI language stays.
    await languages(page).getByRole("radio", { name: "English" }).click();
    await zone(page).click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("nolulu");
    await expect(page.getByRole("listbox").getByRole("option")).toHaveText([
      "Pacific/Honolulu",
    ]);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(zone(page)).toHaveValue("Pacific/Honolulu");
    await save(page).click();
    await expect.poll(() => ws.sent.length).toBe(2);
    expect(ws.sent[1]).toEqual({
      version: 5,
      defaultLocale: "en",
      defaultTimeZone: "Pacific/Honolulu",
    });
    await expect(save(page)).toHaveAttribute("aria-disabled", "true");
    await expect(h1(page, "Cài đặt")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  });

  test("a client error (empty name), clicked or by Enter, focuses the summary; a server 422 shows every field", async ({
    page,
    consoleGuard,
  }, testInfo) => {
    const ws = await isolate(page);
    await openWorkspace(page);
    await name(page).fill("");
    await save(page).click();
    await expect(summary(page)).toBeFocused();
    await expect(summary(page).getByRole("link")).toHaveText([
      "Hãy nhập tên không gian làm việc.",
    ]);
    await name(page).fill("a".repeat(121));
    await name(page).press("Enter");
    await expect(summary(page)).toBeFocused();
    await expect(summary(page).getByRole("link")).toHaveText([
      "Tên không gian làm việc tối đa 120 ký tự.",
    ]);
    expect(ws.sent).toEqual([]);

    // A value the client accepts but the server refuses: answered here.
    ws.next = problem(422, "VALIDATION_FAILED", [
      { field: "displayName", code: "INVALID_FORMAT" },
      { field: "defaultTimeZone", code: "INVALID_VALUE" },
    ]);
    await name(page).fill("Lớp cô Lan");
    await save(page).click();
    await expect(summary(page)).toBeFocused();
    await expect(summary(page).getByRole("link")).toHaveText([
      "Tên này chứa ký tự ẩn hoặc ký tự điều khiển. Hãy xoá ký tự đó và gõ lại tên.",
      "Hãy chọn một múi giờ trong danh sách.",
    ]);
    await expect(name(page)).toHaveAttribute("aria-invalid", "true");
    await expect(zone(page)).toHaveAttribute("aria-invalid", "true");
    expect(ws.sent).toEqual([{ version: 4, displayName: "Lớp cô Lan" }]);
    acceptStatus(consoleGuard, 422, SETTINGS);
    await expectSettledAccessible(page);
    await shot(page, testInfo, "settings-workspace-error");
    await summary(page)
      .getByRole("link", { name: "Hãy chọn một múi giờ trong danh sách." })
      .click();
    await expect(zone(page)).toBeFocused();

    // The form still holds the unsaved name: leaving asks first.
    await (await navItem(page, "Hôm nay")).click();
    const dialog = page.getByRole("alertdialog", { name: "Bỏ các thay đổi?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Bỏ thay đổi" }).click();
    await expect(h1(page, "Hôm nay")).toBeVisible();
  });

  // T-M2.33 AC6: the client rule names the invisible character it found, in the field and in the summary.
  test("a name with U+200B: the field and the summary name U+200B; nothing is sent", async ({
    page,
  }, testInfo) => {
    const ws = await isolate(page);
    await openWorkspace(page);
    await name(page).fill("Lớp\u200Bcô Lan");
    await save(page).click();
    const message =
      "Tên này chứa ký tự ẩn hoặc ký tự điều khiển (U+200B). Hãy xoá ký tự đó và gõ lại tên.";
    await expect(summary(page)).toBeFocused();
    await expect(summary(page).getByRole("link")).toHaveText([message]);
    await expect(name(page)).toHaveAttribute("aria-invalid", "true");
    await expect(name(page)).toHaveAccessibleDescription(
      new RegExp(message.replace(/[.()+]/g, "\\$&")),
    );
    expect(ws.sent).toEqual([]);
    await expectSettledAccessible(page);
    await shot(page, testInfo, "settings-workspace-invisible-character");
  });

  test("a 409: the conflict dialog; Keep editing returns to the field; Reload shows the stored values, focus on Save", async ({
    page,
    consoleGuard,
  }, testInfo) => {
    const ws = await isolate(page);
    await openWorkspace(page);
    // Another tab saved meanwhile.
    Object.assign(ws.doc, { displayName: "Tên ở tab khác", version: 5 });
    ws.next = problem(409, "STALE_VERSION");
    await name(page).fill("Lớp cô Lan");
    await save(page).click();
    await expect(conflictDialog(page)).toBeVisible();
    await expect(conflictDialog(page)).toContainText(
      "Cài đặt không gian làm việc vừa được thay đổi",
    );
    await expect(
      conflictDialog(page).getByRole("button", { name: "Tiếp tục sửa" }),
    ).toBeFocused();
    acceptStatus(consoleGuard, 409, SETTINGS);
    await expectSettledAccessible(page);
    await shot(page, testInfo, "settings-workspace-conflict");
    await conflictDialog(page)
      .getByRole("button", { name: "Tiếp tục sửa" })
      .click();
    await expect(conflictDialog(page)).toHaveCount(0);
    await expect(name(page)).toBeFocused();
    await expect(name(page)).toHaveValue("Lớp cô Lan");

    ws.next = problem(409, "STALE_VERSION");
    await save(page).click();
    await conflictDialog(page).getByRole("button", { name: "Tải lại" }).click();
    await expect(name(page)).toHaveValue("Tên ở tab khác");
    await expect(save(page)).toBeFocused();
    await expect(save(page)).toHaveAttribute("aria-disabled", "true");
    acceptStatus(consoleGuard, 409, SETTINGS);
    // Saving again uses the reloaded version.
    await name(page).fill("Lớp cô Lan");
    await save(page).click();
    await expect(page.getByRole("region", { name: "Thông báo" })).toContainText(
      "Đã lưu",
    );
    expect(ws.sent).toEqual([
      { version: 4, displayName: "Lớp cô Lan" },
      { version: 4, displayName: "Lớp cô Lan" },
      { version: 5, displayName: "Lớp cô Lan" },
    ]);
  });

  test("the time-zone ComboBox open: field width, axe (DEC-191 exception only), Vietnamese names", async ({
    page,
  }, testInfo) => {
    await isolate(page);
    await openWorkspace(page);
    await zone(page).click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("ho");
    await expect(zone(page)).toHaveAttribute("aria-expanded", "true");
    await expect(
      page
        .getByRole("listbox", { name: "Các múi giờ" })
        .getByRole("option")
        .first(),
    ).toBeVisible();
    const field = await zone(page).locator("..").boundingBox();
    const popover = await page.getByRole("listbox").locator("..").boundingBox();
    expect(
      Math.abs(popover!.width - field!.width),
      "the field width",
    ).toBeLessThanOrEqual(2);
    // The list is at most 50 vh (the popover adds its border).
    const list = await page.getByRole("listbox").boundingBox();
    expect(list!.height, "at most 50 vh").toBeLessThanOrEqual(
      page.viewportSize()!.height / 2 + 0.5,
    );
    await shot(page, testInfo, "settings-workspace-combobox-open");
    await expectSettledAccessible(page, {
      disableRules: ["aria-hidden-focus"],
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(zone(page)).toBeFocused();
    await expectSettledAccessible(page);
  });

  test("a 120-character workspace name (this page only): the field, the shell and the page keep their width", async ({
    page,
  }, testInfo) => {
    const long = longData(token()).guardianName;
    await isolate(page, { displayName: long });
    await openWorkspace(page);
    await expect(name(page)).toHaveValue(long);
    await expectSettledAccessible(page);
    await expectNoMidWordBreak(
      page.getByText("Hiện ở trang đăng nhập và trên thanh menu."),
    );
    await expectNoMidWordBreak(
      page.getByText("Áp dụng cho học viên thêm từ nay về sau."),
    );
    // The shell keeps its clamp (WorkspaceName): the full name is the link's title.
    await expect(shellName(page, long)).toHaveAttribute("title", long);
    await shot(page, testInfo, "settings-workspace-long-name");
  });
});
