import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  answerMembers,
  CAST_MEMBERS,
  manyMembers,
  memberList,
} from "../../../frontend/e2e/fixtures/admin-members";
import { expect, test } from "../../../frontend/e2e/fixtures/test";
import { AdminMembersPage } from "../../../frontend/e2e/page-objects/admin/members.page";
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
 * The screenshots of video 53: slice 26.1, Find members, in the running admin app. Each screen is
 * opened through its page object with the shared fixture, which answers every /api request
 * (Dana's staff session; the seven members of the mocks' cast in a community of 2,431, filtered
 * and paged as the API does; sixty members for the pages) and fails the take on a page error or a
 * request off localhost, as in every spec; no backend and no database ran. What each screen says
 * is checked before it is saved. The questions the app asked, the test counts and the bundle
 * sizes are what the fixture recorded and the runners and the build printed, captured with
 * `capture()`. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/53-slice-26-1-find-members` runs it.
 */

test.use({ baseURL: ADMIN_URL });

const name = (screen: string, size: Size, theme: Theme) =>
  `admin-${screen}-${size.toLowerCase()}-${theme}`;

test("the Members page lists the members, by tab", async ({ page, api }) => {
  answerMembers(api, CAST_MEMBERS, 2431);
  const members = new AdminMembersPage(page);
  const takes: [Size, Theme][] = [
    ["XL", "light"],
    ["M", "light"],
    ["XS", "light"],
    ["XL", "dark"],
  ];
  for (const [size, theme] of takes) {
    await frame(page, size, theme);
    await members.open();
    await expect(members.rows).toHaveCount(7);
    await expect(members.subtitle).toHaveText("2,431 members");
    await shot(page, name("members", size, theme));
    if (size === "XL" && theme === "light") {
      await detail(members.table, "admin-members-table", 12);
      capture("list", { rows: await members.rowTexts() });
    }
  }

  await frame(page, "M", "light");
  await members.open();
  await members.tab("Flagged").click();
  await expect(members.currentTab).toHaveText("Flagged");
  await expect(members.rows).toHaveCount(1);
  expect(members.location()).toBe("/members?status=flagged");
  await shot(page, name("members-flagged", "M", "light"));

  await frame(page, "XL", "light");
  await members.open("?status=suspended");
  await expect(members.currentTab).toHaveText("Suspended");
  expect(await members.names()).toEqual(["Tyler Simmons"]);
  await shot(page, name("members-suspended", "XL", "light"));
});

test("a search, a search nobody matches, and a status with nobody", async ({ page, api }) => {
  const asked = answerMembers(api, CAST_MEMBERS, 2431);
  const members = new AdminMembersPage(page);
  await frame(page, "XL", "light");

  await members.open();
  await expect(members.rows).toHaveCount(7);
  await members.type("grace");
  await expect(members.rows).toHaveCount(1);
  await expect.poll(() => members.location()).toBe("/members?q=grace");
  expect(asked).toEqual([
    { status: "all", q: null, page: null },
    { status: "all", q: "grace", page: null },
  ]);
  capture("asked", asked);
  await shot(page, name("members-search", "XL", "light"));

  await members.search.fill("");
  await members.type("Jessica");
  await expect(members.emptyTitle).toHaveText("No members match “Jessica”");
  await expect(members.clearSearchButton).toBeVisible();
  await members.search.blur();
  await shot(page, name("members-none", "XL", "light"));
  await detail(members.empty, "admin-members-none", 24);

  answerMembers(api, CAST_MEMBERS.filter((m) => m.status === "active"), 2431);
  await members.open("?status=flagged");
  await expect(members.emptyTitle).toHaveText("No flagged members");
  await shot(page, name("members-tab-empty", "XL", "light"));
});

test("sixty members in pages", async ({ page, api }) => {
  answerMembers(api, manyMembers(60));
  const members = new AdminMembersPage(page);

  await frame(page, "XL", "light");
  await members.open();
  await expect(members.rows).toHaveCount(25);
  await expect(members.paginationSummary).toHaveText("Showing 1–25 of 60 members");
  await members.pageLink(2).click();
  await expect(members.paginationSummary).toHaveText("Showing 26–50 of 60 members");
  await expect(members.currentPage).toHaveText("2");
  expect(members.location()).toBe("/members?page=2");
  await expect(members.tableRegion).toBeFocused();
  await members.pagination.scrollIntoViewIfNeeded();
  await shot(page, name("members-pages", "XL", "light"));
  await detail(members.pagination, "admin-members-pages", 20);

  await frame(page, "XS", "light");
  await members.open("?page=2");
  await expect(members.rows).toHaveCount(25);
  await members.pagination.scrollIntoViewIfNeeded();
  await shot(page, name("members-pages", "XS", "light"));
});

test("members loading, and members that do not load", async ({ page, api }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  api.on("GET", "/api/admin/members", async () => {
    await gate;
    return memberList(CAST_MEMBERS, { total: 2431 });
  });
  const members = new AdminMembersPage(page);
  await frame(page, "XL", "light");

  await members.open();
  await expect(members.loading).toBeVisible();
  await expect(members.skeletons).toHaveCount(35);
  await shot(page, name("members-loading", "XL", "light"));
  release();
  await expect(members.rows).toHaveCount(7);

  api.on("GET", "/api/admin/members", () => ({ abort: true }));
  await members.open();
  await expect(members.errorTitle).toHaveText("Members didn't load");
  await detail(members.error, "admin-members-error", 16);
});

test("what the runners and the build say", () => {
  test.setTimeout(600_000);
  const root = path.resolve(__dirname, "..", "..", "..");
  const run = (command: string, cwd: string) => {
    const result = spawnSync(command, { cwd, encoding: "utf8", shell: true });
    // eslint-disable-next-line no-control-regex
    return `${result.stdout}${result.stderr}`.replace(/\u001b\[[0-9;]*m/g, "");
  };

  const unit = run("npm test", path.join(root, "frontend"));
  // `npm test` runs the domain's tests, then the components'; the film shows both.
  const unitCounts = [...unit.matchAll(/Tests\s+(\d+) passed \((\d+)\)/g)].map((m) => Number(m[1]));
  expect(unitCounts.length, unit).toBe(2);
  capture("unit", { command: "npm test", passed: unitCounts.reduce((a, b) => a + b, 0) });

  const specs = run("npx playwright test --list", path.join(root, "frontend"));
  const specCount = /Total: (\d+) tests? in (\d+) files?/.exec(specs);
  expect(specCount, specs).not.toBeNull();
  const memberSpecs = (specs.match(/members\.spec\.ts/g) ?? []).length;
  expect(memberSpecs).toBeGreaterThan(20);
  capture("specs", {
    command: "npx playwright test --list",
    tests: Number(specCount![1]),
    members: memberSpecs,
  });

  const api = run('dotnet test --logger "console;verbosity=normal"', path.join(root, "backend"));
  const totals = [...api.matchAll(/Total tests: (\d+)\s+Passed: (\d+)/g)].map((m) => Number(m[2]));
  expect(totals.length, api).toBe(2);
  const members = (api.match(/Passed ChristianFitness\.\w+\.Tests\.Members\.(ListAdminMembersTests|SearchAdminMembersTests|MembersTelemetryTests|SearchMembersHandlerTests)\./g) ?? []).length;
  expect(members).toBeGreaterThan(60);
  capture("backend", {
    command: "dotnet test",
    passed: totals.reduce((a, b) => a + b, 0),
    members,
  });

  const build = run("npx ng build admin", path.join(root, "frontend"));
  const initial = /Initial total\s*\|\s*([\d.]+) kB\s*\|\s*([\d.]+) kB/.exec(build);
  expect(initial, build).not.toBeNull();
  const page = /members-page\s*\|\s*([\d.]+) kB/.exec(build);
  expect(page, build).not.toBeNull();
  capture("build", {
    command: "npx ng build admin",
    raw: Number(initial![1]),
    transfer: Number(initial![2]),
    page: Number(page![1]),
  });
});
