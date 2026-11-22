import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  expect,
  test,
  XSRF_TOKEN,
  type ApiReply,
} from "../../../frontend/e2e/fixtures/test";
import { WebHomePage } from "../../../frontend/e2e/page-objects/web/home.page";
import { WebMemberShell } from "../../../frontend/e2e/page-objects/web/member-shell.page";
import { WebSignInPage } from "../../../frontend/e2e/page-objects/web/sign-in.page";
import {
  capture,
  detail,
  frame,
  shot,
  type Size,
  type Theme,
} from "../../../tools/video-record/shots";

/**
 * The screenshots of video 07: slice 3.1, Sign in and sign out, in the running member app. Each
 * screen is opened through its page object with the shared fixture, which answers every /api
 * request (the antiforgery token, Grace's session, 401 invalid_credentials, 503, 204 or 401 for
 * the session) and fails the take on a page error or a request off localhost, as in every spec;
 * no backend and no database ran. What each screen says is checked before it is saved. The test
 * counts, the API tests' names and the initial total are what the runners and the build printed,
 * captured with `capture()`. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/07-slice-3-1-sign-in-and-sign-out` runs it.
 */

const EMAIL = "grace.thompson@gmail.com";
const PASSWORD = "abundantlife";
const SESSION = {
  memberId: "0190c0de-0000-7000-8000-000000000001",
  name: "Grace Thompson",
};

const name = (screen: string, size: Size, theme: Theme) =>
  `web-${screen}-${size.toLowerCase()}-${theme}`;

function problem(status: number, code: string): ApiReply {
  return {
    status,
    headers: { "content-type": "application/problem+json" },
    json: { status, code },
  };
}

test("the sign-in screen, and signing in", async ({ page, api }) => {
  const signIn = new WebSignInPage(page);
  const home = new WebHomePage(page);
  const takes: [Size, Theme][] = [
    ["XL", "light"],
    ["M", "light"],
    ["XS", "light"],
    ["XL", "dark"],
  ];
  for (const [size, theme] of takes) {
    await frame(page, size, theme);
    await signIn.open();
    await expect(signIn.heading).toHaveText("Welcome back");
    await signIn.fill(EMAIL, PASSWORD);
    await signIn.password.blur();
    await shot(page, name("sign-in", size, theme));
  }

  // Held until the shot of "Signing in…" is saved.
  let answer!: () => void;
  const answered = new Promise<void>((resolve) => (answer = resolve));
  const tokens: (string | undefined)[] = [];
  api.on("POST", "/api/session", async (request) => {
    tokens.push(request.headers()["x-xsrf-token"]);
    await answered;
    return { json: SESSION };
  });
  await frame(page, "XL", "light");
  await signIn.open();
  await signIn.fill(EMAIL, PASSWORD);
  await signIn.submit();
  await expect(signIn.submitButton).toHaveText("Signing in…");
  await expect(signIn.submitButton).toBeDisabled();
  await detail(signIn.form, "web-sign-in-busy", 16);
  answer();
  await expect(home.greeting).toHaveText("Welcome, Grace");
  expect(home.location()).toBe("/home");
  expect(tokens).toEqual([XSRF_TOKEN]);
  await shot(page, name("home", "XL", "light"));
});

test("wrong credentials and a failure", async ({ page, api }) => {
  const signIn = new WebSignInPage(page);
  api.on("POST", "/api/session", () => problem(401, "invalid_credentials"));
  for (const size of ["XL", "XS"] as Size[]) {
    await frame(page, size, "light");
    await signIn.open();
    await signIn.fill(EMAIL, "not-her-password");
    await signIn.submitAndAwaitAnswer();
    await expect(signIn.alertTitle).toHaveText("Email or password is incorrect");
    await expect(signIn.email).not.toHaveAttribute("aria-invalid");
    await expect(signIn.password).not.toHaveAttribute("aria-invalid");
    await shot(page, name("sign-in-invalid", size, "light"));
  }
  await frame(page, "XL", "light");
  await detail(signIn.form, "web-sign-in-invalid", 16);

  api.on("POST", "/api/session", () => problem(503, "server_error"));
  for (const size of ["XS", "XL"] as Size[]) {
    await frame(page, size, "light");
    await signIn.open();
    await signIn.fill(EMAIL, PASSWORD);
    await signIn.submitAndAwaitAnswer();
    await expect(signIn.alertTitle).toHaveText("We couldn't sign you in");
    await expect(signIn.email).toHaveValue(EMAIL);
    await shot(page, name("sign-in-failed", size, "light"));
  }
  await detail(signIn.alert, "web-sign-in-failed", 12);
});

test("the header's Sign out, and the guard", async ({ page, api }) => {
  const home = new WebHomePage(page);
  const shell = new WebMemberShell(page);
  const signIn = new WebSignInPage(page);
  const boxes: Record<string, { width: number; height: number }> = {};
  for (const size of ["XS", "XL"] as Size[]) {
    await frame(page, size, "light");
    await home.open();
    await expect(home.greeting).toHaveText("Welcome, Grace");
    boxes[size] = await shell.signOutBox();
    expect(boxes[size]!.height).toBeGreaterThanOrEqual(44);
    await shot(page, name("home", size, "light"));
    if (size === "XS") await detail(shell.header, "web-header", 0);
  }
  capture("signOutBox", boxes);

  const tokens: (string | undefined)[] = [];
  api.on("DELETE", "/api/session", (request) => {
    tokens.push(request.headers()["x-xsrf-token"]);
    api.on("GET", "/api/session", () => problem(401, "unauthenticated"));
    return { status: 204 };
  });
  await shell.signOut();
  await expect.poll(() => shell.location()).toBe("/");
  expect(tokens).toEqual([XSRF_TOKEN]);

  // The session is gone: Home now sends the visitor to sign in.
  await home.open();
  await expect(signIn.heading).toHaveText("Welcome back");
  capture("guard", { asked: "/home", landed: signIn.location() });
  await shot(page, name("guard", "XL", "light"));
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
  capture("unit", {
    command: "npm test",
    passed: Number(unitCount![1]),
    total: Number(unitCount![2]),
  });

  const specs = run("npx playwright test --list", path.join(root, "frontend"));
  const specCount = /Total: (\d+) tests? in (\d+) files?/.exec(specs);
  expect(specCount, specs).not.toBeNull();
  capture("specs", {
    command: "npx playwright test --list",
    tests: Number(specCount![1]),
    files: Number(specCount![2]),
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
  const signOut = names("SignOutTests");
  const antiforgery = names("AntiforgeryTests");
  const headers = names("SecurityHeadersTests");
  expect(signOut.length).toBeGreaterThan(0);
  expect(antiforgery.length).toBeGreaterThan(0);
  expect(headers.length).toBeGreaterThan(0);
  capture("backend", {
    command: "dotnet test",
    passed: totals.reduce((a, b) => a + b, 0),
    signOut,
    antiforgery,
    headers,
  });

  const build = run("npx ng build web", path.join(root, "frontend"));
  const initial = /Initial total\s*\|\s*([\d.]+) kB\s*\|\s*([\d.]+) kB/.exec(
    build,
  );
  expect(initial, build).not.toBeNull();
  capture("build", {
    command: "npx ng build web",
    raw: Number(initial![1]),
    transfer: Number(initial![2]),
  });
});
