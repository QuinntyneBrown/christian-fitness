import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  expect,
  SIGNED_IN,
  test,
  type ApiHandlers,
  type ApiReply,
} from "../../../frontend/e2e/fixtures/test";
import { WebHomePage } from "../../../frontend/e2e/page-objects/web/home.page";
import { WebJoinPage } from "../../../frontend/e2e/page-objects/web/join.page";
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
 * The screenshots of video 08: slice 3.2, Sign-in protections, in the running member app. Each
 * screen is opened through its page object with the shared fixture, which answers every /api
 * request (the antiforgery token, a visitor's 401 then Grace's session, 429 too_many_attempts,
 * 403 account_suspended, 429 rate_limited) and fails the take on a page error or a request off
 * localhost, as in every spec; no backend and no database ran. What each screen says, and where
 * the address bar lands, is checked before it is saved. The test counts, the API tests' names and
 * the initial total are what the runners and the build printed, captured with `capture()`. Not a
 * test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/08-slice-3-2-sign-in-protections` runs it.
 */

const EMAIL = "grace.thompson@gmail.com";
const PASSWORD = "abundantlife";
const SUSPENDED = "tsimmons22@gmail.com";

const name = (screen: string, size: Size, theme: Theme) =>
  `web-${screen}-${size.toLowerCase()}-${theme}`;

function problem(status: number, code: string): ApiReply {
  return {
    status,
    headers: { "content-type": "application/problem+json" },
    json: { status, code },
  };
}

/** A visitor: `GET /api/session` is 401 until sign-in succeeds, then answers Grace's session. */
function answerAsVisitor(api: ApiHandlers): void {
  api.on("GET", "/api/session", () => problem(401, "unauthenticated"));
  api.on("POST", "/api/session", () => {
    api.on("GET", "/api/session", () => ({ json: SIGNED_IN }));
    return { json: SIGNED_IN };
  });
}

test("sign-in paused after too many attempts", async ({ page, api }) => {
  const signIn = new WebSignInPage(page);
  api.on("POST", "/api/session", () => problem(429, "too_many_attempts"));
  const takes: [Size, Theme][] = [
    ["XL", "light"],
    ["M", "light"],
    ["XS", "light"],
    ["XL", "dark"],
  ];
  for (const [size, theme] of takes) {
    await frame(page, size, theme);
    await signIn.open();
    await signIn.fill(EMAIL, PASSWORD);
    await signIn.submitAndAwaitAnswer();
    await expect(signIn.alertTitle).toHaveText("Sign-in paused for 15 minutes");
    await expect(signIn.submitButton).toBeEnabled();
    await expect(signIn.email).not.toHaveAttribute("aria-invalid");
    await shot(page, name("sign-in-paused", size, theme));
  }
  await frame(page, "XL", "light");
  await signIn.open();
  await signIn.fill(EMAIL, PASSWORD);
  await signIn.submitAndAwaitAnswer();
  await expect(signIn.alertTitle).toHaveText("Sign-in paused for 15 minutes");
  await signIn.password.blur();
  await detail(signIn.form, "web-sign-in-paused", 16);
});

test("a suspended account", async ({ page, api }) => {
  const signIn = new WebSignInPage(page);
  api.on("POST", "/api/session", () => problem(403, "account_suspended"));
  for (const size of ["XS", "XL"] as Size[]) {
    await frame(page, size, "light");
    await signIn.open();
    await signIn.fill(SUSPENDED, PASSWORD);
    await signIn.submitAndAwaitAnswer();
    await expect(signIn.alertTitle).toHaveText("Your account is suspended");
    await expect(signIn.alertText).toHaveText(
      "Contact the Christian Fitness team to talk it through.",
    );
    await shot(page, name("sign-in-suspended", size, "light"));
  }
  await detail(signIn.alert, "web-sign-in-suspended", 12);
});

test("back to the route asked for, and a crafted link", async ({
  page,
  api,
}) => {
  const signIn = new WebSignInPage(page);
  const home = new WebHomePage(page);

  answerAsVisitor(api);
  await frame(page, "XL", "light");
  await home.open("?welcome=back");
  await expect(signIn.heading).toHaveText("Welcome back");
  const sentTo = signIn.location();
  expect(sentTo).toBe("/sign-in?returnUrl=%2Fhome%3Fwelcome%3Dback");
  await signIn.fill(EMAIL, PASSWORD);
  await signIn.password.blur();
  await shot(page, name("return-sign-in", "XL", "light"));
  await signIn.submit();
  await expect(home.greeting).toHaveText("Welcome, Grace");
  const landed = home.location();
  expect(landed).toBe("/home?welcome=back");
  await shot(page, name("return-home", "XL", "light"));
  capture("returned", { asked: "/home?welcome=back", sentTo, landed });

  const crafted = "https://evil.example/home";
  answerAsVisitor(api);
  await frame(page, "XS", "light");
  await signIn.open(crafted);
  await signIn.fill(EMAIL, PASSWORD);
  await signIn.password.blur();
  await shot(page, name("crafted-sign-in", "XS", "light"));
  await signIn.submit();
  await expect(home.greeting).toHaveText("Welcome, Grace");
  const craftedLanded = home.location();
  expect(craftedLanded).toBe("/home");
  await shot(page, name("crafted-home", "XS", "light"));
  capture("crafted", { returnUrl: crafted, landed: craftedLanded });
});

test("too many new profiles from one network", async ({ page, api }) => {
  const join = new WebJoinPage(page);
  api.on("POST", "/api/account/join", () => problem(429, "rate_limited"));
  for (const size of ["XL", "XS"] as Size[]) {
    await frame(page, size, "light");
    await join.open();
    await join.fill({
      fullName: "Grace Thompson",
      email: EMAIL,
      password: PASSWORD,
    });
    await join.submitAndAwaitAnswer();
    await expect(join.alertTitle).toHaveText("Too many new profiles");
    await expect(join.fullName).toHaveValue("Grace Thompson");
    await shot(page, name("join-limited", size, "light"));
  }
  await detail(join.alert, "web-join-limited", 12);
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
          new RegExp(
            `Passed ChristianFitness\\.\\w+\\.Tests\\.[\\w.]+\\.${cls}\\.(\\w+)`,
            "g",
          ),
        ),
      ].map((m) => m[1].replaceAll("_", " ")),
    ),
  ];
  const lockout = names("SignInLockoutTests");
  const suspended = names("SignInSuspendedTests");
  const joinLimit = names("JoinRateLimitTests");
  expect(lockout.length).toBeGreaterThan(0);
  expect(suspended.length).toBeGreaterThan(0);
  expect(joinLimit.length).toBeGreaterThan(0);
  capture("backend", {
    command: "dotnet test",
    passed: totals.reduce((a, b) => a + b, 0),
    lockout,
    suspended,
    joinLimit,
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
