import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "../../../frontend/e2e/fixtures/test";
import { FULL_PROFILE, NEW_PROFILE, TODAY } from "../../../frontend/e2e/fixtures/profiles";
import { WebHomePage } from "../../../frontend/e2e/page-objects/web/home.page";
import { WebMemberShell } from "../../../frontend/e2e/page-objects/web/member-shell.page";
import { WebProfilePage } from "../../../frontend/e2e/page-objects/web/profile.page";
import {
  bringToTop,
  capture,
  detail,
  frame,
  shot,
  type Size,
  type Theme,
} from "../../../tools/video-record/shots";

/**
 * The screenshots of video 26: slice 18.1, View my profile, in the running member app. Each screen
 * is opened through its page object with the shared fixture, which answers every /api request
 * (the session, `GET /api/profile/me` with the e2e profiles, a held answer, a 404) and fails the
 * take on a page error or a request off localhost, as in every spec; no backend and no database
 * ran. The events' pictures are the mocks' photos, served at a local path for the take only.
 * What each screen says is checked before it is saved. The counts, the API tests' names and the
 * initial total are what the runners and the build printed, captured with `capture()`. Not a test
 * and not a sweep: only `node tools/video-record/record.mjs docs/videos/26-slice-18-1-view-my-profile`
 * runs it.
 */

const root = path.resolve(__dirname, "..", "..", "..");
const name = (screen: string, size: Size, theme: Theme) =>
  `web-${screen}-${size.toLowerCase()}-${theme}`;

/** Grace's profile with the mocks' photos for her two events. */
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

test("the profile, and the avatar that opens it", async ({ page, api }) => {
  await servePhotos(page);
  await page.clock.setFixedTime(TODAY);
  api.on("GET", "/api/profile/me", () => ({ json: PROFILE }));
  const home = new WebHomePage(page);
  const profile = new WebProfilePage(page);
  const shell = new WebMemberShell(page);

  await frame(page, "XL", "light");
  await home.open();
  await expect(shell.profileButton).toHaveText("GT");
  await detail(shell.header, "web-header-home", 0);
  await shell.openProfile();
  await expect(profile.heading).toHaveText("Grace Thompson");
  await expect(shell.profileButton).toHaveAttribute("aria-current", "page");
  await detail(shell.header, "web-header-profile", 0);

  const takes: [Size, Theme][] = [
    ["XL", "light"],
    ["M", "light"],
    ["XS", "light"],
    ["XL", "dark"],
  ];
  for (const [size, theme] of takes) {
    await frame(page, size, theme);
    await profile.open();
    await expect(profile.meta).toHaveText("Member since January 2026");
    await expect(profile.goingItems).toHaveCount(2);
    await expect(profile.tags).toHaveText(["Running", "Strength", "Basketball", "Nutrition"]);
    await shot(page, name("profile", size, theme));
  }
  await frame(page, "XL", "light");
  await profile.open();
  await expect(profile.goingItems).toHaveCount(2);
  await detail(profile.going, "web-going", 20);
  capture("profile", { rows: await profile.goingRows() });
});

test("a new profile", async ({ page, api }) => {
  await page.clock.setFixedTime(TODAY);
  api.on("GET", "/api/profile/me", () => ({ json: NEW_PROFILE }));
  const profile = new WebProfilePage(page);
  for (const size of ["XS", "XL"] as Size[]) {
    await frame(page, size, "light");
    await profile.open();
    await expect(profile.meta).toHaveText("Member since today");
    await expect(profile.browseEventsLink).toHaveAttribute("href", "/events");
    await shot(page, name("new", size, "light"));
  }
  await frame(page, "XL", "light");
  await profile.open();
  await expect(profile.goingEmpty).toBeVisible();
  await detail(profile.going, "web-new-going", 20);
  await frame(page, "XS", "light");
  await profile.open();
  await expect(profile.goingEmpty).toBeVisible();
  await bringToTop(profile.going, 72);
  await shot(page, "web-new-going-xs-light");
});

test("loading, and a profile that does not load", async ({ page, api }) => {
  await servePhotos(page);
  let answer!: () => void;
  const answered = new Promise<void>((resolve) => (answer = resolve));
  api.on("GET", "/api/profile/me", async () => {
    await answered;
    return { json: PROFILE };
  });
  const profile = new WebProfilePage(page);
  for (const size of ["XL", "XS"] as Size[]) {
    await frame(page, size, "light");
    await profile.open();
    await expect(profile.loadingHeading).toBeAttached();
    await shot(page, name("loading", size, "light"));
  }
  answer();

  api.on("GET", "/api/profile/me", () => ({
    status: 404,
    headers: { "content-type": "application/problem+json" },
    json: { status: 404, code: "not_found" },
  }));
  for (const size of ["XL", "XS"] as Size[]) {
    await frame(page, size, "light");
    await profile.open();
    await expect(profile.errorTitle).toHaveText("Your profile didn't load");
    await shot(page, name("error", size, "light"));
  }
  await frame(page, "XL", "light");
  await detail(profile.error, "web-error", 20);
});

test("what the runners and the build say", () => {
  test.setTimeout(400_000);
  const run = (command: string, cwd: string) => {
    const result = spawnSync(command, { cwd, encoding: "utf8", shell: true });
    // eslint-disable-next-line no-control-regex
    return `${result.stdout}${result.stderr}`.replace(/\u001b\[[0-9;]*m/g, "");
  };

  const unit = run("npm test", path.join(root, "frontend"));
  const unitCount = /Tests\s+(\d+) passed \((\d+)\)/.exec(unit);
  expect(unitCount, unit).not.toBeNull();
  capture("unit", { command: "npm test", passed: Number(unitCount![1]), total: Number(unitCount![2]) });

  const specs = run("npx playwright test --list", path.join(root, "frontend"));
  const specCount = /Total: (\d+) tests? in (\d+) files?/.exec(specs);
  expect(specCount, specs).not.toBeNull();
  capture("specs", { command: "npx playwright test --list", tests: Number(specCount![1]), files: Number(specCount![2]) });

  const api = run('dotnet test --logger "console;verbosity=normal"', path.join(root, "backend"));
  const totals = [...api.matchAll(/Total tests: (\d+)\s+Passed: (\d+)/g)].map((m) => Number(m[2]));
  expect(totals.length, api).toBe(2);
  const names = (cls: string) => [
    ...new Set(
      [...api.matchAll(new RegExp(`Passed ChristianFitness\\.\\w+\\.Tests\\.[\\w.]+\\.${cls}\\.(\\w+)`, "g"))].map((m) =>
        m[1].replaceAll("_", " "),
      ),
    ),
  ];
  const own = names("OwnProfileTests");
  const telemetry = names("ProfileTelemetryTests");
  expect(own.length).toBeGreaterThan(0);
  expect(telemetry.length).toBeGreaterThan(0);
  capture("backend", { command: "dotnet test", passed: totals.reduce((a, b) => a + b, 0), own, telemetry });

  const build = run("npx ng build web", path.join(root, "frontend"));
  const initial = /Initial total\s*\|\s*([\d.]+) kB\s*\|\s*([\d.]+) kB/.exec(build);
  expect(initial, build).not.toBeNull();
  capture("build", { command: "npx ng build web", raw: Number(initial![1]), transfer: Number(initial![2]) });
});
