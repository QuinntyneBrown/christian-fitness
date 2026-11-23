import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  expect,
  MODERATOR_SIGNED_IN,
  STAFF_SIGNED_IN,
  test,
  type ApiHandlers,
} from "../../../frontend/e2e/fixtures/test";
import { AdminShell } from "../../../frontend/e2e/page-objects/admin/admin-shell.page";
import { AdminForbiddenPage } from "../../../frontend/e2e/page-objects/admin/forbidden.page";
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
 * The screenshots of video 12: slice 29.1, Admin and Moderator roles, in the running admin app.
 * Each screen is opened through its page object with the shared fixture, which answers every /api
 * request (Joel's Moderator session, or Dana's Admin session until her role becomes Moderator)
 * and fails the take on a page error or a request off localhost, as in every spec; no backend and
 * no database ran. What each screen says is checked before it is saved. The test counts, the API
 * tests' names and the initial total are what the runners and the build printed, captured with
 * `capture()`. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/12-slice-29-1-admin-and-moderator-roles` runs it.
 */

test.use({ baseURL: ADMIN_URL });

const name = (screen: string, size: Size, theme: Theme) =>
  `admin-${screen}-${size.toLowerCase()}-${theme}`;

const TAKES: [Size, Theme][] = [
  ["XL", "light"],
  ["M", "light"],
  ["XS", "light"],
  ["XL", "dark"],
];

function signedInAsModerator(api: ApiHandlers): void {
  api.on("GET", "/api/admin/session", () => ({ json: MODERATOR_SIGNED_IN }));
}

test("a Moderator's navigation lists the Dashboard and Members", async ({ page, api }) => {
  signedInAsModerator(api);
  const shell = new AdminShell(page);
  for (const [size, theme] of TAKES) {
    await frame(page, size, theme);
    await shell.open("/");
    await expect(shell.heading).toHaveText("Dashboard");
    await expect(shell.navItems).toHaveText(["Dashboard", "Members"]);
    await shot(page, name("moderator", size, theme));
    if (size === "XL" && theme === "light") {
      await expect(shell.userRole).toHaveText("Moderator");
      await detail(shell.sidebar, "admin-moderator-sidebar", 0);
      capture("moderator", {
        items: await shell.navItems.allInnerTexts(),
        role: await shell.userRole.innerText(),
      });
    }
  }
});

test("Events by its address shows Admins only", async ({ page, api }) => {
  signedInAsModerator(api);
  const forbidden = new AdminForbiddenPage(page);
  const shell = new AdminShell(page);
  for (const [size, theme] of TAKES) {
    await frame(page, size, theme);
    await shell.open("/events");
    await expect(forbidden.heading).toHaveText("Admins only");
    await expect(forbidden.heading).toBeFocused();
    await expect(forbidden.dashboardLink).toHaveText("Go to dashboard");
    expect(forbidden.location()).toBe("/events");
    expect(await forbidden.title()).toBe("Admins only · Christian Fitness Admin");
    await shot(page, name("admins-only", size, theme));
    if (size === "XL" && theme === "light") {
      await detail(forbidden.card, "admin-admins-only-card", 16);
      capture("adminsOnly", { location: forbidden.location(), title: await forbidden.title() });
    }
  }
});

test("an Admin made Moderator meets the new role on the next move", async ({ page, api }) => {
  let demoted = false;
  api.on("GET", "/api/admin/session", () => ({
    json: demoted ? MODERATOR_SIGNED_IN : STAFF_SIGNED_IN,
  }));
  const shell = new AdminShell(page);
  const forbidden = new AdminForbiddenPage(page);
  await frame(page, "XL", "light");
  await shell.open("/");
  await expect(shell.navItems).toHaveText(["Dashboard", "Events", "Services", "Members"]);
  await shot(page, name("admin", "XL", "light"));
  await detail(shell.sidebar, "admin-admin-sidebar", 0);
  demoted = true;
  await shell.navItem("Services").click();
  await expect(forbidden.heading).toHaveText("Admins only");
  expect(forbidden.location()).toBe("/services");
  await shot(page, name("demoted", "XL", "light"));
  capture("demoted", { location: forbidden.location() });
});

test("what the runners and the build say", () => {
  test.setTimeout(400_000);
  const root = path.resolve(__dirname, "..", "..", "..");
  const run = (command: string, cwd: string) => {
    const result = spawnSync(command, { cwd, encoding: "utf8", shell: true });
    // eslint-disable-next-line no-control-regex
    return `${result.stdout}${result.stderr}`.replace(/\u001b\[[0-9;]*m/g, "");
  };

  const unit = run("npm test", path.join(root, "frontend"));
  const unitCount = /Tests\s+(\d+) passed \((\d+)\)/.exec(unit);
  expect(unitCount, unit).not.toBeNull();
  capture("unit", { command: "npm test", passed: Number(unitCount![1]) });

  const specs = run("npx playwright test --list", path.join(root, "frontend"));
  const specCount = /Total: (\d+) tests? in (\d+) files?/.exec(specs);
  expect(specCount, specs).not.toBeNull();
  capture("specs", { command: "npx playwright test --list", tests: Number(specCount![1]) });

  const api = run('dotnet test --logger "console;verbosity=normal"', path.join(root, "backend"));
  const totals = [...api.matchAll(/Total tests: (\d+)\s+Passed: (\d+)/g)].map((m) => Number(m[2]));
  expect(totals.length, api).toBe(2);
  const rows = [
    ...api.matchAll(
      /Passed ChristianFitness\.Api\.Tests\.Admin\.StaffRoleTests\.\w+\(who: "([\w.]+)", role: (\w+), path: "([^"]+)", expected: (\w+)\)/g,
    ),
  ].map((m) => ({ who: m[1], role: m[2], path: m[3], expected: m[4] }));
  expect(rows.length, api).toBe(12);
  const access = [
    ...api.matchAll(/Passed ChristianFitness\.Application\.Tests\.Members\.StaffAccessTests\.\w+\(/g),
  ].length;
  expect(access, api).toBe(12);
  capture("backend", {
    command: "dotnet test",
    passed: totals.reduce((a, b) => a + b, 0),
    rows,
    access,
  });

  const build = run("npx ng build admin", path.join(root, "frontend"));
  const initial = /Initial total\s*\|\s*([\d.]+) kB\s*\|\s*([\d.]+) kB/.exec(build);
  expect(initial, build).not.toBeNull();
  capture("build", {
    command: "npx ng build admin",
    raw: Number(initial![1]),
    transfer: Number(initial![2]),
  });
});
