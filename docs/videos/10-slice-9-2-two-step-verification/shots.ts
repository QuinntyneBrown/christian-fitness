import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  expect,
  STAFF_SIGNED_IN,
  test,
  XSRF_TOKEN,
  type ApiHandlers,
  type ApiReply,
} from "../../../frontend/e2e/fixtures/test";
import { AdminShell } from "../../../frontend/e2e/page-objects/admin/admin-shell.page";
import { AdminStaffSignInPage } from "../../../frontend/e2e/page-objects/admin/staff-sign-in.page";
import { AdminTwoStepPage } from "../../../frontend/e2e/page-objects/admin/two-step.page";
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
 * The screenshots of video 10: slice 9.2, Two-step verification, in the running admin app. Each
 * screen is opened through its page object with the shared fixture, which answers every /api
 * request (the antiforgery token, 202 for the password step, Dana's staff session for the right
 * code, 401 invalid_code, 401 two_step_expired, 429 too_many_attempts, 403 two_step_not_set_up)
 * and fails the take on a page error or a request off localhost, as in every spec; no backend and
 * no database ran. What each screen says is checked before it is saved. The test counts, the API
 * tests' names and the initial total are what the runners and the build printed, captured with
 * `capture()`. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/10-slice-9-2-two-step-verification` runs it.
 */

test.use({ baseURL: ADMIN_URL });

const EMAIL = "dana@christianfitness.ca";
const PASSWORD = "abundantlife";
const CODE = "492 731";

const name = (screen: string, size: Size, theme: Theme) =>
  `admin-${screen}-${size.toLowerCase()}-${theme}`;

function problem(status: number, code: string): ApiReply {
  return {
    status,
    headers: { "content-type": "application/problem+json" },
    json: { status, code },
  };
}

/** No session yet; the password step answers 202 with no body, as the API does. */
function signedOut(api: ApiHandlers): void {
  api.on("GET", "/api/admin/session", () => problem(401, "unauthenticated"));
  api.on("POST", "/api/admin/session", () => ({ status: 202 }));
}

async function toCodeScreen(signIn: AdminStaffSignInPage, twoStep: AdminTwoStepPage) {
  await signIn.open();
  await signIn.fill(EMAIL, PASSWORD);
  await signIn.submitAndAwaitAnswer();
  await expect(twoStep.heading).toHaveText("Enter your code");
}

test("the code screen, and signing in with a code", async ({ page, api }) => {
  const signIn = new AdminStaffSignInPage(page);
  const twoStep = new AdminTwoStepPage(page);
  const shell = new AdminShell(page);
  signedOut(api);

  await frame(page, "XL", "light");
  await signIn.open();
  await expect(signIn.note).toHaveText("Two-step verification required");
  await detail(signIn.card, "admin-sign-in-note", 16);

  const takes: [Size, Theme][] = [
    ["XL", "light"],
    ["M", "light"],
    ["XS", "light"],
    ["XL", "dark"],
  ];
  for (const [size, theme] of takes) {
    await frame(page, size, theme);
    await toCodeScreen(signIn, twoStep);
    await expect(twoStep.code).toHaveAttribute("autocomplete", "one-time-code");
    await expect(twoStep.code).toHaveAttribute("inputmode", "numeric");
    await twoStep.fill(CODE);
    await twoStep.code.blur();
    await shot(page, name("two-step", size, theme));
  }

  // Held until the shot of "Verifying…" is saved.
  let answer!: () => void;
  const answered = new Promise<void>((resolve) => (answer = resolve));
  const sent: { code: unknown; token: string | undefined }[] = [];
  api.on("POST", "/api/admin/session/two-step", async (request) => {
    sent.push({
      code: (request.postDataJSON() as { code: unknown }).code,
      token: request.headers()["x-xsrf-token"],
    });
    await answered;
    api.on("GET", "/api/admin/session", () => ({ json: STAFF_SIGNED_IN }));
    return { json: STAFF_SIGNED_IN };
  });
  await frame(page, "XL", "light");
  await toCodeScreen(signIn, twoStep);
  await twoStep.fill(CODE);
  await twoStep.submit();
  await expect(twoStep.submitButton).toHaveText("Verifying…");
  await expect(twoStep.submitButton).toBeDisabled();
  await detail(twoStep.card, "admin-two-step-busy", 16);
  answer();
  await expect(shell.heading).toHaveText("Dashboard");
  await expect(shell.userName).toHaveText("Dana Reyes");
  expect(sent).toEqual([{ code: CODE, token: XSRF_TOKEN }]);
  capture("verify", { asked: "/sign-in/verify", landed: shell.location() });
  await shot(page, name("dashboard", "XL", "light"));
});

test("a wrong code, said under the field", async ({ page, api }) => {
  const signIn = new AdminStaffSignInPage(page);
  const twoStep = new AdminTwoStepPage(page);
  signedOut(api);
  api.on("POST", "/api/admin/session/two-step", () => problem(401, "invalid_code"));
  for (const size of ["XL", "XS"] as Size[]) {
    await frame(page, size, "light");
    await toCodeScreen(signIn, twoStep);
    await twoStep.fill("492 713");
    await twoStep.submitAndAwaitAnswer();
    await expect(twoStep.codeError).toHaveText(
      "That code doesn't match. Codes change every 30 seconds, so enter the newest one.",
    );
    await expect(twoStep.code).toHaveAttribute("aria-invalid", "true");
    await expect(twoStep.code).toHaveValue("492 713");
    await expect(twoStep.code).toBeFocused();
    await shot(page, name("two-step-invalid", size, "light"));
  }
  await frame(page, "XL", "light");
  await detail(twoStep.card, "admin-two-step-invalid", 16);
});

test("the endings: too many codes, and too late", async ({ page, api }) => {
  const signIn = new AdminStaffSignInPage(page);
  const twoStep = new AdminTwoStepPage(page);
  signedOut(api);
  const endings = [
    ["locked", 429, "too_many_attempts", "Too many codes tried"],
    ["expired", 401, "two_step_expired", "Sign in again"],
  ] as const;
  for (const [ending, status, code, title] of endings) {
    api.on("POST", "/api/admin/session/two-step", () => problem(status, code));
    for (const size of ending === "locked" ? (["XL", "XS"] as Size[]) : (["XL"] as Size[])) {
      await frame(page, size, "light");
      await toCodeScreen(signIn, twoStep);
      await twoStep.fill(CODE);
      await twoStep.submitAndAwaitAnswer();
      await expect(signIn.alertTitle).toHaveText(title);
      await expect(signIn.alert).toBeFocused();
      expect(signIn.location()).toBe("/sign-in");
      await shot(page, name(`sign-in-${ending}`, size, "light"));
      if (size === "XL") await detail(signIn.alert, `admin-sign-in-${ending}`, 12);
    }
  }
});

test("staff without two-step set up", async ({ page, api }) => {
  const signIn = new AdminStaffSignInPage(page);
  api.on("GET", "/api/admin/session", () => problem(401, "unauthenticated"));
  api.on("POST", "/api/admin/session", () => problem(403, "two_step_not_set_up"));
  await frame(page, "XL", "light");
  await signIn.open();
  await signIn.fill("lee.chen@christianfitness.ca", PASSWORD);
  await signIn.submitAndAwaitAnswer();
  await expect(signIn.alertTitle).toHaveText("Two-step verification isn't set up");
  await expect(signIn.alertText).toHaveText(
    "Ask an Admin to set it up for your account, then sign in again.",
  );
  await expect(signIn.alert).toBeFocused();
  expect(signIn.location()).toBe("/sign-in");
  await detail(signIn.card, "admin-sign-in-not-set-up", 16);
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
  const twoStep = names("TwoStepTests");
  const refusals = names("TwoStepRefusalTests");
  const totp = names("TotpTests");
  expect(twoStep.length).toBeGreaterThan(0);
  expect(refusals.length).toBeGreaterThan(0);
  expect(totp.length).toBeGreaterThan(0);
  capture("backend", {
    command: "dotnet test",
    passed: totals.reduce((a, b) => a + b, 0),
    twoStep,
    refusals,
    totp,
  });

  const build = run("npx ng build admin", path.join(root, "frontend"));
  const initial = /Initial total\s*\|\s*([\d.]+) kB\s*\|\s*([\d.]+) kB/.exec(build);
  expect(initial, build).not.toBeNull();
  const chunk = /two-step-page\s*\|\s*([\d.]+) kB/.exec(build);
  expect(chunk, build).not.toBeNull();
  capture("build", {
    command: "npx ng build admin",
    raw: Number(initial![1]),
    transfer: Number(initial![2]),
    codeScreen: Number(chunk![1]),
  });
});
