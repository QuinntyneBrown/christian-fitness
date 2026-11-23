import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  expect,
  STAFF_SIGNED_IN,
  test,
  XSRF_TOKEN,
  type ApiReply,
} from "../../../frontend/e2e/fixtures/test";
import { AdminShell } from "../../../frontend/e2e/page-objects/admin/admin-shell.page";
import { AdminServerErrorPage } from "../../../frontend/e2e/page-objects/admin/server-error.page";
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
 * The screenshots of video 09: slice 9.1, Staff sign-in and admin shell, in the running admin
 * app. Each screen is opened through its page object with the shared fixture, which answers every
 * /api request (the antiforgery token, Dana's staff session, 401 invalid_credentials, 403
 * not_staff, 401 for no session, 500 for a failure, 204 for sign-out) and fails the take on a
 * page error or a request off localhost, as in every spec; no backend and no database ran. What
 * each screen says is checked before it is saved. The test counts, the API tests' names and the
 * initial total are what the runners and the build printed, captured with `capture()`. Not a test
 * and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/09-slice-9-1-staff-sign-in-and-admin-shell`
 * runs it.
 */

test.use({ baseURL: ADMIN_URL });

const EMAIL = "dana@christianfitness.ca";
const PASSWORD = "abundantlife";

const name = (screen: string, size: Size, theme: Theme) =>
  `admin-${screen}-${size.toLowerCase()}-${theme}`;

function problem(status: number, code: string): ApiReply {
  return {
    status,
    headers: { "content-type": "application/problem+json" },
    json: { status, code },
  };
}

test("the Staff sign in screen, and signing in", async ({ page, api }) => {
  const signIn = new AdminStaffSignInPage(page);
  const shell = new AdminShell(page);
  api.on("GET", "/api/admin/session", () => problem(401, "unauthenticated"));
  const takes: [Size, Theme][] = [
    ["XL", "light"],
    ["M", "light"],
    ["XS", "light"],
    ["XL", "dark"],
  ];
  for (const [size, theme] of takes) {
    await frame(page, size, theme);
    await signIn.open();
    await expect(signIn.heading).toHaveText("Staff sign in");
    await signIn.fill(EMAIL, PASSWORD);
    await signIn.password.blur();
    await shot(page, name("sign-in", size, theme));
  }

  // Held until the shot of "Signing in…" is saved.
  let answer!: () => void;
  const answered = new Promise<void>((resolve) => (answer = resolve));
  const tokens: (string | undefined)[] = [];
  api.on("POST", "/api/admin/session", async (request) => {
    tokens.push(request.headers()["x-xsrf-token"]);
    await answered;
    api.on("GET", "/api/admin/session", () => ({ json: STAFF_SIGNED_IN }));
    return { json: STAFF_SIGNED_IN };
  });
  await frame(page, "XL", "light");
  await signIn.open();
  await signIn.fill(EMAIL, PASSWORD);
  await signIn.submit();
  await expect(signIn.submitButton).toHaveText("Signing in…");
  await expect(signIn.submitButton).toBeDisabled();
  await detail(signIn.card, "admin-sign-in-busy", 16);
  answer();
  await expect(shell.heading).toHaveText("Dashboard");
  await expect(shell.currentItem).toHaveText("Dashboard");
  await expect(shell.userName).toHaveText("Dana Reyes");
  expect(shell.location()).toBe("/");
  expect(tokens).toEqual([XSRF_TOKEN]);
  await shot(page, name("dashboard", "XL", "light"));
});

test("a member refused, and wrong credentials", async ({ page, api }) => {
  const signIn = new AdminStaffSignInPage(page);
  api.on("GET", "/api/admin/session", () => problem(401, "unauthenticated"));
  api.on("POST", "/api/admin/session", () => problem(403, "not_staff"));
  for (const size of ["XL", "XS"] as Size[]) {
    await frame(page, size, "light");
    await signIn.open();
    await signIn.fill("grace.thompson@gmail.com", PASSWORD);
    await signIn.submitAndAwaitAnswer();
    await expect(signIn.alertTitle).toHaveText("This account isn't on the team");
    await expect(signIn.alert).toBeFocused();
    await shot(page, name("sign-in-not-staff", size, "light"));
  }
  await frame(page, "XL", "light");
  await detail(signIn.alert, "admin-sign-in-not-staff", 12);

  api.on("POST", "/api/admin/session", () => problem(401, "invalid_credentials"));
  await signIn.open();
  await signIn.fill(EMAIL, "not-her-password");
  await signIn.submitAndAwaitAnswer();
  await expect(signIn.alertTitle).toHaveText("Email or password is incorrect");
  await expect(signIn.email).not.toHaveAttribute("aria-invalid");
  await expect(signIn.password).not.toHaveAttribute("aria-invalid");
  await detail(signIn.card, "admin-sign-in-invalid", 16);
});

test("the shell: four areas, the band and Sign out", async ({ page, api }) => {
  const shell = new AdminShell(page);
  const signIn = new AdminStaffSignInPage(page);
  await frame(page, "XL", "light");
  await shell.open();
  await expect(shell.currentItem).toHaveText("Dashboard");
  await shell.markDocument();
  await shell.navItem("Events").click();
  await expect(shell.heading).toHaveText("Events");
  await expect(shell.currentItem).toHaveText("Events");
  const inApp = await shell.documentIsMarked();
  expect(inApp).toBe(true);
  capture("navigate", { from: "/", to: shell.location(), reloaded: !inApp });
  await shot(page, name("events", "XL", "light"));
  await detail(shell.nav, "admin-nav", 0);

  await frame(page, "XL", "dark");
  await shell.open("/members");
  await expect(shell.currentItem).toHaveText("Members");
  await shot(page, name("members", "XL", "dark"));

  const boxes: Record<string, { width: number; height: number }> = {};
  for (const size of ["XS", "M"] as Size[]) {
    await frame(page, size, "light");
    await shell.open("/services");
    await expect(shell.currentItem).toHaveText("Services");
    expect(await shell.navIsOneRow()).toBe(true);
    expect(await shell.pageOverflowX()).toBe(0);
    boxes[size] = await shell.signOutBox();
    expect(boxes[size]!.height).toBeGreaterThanOrEqual(44);
    await shot(page, name("services", size, "light"));
    if (size === "XS") await detail(shell.sidebar, "admin-band", 0);
  }
  capture("signOutBox", boxes);

  const tokens: (string | undefined)[] = [];
  api.on("DELETE", "/api/admin/session", (request) => {
    tokens.push(request.headers()["x-xsrf-token"]);
    api.on("GET", "/api/admin/session", () => problem(401, "unauthenticated"));
    return { status: 204 };
  });
  await shell.signOut();
  await expect(signIn.heading).toHaveText("Staff sign in");
  expect(tokens).toEqual([XSRF_TOKEN]);
});

test("the guard, and a server failure", async ({ page, api }) => {
  const shell = new AdminShell(page);
  const signIn = new AdminStaffSignInPage(page);
  const serverError = new AdminServerErrorPage(page);
  await frame(page, "XL", "light");
  api.on("GET", "/api/admin/session", () => problem(401, "unauthenticated"));
  await shell.open("/events");
  await expect(signIn.heading).toHaveText("Staff sign in");
  capture("guard", { asked: "/events", landed: signIn.location() });

  api.on("GET", "/api/admin/session", () => ({
    status: 500,
    headers: { "content-type": "application/problem+json" },
    json: { status: 500, code: "server_error", reference: "CF-4BF92F35" },
  }));
  await shell.open("/events");
  await expect(serverError.heading).toHaveText("Something went wrong");
  await expect(serverError.action("Try again")).toHaveAttribute("href", "/events");
  await shot(page, name("server-error", "XL", "light"));
});

test("what the runners and the build say", () => {
  test.setTimeout(300_000);
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
  capture("specs", {
    command: "npx playwright test --list",
    tests: Number(specCount![1]),
  });

  const api = run(
    'dotnet test --logger "console;verbosity=normal"',
    path.join(root, "backend"),
  );
  const totals = [...api.matchAll(/Total tests: (\d+)\s+Passed: (\d+)/g)].map(
    (m) => Number(m[2]),
  );
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
  const access = names("StaffAccessTests");
  const signIn = names("StaffSignInTests");
  expect(access.length).toBeGreaterThan(0);
  expect(signIn.length).toBeGreaterThan(0);
  capture("backend", {
    command: "dotnet test",
    passed: totals.reduce((a, b) => a + b, 0),
    access,
    signIn,
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
