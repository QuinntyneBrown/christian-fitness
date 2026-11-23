import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  expect,
  test,
  XSRF_TOKEN,
  type ApiReply,
} from "../../../frontend/e2e/fixtures/test";
import { WebForgotPasswordPage } from "../../../frontend/e2e/page-objects/web/forgot-password.page";
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
 * The screenshots of video 37: slice 20.1, Request a reset link, in the running member app. Each
 * screen is opened through its page object with the shared fixture, which answers every /api
 * request (the antiforgery token, 202 for a reset request, 400 validation_failed, 503) and fails
 * the take on a page error or a request off localhost, as in every spec; no backend and no
 * database ran. What each screen says is checked before it is saved. The test counts, the API
 * tests' names and the initial total are what the runners and the build printed, captured with
 * `capture()`. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/37-slice-20-1-request-a-reset-link` runs it.
 */

const EMAIL = "grace.thompson@gmail.com";

const name = (screen: string, size: Size, theme: Theme) =>
  `web-${screen}-${size.toLowerCase()}-${theme}`;

function problem(status: number, code: string): ApiReply {
  return {
    status,
    headers: { "content-type": "application/problem+json" },
    json: { status, code },
  };
}

test("the way in from sign in, and the form", async ({ page }) => {
  const signIn = new WebSignInPage(page);
  const forgot = new WebForgotPasswordPage(page);
  for (const size of ["XL", "XS"] as Size[]) {
    await frame(page, size, "light");
    await signIn.open();
    await expect(signIn.forgotLink).toHaveText("Forgot your password?");
    await shot(page, name("sign-in", size, "light"));
  }
  await frame(page, "XL", "light");
  await signIn.open();
  await signIn.forgotLink.hover();
  await detail(signIn.form.locator(".auth__fields"), "web-sign-in-forgot", 20);
  await signIn.forgotLink.click();
  await expect(forgot.heading).toHaveText("Reset your password");

  const takes: [Size, Theme][] = [
    ["XL", "light"],
    ["M", "light"],
    ["XS", "light"],
    ["XL", "dark"],
  ];
  for (const [size, theme] of takes) {
    await frame(page, size, theme);
    await forgot.open();
    await expect(forgot.heading).toHaveText("Reset your password");
    await forgot.fill(EMAIL);
    await forgot.email.blur();
    await shot(page, name("forgot", size, theme));
  }
});

test("sending, and check your email", async ({ page, api }) => {
  const forgot = new WebForgotPasswordPage(page);
  // Held until the shot of "Sending…" is saved.
  let answer!: () => void;
  const answered = new Promise<void>((resolve) => (answer = resolve));
  const sent: { body: unknown; token: string | undefined }[] = [];
  let hold = true;
  api.on("POST", "/api/account/password-reset", async (request) => {
    sent.push({ body: request.postDataJSON(), token: request.headers()["x-xsrf-token"] });
    if (hold) await answered;
    return { status: 202 };
  });
  await frame(page, "XL", "light");
  await forgot.open();
  await forgot.fill(EMAIL);
  await forgot.submit();
  await expect(forgot.submitButton).toHaveText("Sending…");
  await expect(forgot.submitButton).toBeDisabled();
  await detail(forgot.form, "web-forgot-busy", 16);
  answer();
  hold = false;
  await expect(forgot.heading).toHaveText("Check your email");
  await expect(forgot.leadEmail).toHaveText(EMAIL);
  expect(sent).toEqual([{ body: { email: EMAIL }, token: XSRF_TOKEN }]);
  await shot(page, name("sent", "XL", "light"));
  await detail(forgot.form, "web-sent", 16);

  for (const [size, theme] of [["XS", "light"], ["M", "light"], ["XL", "dark"]] as [Size, Theme][]) {
    await frame(page, size, theme);
    await forgot.open();
    await forgot.fill(EMAIL);
    await forgot.submit();
    await expect(forgot.heading).toHaveText("Check your email");
    await shot(page, name("sent", size, theme));
  }
  capture("sent", { body: sent[0]!.body, status: 202 });
});

test("a malformed email and a failure", async ({ page, api }) => {
  const forgot = new WebForgotPasswordPage(page);
  let requests = 0;
  api.on("POST", "/api/account/password-reset", () => {
    requests++;
    return problem(503, "server_error");
  });
  for (const size of ["XL", "XS"] as Size[]) {
    await frame(page, size, "light");
    await forgot.open();
    await forgot.fill("grace.thompson@gmail");
    await forgot.submit();
    await expect(forgot.alertTitle).toHaveText("Check your email address");
    await expect(forgot.email).toHaveAttribute("aria-invalid", "true");
    await shot(page, name("forgot-invalid", size, "light"));
  }
  await frame(page, "XL", "light");
  await detail(forgot.form, "web-forgot-invalid", 16);
  expect(requests).toBe(0);

  for (const size of ["XS", "XL"] as Size[]) {
    await frame(page, size, "light");
    await forgot.open();
    await forgot.fill(EMAIL);
    await forgot.awaitAnswer(() => forgot.submit());
    await expect(forgot.alertTitle).toHaveText("We couldn't send the email");
    await expect(forgot.email).toHaveValue(EMAIL);
    await shot(page, name("forgot-failed", size, "light"));
  }
  await detail(forgot.alert, "web-forgot-failed", 12);
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
  const request = names("PasswordResetRequestTests");
  const disclosure = names("PasswordResetDisclosureTests");
  const telemetry = names("PasswordResetTelemetryTests");
  expect(request.length).toBeGreaterThan(0);
  expect(disclosure.length).toBeGreaterThan(0);
  expect(telemetry.length).toBeGreaterThan(0);
  capture("backend", { command: "dotnet test", passed: totals.reduce((a, b) => a + b, 0), request, disclosure, telemetry });

  const build = run("npx ng build web", path.join(root, "frontend"));
  const initial = /Initial total\s*\|\s*([\d.]+) kB\s*\|\s*([\d.]+) kB/.exec(build);
  expect(initial, build).not.toBeNull();
  capture("build", { command: "npx ng build web", raw: Number(initial![1]), transfer: Number(initial![2]) });
});
