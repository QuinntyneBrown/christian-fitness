import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  expect,
  STAFF_SIGNED_IN,
  test,
  type ApiHandlers,
  type ApiReply,
} from "../../../frontend/e2e/fixtures/test";
import { AdminShell } from "../../../frontend/e2e/page-objects/admin/admin-shell.page";
import { AdminForbiddenPage } from "../../../frontend/e2e/page-objects/admin/forbidden.page";
import { AdminStaffSignInPage } from "../../../frontend/e2e/page-objects/admin/staff-sign-in.page";
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
 * The screenshots of video 11: slice 9.3, Idle expiry and forbidden, in the running admin app.
 * Each screen is opened through its page object with the shared fixture, which answers every /api
 * request (Dana's staff session until it expires, then 401 session_expired; 403 not_staff once her
 * role is taken away; 204 for signing out; 429 too_many_attempts for a paused sign-in) and fails
 * the take on a page error or a request off localhost, as in every spec; no backend and no
 * database ran. What each screen says is checked before it is saved. The test counts, the API
 * tests' names and the initial total are what the runners and the build printed, captured with
 * `capture()`. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/11-slice-9-3-idle-expiry-and-forbidden` runs it.
 */

test.use({ baseURL: ADMIN_URL });

const name = (screen: string, size: Size, theme: Theme) =>
  `admin-${screen}-${size.toLowerCase()}-${theme}`;

function problem(status: number, code: string): ApiReply {
  return {
    status,
    headers: { "content-type": "application/problem+json" },
    json: { status, code },
  };
}

/** Dana's session, answered until `end()`, then as `status` with `code`. */
function sessionUntil(api: ApiHandlers, status: number, code: string): () => void {
  let ended = false;
  api.on("GET", "/api/admin/session", () =>
    ended ? problem(status, code) : { json: STAFF_SIGNED_IN },
  );
  return () => (ended = true);
}

test("an idle session expires and staff are told why", async ({ page, api }) => {
  const shell = new AdminShell(page);
  const signIn = new AdminStaffSignInPage(page);
  const takes: [Size, Theme][] = [
    ["XL", "light"],
    ["M", "light"],
    ["XS", "light"],
    ["XL", "dark"],
  ];
  for (const [size, theme] of takes) {
    const expire = sessionUntil(api, 401, "session_expired");
    await frame(page, size, theme);
    await shell.open("/");
    await expect(shell.heading).toHaveText("Dashboard");
    if (size === "XL" && theme === "light") await shot(page, name("dashboard", size, theme));
    expire();
    await shell.navItem("Events").click();
    await expect(signIn.alertTitle).toHaveText("Your session expired");
    await expect(signIn.alertText).toHaveText(
      "You were signed out after 30 minutes without activity. Sign in again to carry on.",
    );
    await expect(signIn.alert).toBeFocused();
    expect(signIn.location()).toBe("/sign-in");
    await signIn.alert.blur();
    await shot(page, name("sign-in-expired", size, theme));
    if (size === "XL" && theme === "light") {
      await detail(signIn.alert, "admin-sign-in-expired", 12);
      capture("expired", { asked: "/events", landed: signIn.location() });
    }
  }
});

test("a read refused 403 shows Staff only, and Sign out", async ({ page, api }) => {
  const shell = new AdminShell(page);
  const forbidden = new AdminForbiddenPage(page);
  const signIn = new AdminStaffSignInPage(page);
  const takes: [Size, Theme][] = [
    ["XL", "light"],
    ["M", "light"],
    ["XS", "light"],
    ["XL", "dark"],
  ];
  for (const [size, theme] of takes) {
    const remove = sessionUntil(api, 403, "not_staff");
    await frame(page, size, theme);
    await shell.open("/");
    await expect(shell.heading).toHaveText("Dashboard");
    remove();
    await shell.navItem("Members").click();
    await expect(forbidden.heading).toHaveText("Staff only");
    await expect(forbidden.heading).toBeFocused();
    expect(forbidden.location()).toBe("/members");
    expect(await forbidden.title()).toBe("Staff only · Christian Fitness Admin");
    await shot(page, name("forbidden", size, theme));
    if (size === "XL" && theme === "light") {
      capture("forbidden", { location: forbidden.location(), title: await forbidden.title() });
    }
  }

  // Held until the shot of "Signing out…" is saved.
  let answer!: () => void;
  const answered = new Promise<void>((resolve) => (answer = resolve));
  api.on("DELETE", "/api/admin/session", async () => {
    await answered;
    return { status: 204 };
  });
  await frame(page, "XL", "light");
  await forbidden.signOut();
  await expect(forbidden.signOutButton).toHaveText("Signing out…");
  await expect(forbidden.signOutButton).toBeDisabled();
  await detail(forbidden.card, "admin-forbidden-busy", 16);
  answer();
  await expect(signIn.heading).toHaveText("Staff sign in");
  expect(signIn.location()).toBe("/sign-in");
});

test("five failed sign-ins pause staff sign-in", async ({ page, api }) => {
  const signIn = new AdminStaffSignInPage(page);
  api.on("GET", "/api/admin/session", () => problem(401, "unauthenticated"));
  api.on("POST", "/api/admin/session", () => problem(429, "too_many_attempts"));
  for (const size of ["XL", "XS"] as Size[]) {
    await frame(page, size, "light");
    await signIn.open();
    await signIn.fill("dana@christianfitness.ca", "abundantlife");
    await signIn.submitAndAwaitAnswer();
    await expect(signIn.alertTitle).toHaveText("Sign-in paused for 15 minutes");
    await expect(signIn.alert).toBeFocused();
    await expect(signIn.submitButton).toBeEnabled();
    await signIn.alert.blur();
    await shot(page, name("sign-in-paused", size, "light"));
    if (size === "XL") await detail(signIn.alert, "admin-sign-in-paused", 12);
  }
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
  const names = (cls: string) => [
    ...new Set(
      [
        ...api.matchAll(
          new RegExp(`Passed ChristianFitness\\.\\w+\\.Tests\\.[\\w.]+\\.${cls}\\.(\\w+)`, "g"),
        ),
      ].map((m) => m[1].replaceAll("_", " ")),
    ),
  ];
  const idle = names("StaffIdleExpiryTests");
  const lockout = names("StaffSignInLockoutTests");
  expect(idle.length).toBe(4);
  expect(lockout.length).toBe(5);
  capture("backend", {
    command: "dotnet test",
    passed: totals.reduce((a, b) => a + b, 0),
    idle,
    lockout,
  });

  const build = run("npx ng build admin", path.join(root, "frontend"));
  const initial = /Initial total\s*\|\s*([\d.]+) kB\s*\|\s*([\d.]+) kB/.exec(build);
  expect(initial, build).not.toBeNull();
  const chunk = /forbidden-page\s*\|\s*([\d.]+) kB/.exec(build);
  expect(chunk, build).not.toBeNull();
  capture("build", {
    command: "npx ng build admin",
    raw: Number(initial![1]),
    transfer: Number(initial![2]),
    forbidden: Number(chunk![1]),
  });
});
