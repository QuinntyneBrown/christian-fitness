import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "../../../frontend/e2e/fixtures/test";
import { FULL_PROFILE, TODAY } from "../../../frontend/e2e/fixtures/profiles";
import { AdminShell } from "../../../frontend/e2e/page-objects/admin/admin-shell.page";
import { WebHomePage } from "../../../frontend/e2e/page-objects/web/home.page";
import { WebJoinPage } from "../../../frontend/e2e/page-objects/web/join.page";
import { WebMemberShell } from "../../../frontend/e2e/page-objects/web/member-shell.page";
import { WebProfilePage } from "../../../frontend/e2e/page-objects/web/profile.page";
import { WebSignInPage } from "../../../frontend/e2e/page-objects/web/sign-in.page";
import {
  ADMIN_URL,
  capture,
  detail,
  frame,
  shot,
  type Size,
  type Theme,
} from "../../../tools/video-record/shots";

/**
 * The screenshots of video 57: slice 1.6, Design-system layout, navigation and migration, in the
 * running member and admin apps. Every screen shown is now composed of library components: the
 * member shell's skip link and top bar, the admin layout's skip link and sidebar navigation, the
 * profile's container, split, stack, profile hero, tag list and lists, its skeleton region and
 * empty state, Sign in's alert and links, and Join's interest list. Each screen is opened through
 * its page object with the shared fixture, which answers every /api request (Grace's session and
 * profile, a held profile, a 404, a refused sign-in, Dana's staff session) and fails the take on a
 * page error or a request off localhost, as in every spec; no backend and no database ran. What
 * each screen says is checked before it is saved. The library's folders, the test counts and both
 * initial totals are what the file system, the runners and the build said, captured with
 * `capture()`. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/57-slice-1-6-design-system-layout-navigation-and-migration`
 * runs it.
 */

const root = path.resolve(__dirname, "..", "..", "..");
const library = path.join(root, "frontend", "projects", "components", "src");
const web = (screen: string, size: Size, theme: Theme) =>
  `web-${screen}-${size.toLowerCase()}-${theme}`;
const admin = (screen: string, size: Size, theme: Theme) =>
  `admin-${screen}-${size.toLowerCase()}-${theme}`;

/** Grace's profile with the mocks' photos for her two events, served at a local path for the take. */
const PROFILE = {
  ...FULL_PROFILE,
  upcomingEvents: [
    { ...FULL_PROFILE.upcomingEvents[0], imageUrl: "/film-media/run.jpg" },
    { ...FULL_PROFILE.upcomingEvents[1], imageUrl: "/film-media/hoops.jpg" },
  ],
};

async function servePhotos(page: Page): Promise<void> {
  await page.route("**/film-media/*.jpg", (route) =>
    route.fulfill({
      contentType: "image/jpeg",
      body: readFileSync(
        path.join(root, "docs/mocks/assets/images", path.basename(new URL(route.request().url()).pathname)),
      ),
    }),
  );
}

/** The screen-specific components this slice removed, and what replaced each (ADR 0019). */
const REMOVED: [string, string][] = [
  ["form-alert", "alert"],
  ["text-link", "link"],
  ["tag-list", "chip"],
  ["auth-brand", "brand-lockup"],
  ["app-header", "top-bar"],
  ["admin-nav", "sidebar-navigation"],
  ["admin-user", "sidebar-navigation"],
  ["admin-layout", "layout"],
  ["staff-layout", "layout"],
  ["profile-skeleton", "skeleton"],
  ["empty-inline", "empty-state"],
  ["error-state", "empty-state"],
  ["going-list", "list"],
  ["interest-picker", "chip"],
];

/** The design-system pages this slice builds. */
const BUILT = ["layout", "top-bar", "footer", "sidebar-navigation", "tab-bar", "breadcrumb"];

test("the member shell: the skip link, then the top bar", async ({ page }) => {
  const home = new WebHomePage(page);
  const shell = new WebMemberShell(page);
  await frame(page, "XL", "light");
  await home.open();
  await expect(home.greeting).toHaveText("Welcome, Grace");
  await shell.press("Tab");
  await expect(shell.skipLink).toBeFocused();
  await shot(page, web("skip-link", "XL", "light"));
  await shell.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await detail(shell.header, "web-top-bar", 0);
});

test("the profile, composed of library components", async ({ page, api }) => {
  await servePhotos(page);
  await page.clock.setFixedTime(TODAY);
  api.on("GET", "/api/profile/me", () => ({ json: PROFILE }));
  const profile = new WebProfilePage(page);
  const takes: [Size, Theme][] = [
    ["XL", "light"],
    ["XS", "light"],
    ["XL", "dark"],
  ];
  for (const [size, theme] of takes) {
    await frame(page, size, theme);
    await profile.open();
    await expect(profile.heading).toHaveText("Grace Thompson");
    await expect(profile.tags).toHaveText(["Running", "Strength", "Basketball", "Nutrition"]);
    await expect(profile.goingItems).toHaveCount(2);
    await shot(page, web("profile", size, theme));
  }

  let answer!: () => void;
  const answered = new Promise<void>((resolve) => (answer = resolve));
  api.on("GET", "/api/profile/me", async () => {
    await answered;
    return { json: PROFILE };
  });
  await frame(page, "XS", "light");
  await profile.open();
  await expect(profile.loadingHeading).toBeAttached();
  await shot(page, web("loading", "XS", "light"));
  answer();

  api.on("GET", "/api/profile/me", () => ({
    status: 404,
    headers: { "content-type": "application/problem+json" },
    json: { status: 404, code: "not_found" },
  }));
  await frame(page, "XL", "light");
  await profile.open();
  await expect(profile.errorTitle).toHaveText("Your profile didn't load");
  await detail(profile.error, "web-error", 20);
});

test("sign in's alert and join's interest list", async ({ page, api }) => {
  api.on("POST", "/api/session", () => ({
    status: 401,
    headers: { "content-type": "application/problem+json" },
    json: { status: 401, code: "invalid_credentials" },
  }));
  const signIn = new WebSignInPage(page);
  await frame(page, "XL", "light");
  await signIn.open();
  await signIn.fill("grace.thompson@gmail.com", "not-her-password");
  await signIn.submitAndAwaitAnswer();
  await expect(signIn.alertTitle).toHaveText("Email or password is incorrect");
  await expect(signIn.alert).toHaveAttribute("role", "alert");
  await detail(signIn.form, "web-sign-in-alert", 16);

  const join = new WebJoinPage(page);
  await frame(page, "XS", "light");
  await join.open();
  await join.choose("Running", "Mobility");
  await expect(join.interest("Running")).toHaveAttribute("aria-pressed", "true");
  await join.interestPicker.scrollIntoViewIfNeeded();
  await shot(page, web("join-interests", "XS", "light"));
});

test.describe("the admin layout: the skip link and the sidebar navigation", () => {
  test.use({ baseURL: ADMIN_URL });

  test("at every width, and dark", async ({ page }) => {
    const shell = new AdminShell(page);
    const takes: [Size, Theme][] = [
      ["XL", "light"],
      ["M", "light"],
      ["XS", "light"],
      ["XL", "dark"],
    ];
    for (const [size, theme] of takes) {
      await frame(page, size, theme);
      await shell.open("/events");
      await expect(shell.heading).toHaveText("Events");
      await expect(shell.currentItem).toHaveText("Events");
      expect(await shell.navIsOneRow()).toBe(size !== "XL");
      expect(await shell.pageOverflowX()).toBe(0);
      await shot(page, admin("events", size, theme));
    }
    await frame(page, "XL", "light");
    await shell.open("/events");
    await expect(shell.heading).toHaveText("Events");
    await shell.press("Tab");
    await expect(shell.skipLink).toBeFocused();
    await shot(page, admin("skip-link", "XL", "light"));
  });
});

test("what the library, the runners and the build say", () => {
  test.setTimeout(600_000);
  const run = (command: string, cwd: string) => {
    const result = spawnSync(command, { cwd, encoding: "utf8", shell: true, maxBuffer: 64 * 1024 * 1024 });
    // eslint-disable-next-line no-control-regex
    const said = `${result.stdout}${result.stderr}`.replace(/\u001b\[[0-9;]*m/g, "");
    if (result.status !== 0) throw new Error(`${command} failed:\n${said}`);
    return said;
  };

  const folders = readdirSync(library, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const pages = readdirSync(path.join(root, "docs", "design-system", "components"))
    .filter((file) => file.endsWith(".html"))
    .map((file) => file.replace(/\.html$/, ""));
  for (const [gone, now] of REMOVED) {
    expect(existsSync(path.join(library, gone)), `${gone} removed`).toBe(false);
    expect(folders, `${now} built`).toContain(now);
  }
  for (const name of BUILT) expect(folders, `${name} built`).toContain(name);
  const extra = folders.filter((folder) => !pages.includes(folder));
  expect(extra, "the only folder without a design-system page").toEqual(["profile-hero"]);
  capture("library", {
    removed: REMOVED,
    built: BUILT,
    folders: folders.length,
    pages: pages.length,
    composite: extra[0],
  });

  const unit = run("npm test", path.join(root, "frontend"));
  const counts = [...unit.matchAll(/Tests\s+(\d+) passed \((\d+)\)/g)].map((m) => Number(m[1]));
  expect(counts.length, unit).toBe(2);
  capture("unit", { command: "npm test", domain: counts[0], components: counts[1] });

  const specs = run("npx playwright test --list", path.join(root, "frontend"));
  const specCount = /Total: (\d+) tests? in (\d+) files?/.exec(specs);
  expect(specCount, specs).not.toBeNull();
  capture("specs", { command: "npx playwright test --list", tests: Number(specCount![1]) });

  const build = run("npm run build", path.join(root, "frontend"));
  const totals = [...build.matchAll(/Initial total\s*\|\s*([\d.]+) kB\s*\|\s*([\d.]+) kB/g)].map(
    (m) => Number(m[1]),
  );
  expect(totals.length, build).toBe(2);
  capture("build", { command: "npm run build", web: totals[0], admin: totals[1] });
});
